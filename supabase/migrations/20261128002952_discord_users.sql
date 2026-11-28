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

-- 5b. Mahjong stats functions read discord_users (bodies otherwise unchanged)
CREATE OR REPLACE FUNCTION mahjong.get_tournament_match_stats(t_id uuid, p_phase text DEFAULT NULL::text)
 RETURNS TABLE(player_id integer, nickname text, avatar text, play_count integer, avg_rank numeric, east_count integer, avg_rank_east numeric, south_count integer, avg_rank_south numeric, west_count integer, avg_rank_west numeric, north_count integer, avg_rank_north numeric, rank_1_count integer, top_rate_pct numeric, rank_2_count integer, top2_rate_pct numeric, rank_3_count integer, avoid_last_rate_pct numeric, rank_4_count integer, busting_rate numeric, avg_score numeric, highest_point numeric, lowest_point numeric)
 LANGUAGE sql
 SET search_path TO 'mahjong', 'public'
AS $function$
WITH unpivoted_matches AS (
  SELECT
    m.id AS match_id,
    v.player_id,
    v.score,
    v.seat_name,
    RANK() OVER (PARTITION BY m.id ORDER BY v.score DESC) as rank
  FROM mahjong.matches m
  CROSS JOIN LATERAL (
    VALUES
      ('East', m.east_id, m.east_score),
      ('South', m.south_id, m.south_score),
      ('West', m.west_id, m.west_score),
      ('North', m.north_id, m.north_score)
  ) AS v(seat_name, player_id, score)
  WHERE m.tournament_bind_id = t_id
    AND (p_phase IS NULL OR m.group_tag = p_phase)
    AND v.player_id IS NOT NULL -- 过滤掉三麻的空北风位
    AND v.player_id != 1
)
SELECT
  u.player_id,
  p.nickname,
  pd.avatar_url AS avatar,
  COUNT(score) AS play_count,
  ROUND(AVG(u.rank)::numeric, 2) AS avg_rank,
  COUNT(CASE WHEN u.seat_name = 'East' THEN 1 END) AS east_count,
  ROUND(AVG(CASE WHEN u.seat_name = 'East' THEN u.rank END)::numeric, 2) AS avg_rank_east,
  COUNT(CASE WHEN u.seat_name = 'South' THEN 1 END) AS south_count,
  ROUND(AVG(CASE WHEN u.seat_name = 'South' THEN u.rank END)::numeric, 2) AS avg_rank_south,
  COUNT(CASE WHEN u.seat_name = 'West' THEN 1 END) AS west_count,
  ROUND(AVG(CASE WHEN u.seat_name = 'West' THEN u.rank END)::numeric, 2) AS avg_rank_west,
  COUNT(CASE WHEN u.seat_name = 'North' THEN 1 END) AS north_count,
  ROUND(AVG(CASE WHEN u.seat_name = 'North' THEN u.rank END)::numeric, 2) AS avg_rank_north,
  COUNT(CASE WHEN rank = 1 THEN 1 END) AS rank_1_count,
  ROUND(COUNT(CASE WHEN u.rank = 1 THEN 1 END) * 100.0 / COUNT(u.score), 2) AS top_rate_pct,
  COUNT(CASE WHEN rank = 2 THEN 1 END) AS rank_2_count,
  ROUND(COUNT(CASE WHEN u.rank IN (1, 2) THEN 1 END) * 100.0 / COUNT(u.score), 2) AS top2_rate_pct,
  COUNT(CASE WHEN rank = 3 THEN 1 END) AS rank_3_count,
  ROUND(COUNT(CASE WHEN u.rank != 4 THEN 1 END) * 100.0 / COUNT(u.score), 2) AS avoid_last_rate_pct,
  COUNT(CASE WHEN rank = 4 THEN 1 END) AS rank_4_count,
  ROUND(COUNT(CASE WHEN u.score < 0 THEN 1 END) * 100.0 / COUNT(u.score), 2) AS busting_rate_pct,
  ROUND((AVG(u.score)::numeric - 35000)/1000, 1) AS avg_score,
  ROUND(MAX((score::numeric - 35000)/1000), 1) AS highest_point,
  ROUND(MIN((score::numeric - 35000)/1000), 1) AS lowest_point
FROM unpivoted_matches u
JOIN mahjong.participants p ON u.player_id = p.account_id
LEFT JOIN public.discord_users pd ON p.discord_id = pd.discord_id
GROUP BY u.player_id, p.nickname, pd.avatar_url
ORDER BY avg_rank ASC;
$function$
;
CREATE OR REPLACE FUNCTION mahjong.get_tournament_playstyle_stats(t_id uuid, p_phase text DEFAULT NULL::text)
 RETURNS TABLE(player_id integer, nickname text, avatar text, total_rounds bigint, win_rate numeric, deal_in_rate numeric, tsumo_rate numeric, dama_rate numeric, exhaustive_draw_rate numeric, draw_tenpai_rate numeric, call_rate numeric, riichi_rate numeric, avg_turns numeric, avg_win_score numeric, avg_deal_in_score numeric, avg_baopai numeric, li_baopai_rate_pct numeric, babei_rate_pct numeric)
 LANGUAGE sql
 SET search_path TO 'mahjong', 'public'
AS $function$
WITH player_rounds AS (
    SELECT
      m.id AS match_id,
      pr.id AS round_id,
      v.seat_index,
      v.player_id,
      pr.won_seat,
      pr.ron_seat,
      pr.won_type,
      pr.win_turn,
      (pr.delta_scores ->> v.seat_index)::numeric AS delta_score,
      (pr.riichi_status ->> v.seat_index)::int AS is_riichi,
      (pr.fulo_status ->> v.seat_index)::int AS is_fulo,
      (pr.draw_tenpai ->> v.seat_index)::int AS is_tenpai,
      COALESCE((pr.won_yaku ->> '31')::int, 0) AS count_dora,
      COALESCE((pr.won_yaku ->> '32')::int, 0) AS count_akadora,
      COALESCE((pr.won_yaku ->> '33')::int, 0) AS count_uradora,
      COALESCE((pr.won_yaku ->> '34')::int, 0) AS count_kitadora,
      COALESCE((pr.babei_status ->> v.seat_index)::int, 0) AS babei_count
    FROM mahjong.matches m
    JOIN mahjong.paipu_rounds pr ON m.uuid = pr.paipu_id
    CROSS JOIN LATERAL (
      VALUES
        (0, m.east_id),
        (1, m.south_id),
        (2, m.west_id),
        (3, m.north_id)
    ) AS v(seat_index, player_id)
    WHERE m.tournament_bind_id = t_id
      AND (p_phase IS NULL OR m.group_tag = p_phase)
      AND v.player_id IS NOT NULL
      AND v.player_id != 1
  )
  SELECT
    u.player_id,
    p.nickname,
    pd.avatar_url AS avatar,
    COUNT(u.round_id) AS total_rounds,
    ROUND(COUNT(CASE WHEN u.won_seat = u.seat_index THEN 1 END) * 100.0 / COUNT(u.round_id), 2) AS win_rate,
    ROUND(COUNT(CASE WHEN u.ron_seat = u.seat_index THEN 1 END) * 100.0 / COUNT(u.round_id), 2) AS deal_in_rate,
    ROUND(COUNT(CASE WHEN u.won_seat = u.seat_index AND u.won_type = 'zimo' THEN 1 END) * 100.0 /
          NULLIF(COUNT(CASE WHEN u.won_seat = u.seat_index THEN 1 END), 0), 2) AS tsumo_rate,
    ROUND(COUNT(CASE WHEN u.won_seat = u.seat_index AND u.is_riichi = 0 AND u.is_fulo = 0 THEN 1 END) * 100.0 /
          NULLIF(COUNT(CASE WHEN u.won_seat = u.seat_index THEN 1 END), 0), 2) AS dama_rate,
    ROUND(COUNT(CASE WHEN u.won_type = 'draw' THEN 1 END) * 100.0 / COUNT(u.round_id), 2) AS exhaustive_draw_rate,
    ROUND(COUNT(CASE WHEN u.won_type = 'draw' AND u.is_tenpai = 1 THEN 1 END) * 100.0 /
          NULLIF(COUNT(CASE WHEN u.won_type = 'draw' THEN 1 END), 0), 2) AS draw_tenpai_rate,
    ROUND(COUNT(CASE WHEN u.is_fulo = 1 THEN 1 END) * 100.0 / COUNT(u.round_id), 2) AS call_rate,
    ROUND(COUNT(CASE WHEN u.is_riichi = 1 THEN 1 END) * 100.0 / COUNT(u.round_id), 2) AS riichi_rate,
    ROUND(AVG(CASE WHEN u.won_seat = u.seat_index THEN u.win_turn END)::numeric, 2) AS avg_turns,
    ROUND(AVG(CASE WHEN u.won_seat = u.seat_index THEN u.delta_score END)::numeric, 0) AS avg_win_score,
    ROUND(AVG(CASE WHEN u.ron_seat = u.seat_index THEN ABS(u.delta_score) END)::numeric, 0) AS avg_deal_in_score,
    ROUND(AVG(CASE WHEN u.won_seat = u.seat_index
                   THEN u.count_dora + u.count_akadora + u.count_uradora + u.count_kitadora
              END)::numeric, 2) AS avg_baopai,
    ROUND(COUNT(CASE WHEN u.won_seat = u.seat_index AND u.is_riichi = 1 AND u.count_uradora > 0 THEN 1 END) * 100.0 /
          NULLIF(COUNT(CASE WHEN u.won_seat = u.seat_index AND u.is_riichi = 1 THEN 1 END), 0), 2) AS li_baopai_rate_pct,
    ROUND(COUNT(CASE WHEN u.babei_count > 0 THEN 1 END) * 100.0 / COUNT(u.round_id), 2) AS babei_rate_pct
  FROM player_rounds u
  JOIN mahjong.participants p ON u.player_id = p.account_id
  LEFT JOIN public.discord_users pd ON p.discord_id = pd.discord_id
  GROUP BY u.player_id, p.nickname, pd.avatar_url
  ORDER BY total_rounds DESC;
$function$
;
-- 6. Remove what nothing uses (public.mahjong_data is dropped in step 2)
DROP FUNCTION public.update_user_data(text, text, text);
DROP FUNCTION public.update_user_data(bigint, text, text);

COMMIT;
