-- public.participant_data -> public.discord_users
--
-- * the member table is keyed by discord_id, with clean column names
-- * it now also holds the guild membership state (in_guild, server_nick, synced_at)
-- * public.participant_data stays as a view with the old column names for one release,
--   so code that is still deployed keeps working
-- * public.mahjong_data is dropped (unused), public.update_user_data is dropped (no callers)
--
-- Apply this before the code that reads discord_users is deployed.

BEGIN;

-- 1. Rename the table and its columns
ALTER TABLE public.participant_data RENAME TO discord_users;
ALTER TABLE public.discord_users RENAME COLUMN discord_username TO username;
ALTER TABLE public.discord_users RENAME COLUMN discord_nickname TO global_name;
ALTER TABLE public.discord_users RENAME COLUMN profile_img TO avatar_url;

ALTER TABLE public.discord_users
  ADD COLUMN server_nick text,
  ADD COLUMN in_guild boolean NOT NULL DEFAULT false,
  ADD COLUMN synced_at timestamptz;

-- 2. Key by discord_id. The unique constraint is replaced by a primary key; the foreign
--    keys that point at it are dropped and recreated unchanged around that swap.
DROP TABLE public.mahjong_data;

ALTER TABLE mahjong.participants DROP CONSTRAINT participants_discord_id_fkey;
ALTER TABLE public.member_key_redemptions DROP CONSTRAINT member_key_redemptions_discord_id_fkey;
ALTER TABLE public.member_profiles DROP CONSTRAINT member_profiles_discord_id_fkey;
ALTER TABLE smp.player_bindings DROP CONSTRAINT player_bindings_discord_id_fkey;

ALTER TABLE public.discord_users DROP CONSTRAINT participant_data_pkey;
ALTER TABLE public.discord_users DROP CONSTRAINT participant_data_discord_id_key;
ALTER TABLE public.discord_users DROP COLUMN id;
ALTER TABLE public.discord_users ADD CONSTRAINT discord_users_pkey PRIMARY KEY (discord_id);

ALTER TABLE mahjong.participants ADD CONSTRAINT participants_discord_id_fkey
  FOREIGN KEY (discord_id) REFERENCES public.discord_users(discord_id) ON UPDATE CASCADE;
ALTER TABLE public.member_key_redemptions ADD CONSTRAINT member_key_redemptions_discord_id_fkey
  FOREIGN KEY (discord_id) REFERENCES public.discord_users(discord_id) ON DELETE CASCADE;
ALTER TABLE public.member_profiles ADD CONSTRAINT member_profiles_discord_id_fkey
  FOREIGN KEY (discord_id) REFERENCES public.discord_users(discord_id) ON DELETE CASCADE;
ALTER TABLE smp.player_bindings ADD CONSTRAINT player_bindings_discord_id_fkey
  FOREIGN KEY (discord_id) REFERENCES public.discord_users(discord_id) ON DELETE CASCADE;

COMMENT ON TABLE public.discord_users IS 'Discord members known to the site: one row per Discord ID';
COMMENT ON COLUMN public.discord_users.username IS 'Discord handle';
COMMENT ON COLUMN public.discord_users.global_name IS 'Discord display name';
COMMENT ON COLUMN public.discord_users.server_nick IS 'Nickname in the ForestWork server';
COMMENT ON COLUMN public.discord_users.avatar_url IS 'Discord avatar URL';
COMMENT ON COLUMN public.discord_users.in_guild IS 'Set by the member sync: true while the user is in the server';
COMMENT ON COLUMN public.discord_users.synced_at IS 'Last time the member sync saw this user in the server';

-- Row level security stays on; only service_role has privileges
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.discord_users FROM anon, authenticated;
GRANT ALL ON TABLE public.discord_users TO service_role;

-- 3. Compatibility view with the old name and old column names
CREATE VIEW public.participant_data WITH (security_invoker = on) AS
SELECT
  discord_id,
  username AS discord_username,
  global_name AS discord_nickname,
  avatar_url AS profile_img,
  created_at,
  joined_at
FROM public.discord_users;

REVOKE ALL ON TABLE public.participant_data FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.participant_data TO service_role;

-- 4. Boost summary reads from discord_users
CREATE OR REPLACE VIEW public.v_member_boost_summary WITH (security_invoker = on) AS
 SELECT p.discord_id,
    COALESCE(p.server_nick, p.global_name, p.username, ('Member_'::text || "right"((p.discord_id)::text, 4))) AS username,
    mp.level,
    mp.xp,
    mp.is_currently_boosting,
    mp.premium_since,
        CASE
            WHEN ((mp.is_currently_boosting = true) AND (mp.premium_since IS NOT NULL)) THEN GREATEST(1, (EXTRACT(month FROM age(now(), mp.premium_since)))::integer)
            ELSE 0
        END AS current_streak_months,
    mp.historical_boost_months,
    (mp.historical_boost_months +
        CASE
            WHEN ((mp.is_currently_boosting = true) AND (mp.premium_since IS NOT NULL)) THEN GREATEST(1, (EXTRACT(month FROM age(now(), mp.premium_since)))::integer)
            ELSE 0
        END) AS total_boost_months,
    mp.metadata,
    mp.updated_at
   FROM (public.member_profiles mp
     JOIN public.discord_users p ON ((p.discord_id = mp.discord_id)));

REVOKE ALL ON TABLE public.v_member_boost_summary FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.v_member_boost_summary TO service_role;

-- 5. Boost sync writes the new columns (behaviour unchanged)
CREATE OR REPLACE FUNCTION public.sync_member_boost_status(p_discord_id bigint, p_username text, p_premium_since timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_old_premium_since TIMESTAMPTZ;
    v_old_is_boosting BOOLEAN;
    v_closed_streak_months INT := 0;
BEGIN
    -- Make sure the member has a row in discord_users
    INSERT INTO public.discord_users (discord_id, username, global_name)
    VALUES (p_discord_id, LOWER(p_username), p_username)
    ON CONFLICT (discord_id) DO UPDATE SET
        username = EXCLUDED.username;

    -- 查询旧状态
    SELECT is_currently_boosting, premium_since
    INTO v_old_is_boosting, v_old_premium_since
    FROM public.member_profiles
    WHERE discord_id = p_discord_id;

    -- 场景 A：原来在 Boost，现在取消了 (断连结算)
    IF v_old_is_boosting = TRUE AND p_premium_since IS NULL THEN
        v_closed_streak_months := GREATEST(1, EXTRACT(MONTH FROM AGE(NOW(), v_old_premium_since))::INT);

        UPDATE public.member_profiles
        SET is_currently_boosting = FALSE,
            premium_since = NULL,
            historical_boost_months = historical_boost_months + v_closed_streak_months,
            updated_at = NOW()
        WHERE discord_id = p_discord_id;

    -- 场景 B：重新开通或新开通 Boost
    ELSIF (v_old_is_boosting IS NULL OR v_old_is_boosting = FALSE) AND p_premium_since IS NOT NULL THEN
        INSERT INTO public.member_profiles (discord_id, is_currently_boosting, premium_since, updated_at)
        VALUES (p_discord_id, TRUE, p_premium_since, NOW())
        ON CONFLICT (discord_id) DO UPDATE SET
            is_currently_boosting = TRUE,
            premium_since = p_premium_since,
            updated_at = NOW();

    -- 场景 C：初始化基础 Profile 记录 (非 Booster)
    ELSE
        INSERT INTO public.member_profiles (discord_id, updated_at)
        VALUES (p_discord_id, NOW())
        ON CONFLICT (discord_id) DO NOTHING;
    END IF;
END;
$function$;

-- 6. Remove what nothing uses (public.mahjong_data is dropped in step 2)
DROP FUNCTION public.update_user_data(text, text, text);
DROP FUNCTION public.update_user_data(bigint, text, text);

COMMIT;
