# AI Agent Handoff

This file is a working handoff for any AI agent continuing development in this repo.

## Project Snapshot

- Project: `reviewpurge.com`
- Stack: Next.js App Router + TypeScript + Tailwind + Supabase + Drizzle + Postgres
- Main branch: `main`
- Current focus area: admin security observability + webhook alerting hardening

## Implemented So Far

- RBAC and admin user management (`owner` / `editor`) with DB-backed roles.
- Admin action hardening:
  - permission checks
  - distributed-capable rate limiting (Upstash fallback to in-memory)
  - denied/limited actions logged in `activity_logs`
- Affiliate security:
  - allowlist host enforcement
  - multi-program support with primary resolution
  - DB constraints for uniqueness and single primary per product
- Editorial pipeline:
  - scheduling + cron publish endpoint
  - SEO metadata + structured data + related posts
- Security alert cron endpoint:
  - route: `/api/cron/security-alerts`
  - auth with `CRON_SECRET` (+ optional IP allowlist)
  - threshold evaluation
  - dry-run mode (`?dry_run=1` or `x-dry-run: 1`)
  - cooldown + dedup for skipped logs
  - retry + exponential backoff delivery
  - HMAC signature headers for webhook
  - severity routing (`warn` / `critical`) with per-severity URLs
  - consecutive critical control (`SECURITY_ALERT_CRITICAL_CONSECUTIVE_MIN`)
- Admin logs analytics:
  - searchable/filterable/paginated audit log
  - delivery metrics cards (sent/failed/skipped)
  - security trend + delivery trend
  - latency percentiles (p50/p95/p99 for 24h and 7d)
  - advanced filters (`minAttemptCount`, `minWebhookLatencyMs`, `webhookStatusCode`)
  - warning banners:
    - denied/rate-limited/blocked threshold
    - failure-rate threshold
    - p95 warn + p99 critical latency

## DB Migrations Added

Apply these on target DB if not yet applied:

- `drizzle/0004_small_the_enforcers.sql`
- `drizzle/0005_next_rocket_raccoon.sql`
- `drizzle/0006_great_nova.sql`
- `drizzle/0007_bouncy_human_cannonball.sql`
- `drizzle/0008_dashing_king_bedlam.sql`

## Important Env Variables

- Core:
  - `DATABASE_URL`
  - `CRON_SECRET`
- Webhook destination:
  - `SECURITY_ALERT_WEBHOOK_URL`
  - `SECURITY_ALERT_WEBHOOK_URL_WARN`
  - `SECURITY_ALERT_WEBHOOK_URL_CRITICAL`
- Webhook auth/signing:
  - `SECURITY_ALERT_WEBHOOK_TOKEN`
  - `SECURITY_ALERT_WEBHOOK_SIGNING_SECRET`
- Webhook delivery behavior:
  - `SECURITY_ALERT_WEBHOOK_MAX_ATTEMPTS`
  - `SECURITY_ALERT_WEBHOOK_BACKOFF_MS`
  - `SECURITY_ALERT_WEBHOOK_TIMEOUT_MS`
  - `SECURITY_ALERT_COOLDOWN_MS`
  - `SECURITY_ALERT_SKIP_LOG_WINDOW_MS`
  - `SECURITY_ALERT_CRITICAL_CONSECUTIVE_MIN`
- Alert thresholds:
  - `LOG_ALERT_DENIED_24H_THRESHOLD`
  - `LOG_ALERT_RATE_LIMITED_24H_THRESHOLD`
  - `LOG_ALERT_BLOCKED_URL_24H_THRESHOLD`
  - `LOG_ALERT_WEBHOOK_FAILURE_RATE_24H_THRESHOLD`
  - `LOG_ALERT_WEBHOOK_FAILURE_RATE_MIN_ATTEMPTS_24H`
  - `LOG_ALERT_WEBHOOK_P95_24H_THRESHOLD_MS`
  - `LOG_ALERT_WEBHOOK_P95_MIN_ATTEMPTS_24H`
  - `LOG_ALERT_WEBHOOK_P99_24H_THRESHOLD_MS`
  - `LOG_ALERT_WEBHOOK_P99_MIN_ATTEMPTS_24H`

## Verification Commands

Run after any changes:

```bash
pnpm test
pnpm lint
pnpm build
```

## Suggested Next Work

1. Add sustained breach logic over multiple windows (not only consecutive sends).
2. Add severity-specific cooldown (`warn` vs `critical`).
3. Add e2e tests for admin logs warning banners and advanced filters.
4. Add CSV export for filtered logs.
5. Add dead-letter / escalation handling for repeated webhook delivery failures.
