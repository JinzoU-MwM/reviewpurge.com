# ReviewPurge

Affiliate product discovery website for Indonesia and global tools, built with Next.js App Router.

## Stack

- Next.js 16 + TypeScript
- Tailwind CSS
- Supabase (auth/storage-ready)
- PostgreSQL + Drizzle ORM

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Setup environment variables:

```bash
cp .env.example .env.local
```

3. Run development server:

```bash
pnpm dev
```

4. Open `http://localhost:3000`.

## Database

Generate schema migration:

```bash
pnpm db:generate
```

Push schema directly:

```bash
pnpm db:push
```

## Routes

- `/` homepage
- `/indonesia` Indonesia discovery section
- `/global` global tools section
- `/blog` SEO article hub
- `/admin` admin placeholder
- `/go/[slug]` affiliate redirect endpoint
- `/about`, `/contact`, `/privacy-policy`, `/terms-of-service`, `/affiliate-disclosure`
