# 林間小鎮 · ForestWork

The website of the ForestWork community: tournament pages and player stats for Mahjong Soul (雀魂) and Plazma Burst 2, Gartic Phone (林間靈魂繪師) replays, the Minecraft SMP, a CTF, community tools, and the brand centre. The ForestWork Discord bot is served from the same app.

Live site: <https://forestwork.vercel.app>

## Tech stack

| Part | What |
|---|---|
| Framework | [Nuxt 4](https://nuxt.com) with [Nuxt UI v4](https://ui.nuxt.com) and Tailwind CSS |
| Charts | ECharts (`vue-echarts`) |
| Database | Supabase (Postgres). Schemas: `public`, `mahjong`, `plazmaburst`, `trpg`, `ctf` |
| Hosting | Vercel: serverless functions, Blob storage, a daily cron, Analytics and Speed Insights |
| Discord bot | HTTP interactions endpoint in `server/api/discord/`, commands in `server/discord/` |

## Folder map

```text
app/
  pages/        site pages: games/{mahjongsoul,plazmaburst,garticphone,minecraftsmp,ctf}, activities/, tools/, brand/
  components/   page parts, grouped by game (mahjong/, pb2/, …) and base/ for shared ones
  composables/  shared logic
  utils/        auto-imported helpers and constants (e.g. links.ts)
  types/        generated Supabase types (pnpm update:database)
server/
  api/          API routes: auth, mahjong, plazmaburst, ctf, giveaway, activities, cron, discord
  discord/      bot commands and helpers
  routes/       non-/api server routes
public/
  brand/        logos and wordmarks (see /brand on the site)
  data/         Gartic Phone sessions (index.json + one file per round)
scripts/        one-off and maintenance scripts (see below)
```

## Running it locally

Needs Node.js and pnpm (the version is pinned in `package.json` under `packageManager`).

```bash
pnpm install
```

Create a `.env` file in the repo root. **Never commit it.** The app and the scripts read these variables:

| Variable | Used for |
|---|---|
| `SUPABASE_URL`, `SUPABASE_KEY` | Supabase client (`@nuxtjs/supabase`) |
| `SUPABASE_ANON_KEY` | fallback key for `gartic:sync` and `mahjong:recalculate` |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side writes (keep it out of anything sent to the browser) |
| `SESSION_SECRET` | signs the login session cookie |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` | Discord login |
| `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_OWNER_ID` | Discord bot |
| `CURSE_TRACK_CHANNEL_ID` | channel the curse counter syncs from |
| `CRON_SECRET` | the cron route refuses calls without it |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `BASE_URL` | site that `url:redirects` checks (default: the live site) |

Then:

```bash
pnpm dev
```

The site runs on <http://localhost:3000>. Vercel-only parts (`/_vercel/…` analytics scripts, the cron) don't run locally.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm preview` | Nuxt dev server, production build, preview of the build |
| `pnpm lint` / `pnpm typecheck` | ESLint, `nuxt typecheck` |
| `pnpm update:database` | regenerates `app/types/database.types.ts` from Supabase |
| `pnpm discord:register-commands` | registers the bot's slash commands with Discord |
| `pnpm gartic:split` / `pnpm gartic:sync` | splits a Gartic Phone album into session files / syncs the manifest |
| `pnpm ctf:hash` | hashes a CTF flag for storage |
| `pnpm mahjong:recalculate` | recalculates the Mahjong MR values in Supabase |
| `pnpm url:redirects` | checks that the old URLs still redirect correctly |

Scripts that take `--env-file=.env` talk to the real services. Run them only when you mean to.

## Branches and releases

- `main` is production, and `staging` is the staging deployment.
- Each change goes on its own branch (`fix/…`, `feat/…`) from `staging`. It reaches `staging` through a pull request, merged with a merge commit.
- A release is a pull request from `staging` into `main`, followed by a SemVer tag (`vMAJOR.MINOR.PATCH`).
- Pull requests follow the template: What? / Why? / How? / Testing? / Screenshots (optional) / Anything Else?

## Licence

All rights reserved. See [LICENSE](LICENSE).
