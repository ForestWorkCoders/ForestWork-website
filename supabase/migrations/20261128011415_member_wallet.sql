-- #354: member wallet columns on member_profiles; fix member_key_redemptions.
-- Storage only. What earns each coin is decided by the XP study (#359).

BEGIN;

ALTER TABLE public.member_profiles
  ADD COLUMN server_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN reputation   integer NOT NULL DEFAULT 0,
  ADD COLUMN twitch_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN forest_coins integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.member_profiles.server_coins IS '鹰国币 server coins. What earns them is decided by the XP study (#359).';
COMMENT ON COLUMN public.member_profiles.reputation   IS 'Reputation points. What earns them is decided by the XP study (#359).';
COMMENT ON COLUMN public.member_profiles.twitch_coins IS 'Twitch coins. What earns them is decided by the XP study (#359).';
COMMENT ON COLUMN public.member_profiles.forest_coins IS 'Forest coins. What earns them is decided by the XP study (#359).';

-- Rows are entered by hand, so every date must be given explicitly:
-- no defaults, otherwise a forgotten date silently becomes "now".
ALTER TABLE public.member_key_redemptions RENAME COLUMN revealed_at TO redeemed_at;
ALTER TABLE public.member_key_redemptions ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE public.member_key_redemptions ALTER COLUMN sent_at DROP DEFAULT;

COMMENT ON TABLE  public.member_key_redemptions             IS 'Archive of Steam keys given to members; rows are added by hand after redemption';
COMMENT ON COLUMN public.member_key_redemptions.created_at  IS 'When EaglePB2 received the key';
COMMENT ON COLUMN public.member_key_redemptions.sent_at     IS 'When the member won the key';
COMMENT ON COLUMN public.member_key_redemptions.redeemed_at IS 'When the member sent proof of redemption (entered by hand)';

ALTER TABLE public.member_key_redemptions ADD COLUMN steam_app_id integer CHECK (steam_app_id > 0);
COMMENT ON COLUMN public.member_key_redemptions.steam_app_id IS 'Steam store app ID (optional). The site builds the capsule image and store link from it; game_name stays the typed display name.';

COMMIT;
