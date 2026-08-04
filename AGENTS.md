<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This repo is a single Next.js 16 (App Router, React 19, Turbopack) PWA called Bible4Korea (`한민족 원어 성경`). Package manager is npm (`package-lock.json`). The startup update script already runs `npm install`.

- Dev server: `npm run dev` (Turbopack) serves UI + API routes on port 3000. Lint: `npm run lint` (only pre-existing warnings live in `public/vendor/firework-simulator/`; there are no errors). Build: `npm run build`. There is no automated test suite/framework configured.
- Core Bible reading, search, and Strong's lookup work with no configuration: the SQLite DBs (`data/bible-search.sqlite`, `data/strongs-hebrew-ko.sqlite`) and the full RNKSV Korean text (`data/rnksv/*.json`) are committed. Useful routes: `/read/[book]/[chapter]` (e.g. `/read/genesis/1`) and APIs `/api/bible/[book]/[chapter]`, `/api/search?q=`, `/api/strongs/[code]`.
- Supabase is optional and only needed for auth/sync/social/admin features. When `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are absent, the app degrades gracefully (`isSupabaseConfigured()` returns false) and runs in local-only mode — so do NOT add placeholder Supabase URLs to `.env.local`, as invalid values make it attempt (and fail) real connections. To enable those features, set the vars from `.env.example` in `.env.local` and apply the 23 migrations per `supabase/README.md`.
- `npm run build` runs `scripts/vercel-prepare.mjs` first, which downloads optional Greek NT data (MorphGNT → `data/morphgnt/`, `data/greek-lemma-strongs.json`, both gitignored) from GitHub and rebuilds search indexes if missing. This needs network access. The update script intentionally does NOT run this; `npm install` is enough for dev + core reading. Run `npm run build` or `npm run db:setup-morphgnt` if you specifically need Greek morphology data.
