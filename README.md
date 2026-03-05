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

Seed initial data:

```bash
pnpm db:seed
```

## Routes

- `/` homepage
- `/indonesia` Indonesia discovery section
- `/global` global tools section
- `/blog` SEO article hub
- `/blog/[slug]` article detail page
- `/admin` admin placeholder
- `/admin/articles` article management
- `/admin/users` owner-only admin user management
- `/admin/logs` activity/audit logs
- `/go/[slug]` affiliate redirect endpoint
- `/api/cron/publish-scheduled` scheduled publish cron endpoint (`CRON_SECRET` required)
- `/api/cron/security-alerts` security alert webhook cron endpoint (`CRON_SECRET` required)
  - supports dry-run with `?dry_run=1` or header `x-dry-run: 1` (returns payload preview, no delivery)
- `/about`, `/contact`, `/privacy-policy`, `/terms-of-service`, `/affiliate-disclosure`

## Security / RBAC

- RBAC source priority:
1. `admin_users` table (DB-backed)
2. env fallback (`ADMIN_OWNER_EMAILS` / `ADMIN_EDITOR_EMAILS`)
- Auto-bootstrap behavior:
If `admin_users` has no active users, owner emails from `ADMIN_OWNER_EMAILS` are auto-upserted on first admin identity resolution.
- `ADMIN_OWNER_EMAILS`: comma-separated owner emails (fallback mode).
- `ADMIN_EDITOR_EMAILS`: comma-separated editor emails (fallback mode).
- `AFFILIATE_ALLOWED_HOSTS`: optional comma-separated host allowlist for affiliate URLs (e.g. `shopee.co.id,tokopedia.com,notion.so`).
- `CRON_SECRET`: required token for `/api/cron/publish-scheduled`.
- `CRON_ALLOWED_IPS`: optional comma-separated IP allowlist for cron caller.
- `ADMIN_ACTION_RATE_LIMIT_MAX` + `ADMIN_ACTION_RATE_LIMIT_WINDOW_MS`: admin mutation throttling.
- `CRON_RATE_LIMIT_MAX` + `CRON_RATE_LIMIT_WINDOW_MS`: cron endpoint throttling.
- `/admin/logs` threshold alerts (24h):
  - `LOG_ALERT_DENIED_24H_THRESHOLD`
  - `LOG_ALERT_RATE_LIMITED_24H_THRESHOLD`
  - `LOG_ALERT_BLOCKED_URL_24H_THRESHOLD`
  - `LOG_ALERT_WEBHOOK_FAILURE_RATE_24H_THRESHOLD` (percent)
  - `LOG_ALERT_WEBHOOK_FAILURE_RATE_MIN_ATTEMPTS_24H`
  - `LOG_ALERT_WEBHOOK_P95_24H_THRESHOLD_MS`
  - `LOG_ALERT_WEBHOOK_P95_MIN_ATTEMPTS_24H`
  - `LOG_ALERT_WEBHOOK_P99_24H_THRESHOLD_MS`
  - `LOG_ALERT_WEBHOOK_P99_MIN_ATTEMPTS_24H`
- `/admin/logs` advanced investigation filters:
  - `minAttemptCount`
  - `minWebhookLatencyMs`
  - `webhookStatusCode`
- `/admin/logs` includes webhook latency percentiles (p50/p95/p99) for 24h and 7d windows.
- Security alert webhook cron:
  - `SECURITY_ALERT_WEBHOOK_URL`
  - `SECURITY_ALERT_WEBHOOK_URL_WARN` / `SECURITY_ALERT_WEBHOOK_URL_CRITICAL` (optional severity routing; fallback to default URL)
  - `SECURITY_ALERT_CRITICAL_CONSECUTIVE_MIN` (default `1`, require N consecutive critical candidates before routing as critical)
  - `SECURITY_ALERT_WEBHOOK_TOKEN` (optional header `x-security-alert-token`)
  - `SECURITY_ALERT_WEBHOOK_SIGNING_SECRET` (optional HMAC SHA256 over `timestamp.body`, header `x-security-alert-signature`)
  - `SECURITY_ALERT_WEBHOOK_MAX_ATTEMPTS` / `SECURITY_ALERT_WEBHOOK_BACKOFF_MS` / `SECURITY_ALERT_WEBHOOK_TIMEOUT_MS` (retry + exponential backoff config)
  - `SECURITY_ALERT_COOLDOWN_MS` (default 1800000)
  - `SECURITY_ALERT_SKIP_LOG_WINDOW_MS` (default 600000, dedupe window for `security_alert_skipped` logs)
  - `SECURITY_ALERT_CRON_RATE_LIMIT_MAX` / `SECURITY_ALERT_CRON_RATE_LIMIT_WINDOW_MS`
- Webhook payload metadata:
  - `schemaVersion` (currently `1.0`)
  - `event` (`security_alert_threshold_breach`)
  - `severity` (`warn` or `critical`)
- Optional distributed rate limit backend (recommended for multi-instance):
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Denied admin mutations are logged to `activity_logs` with:
  - `admin_action_denied` (RBAC failure)
  - `admin_action_rate_limited` (throttle hit)
- Structured audit fields for denied/blocked events:
  - `reason`
  - `permission`
  - `return_to`
  - `retry_after_ms`
  - `attempt_count` (for webhook delivery attempts)
  - `webhook_status_code` (for webhook HTTP response)
  - `webhook_latency_ms` (total webhook delivery latency across retries)
- `affiliate_programs` DB constraints:
  - unique per (`product_id`, `region`, `program_name`)
  - max one primary program per `product_id`
- `setPrimaryAffiliateProgram` and primary-on-create now run in DB transaction to keep product URL + primary flag updates atomic.
- `activity_logs` has indexes for query speed:
  - `activity_logs_created_at_idx`
  - `activity_logs_action_created_at_idx`

## Receiver Verification Example

Use this on webhook receiver side to verify HMAC signature and reject replayed requests.

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySecurityAlertWebhook(input: {
  signingSecret: string;
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  maxAgeSeconds?: number;
}) {
  const maxAgeSeconds = input.maxAgeSeconds ?? 300;
  const timestamp = input.timestampHeader?.trim() ?? "";
  const signature = input.signatureHeader?.trim() ?? "";
  if (!timestamp || !signature.startsWith("v1=")) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > maxAgeSeconds) return false;

  const expected = createHmac("sha256", input.signingSecret)
    .update(`${timestamp}.${input.rawBody}`)
    .digest("hex");
  const provided = signature.slice(3);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```
