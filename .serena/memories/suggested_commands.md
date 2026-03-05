Windows/PowerShell commands for this project:

- Install deps: `pnpm install`
- Run dev server: `pnpm dev`
- Production build: `pnpm build`
- Start production server locally: `pnpm start`
- Lint: `pnpm lint`
- Generate Drizzle migration: `pnpm db:generate`
- Push schema to DB: `pnpm db:push`

Useful shell commands (PowerShell):
- List files: `Get-ChildItem -Force`
- Read file: `Get-Content -Raw <path>`
- Search text (preferred): `rg <pattern>`
- List tracked files quickly: `rg --files`

Environment setup:
- Copy env template: `Copy-Item .env.example .env.local`
- Fill `DATABASE_URL` and Supabase env vars in `.env.local`.