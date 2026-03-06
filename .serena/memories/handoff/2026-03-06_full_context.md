# Full Context Handoff (2026-03-06)

## Project
- Name: `reviewpurge.com`
- Stack: Next.js App Router + TypeScript + Tailwind + Supabase + Drizzle + Postgres
- Focus area completed in this sprint chain:
  - admin UX + observability
  - affiliate redirect rotation guardrail + monitoring
  - security alert hardening (severity cooldown + sustained breach)
  - logs filtering + CSV export

## Major Features Implemented

### 1) Affiliate Redirect Rotation Guardrail
- Redirect selection telemetry on `/go/[slug]`:
  - action: `affiliate_redirect`
  - `reason=src`
  - `permission=<selected_program_key>`
  - `returnTo=<selection_mode>` (`preferred|rotated|primary|fallback`)
- New cron endpoint:
  - `/api/cron/redirect-rotation-guard`
  - auth with `CRON_SECRET`, supports `x-cron-token` or `?token=`
  - optional `CRON_ALLOWED_IPS`
  - supports `dry_run`
  - creates recommendation logs:
    - action: `affiliate_rotation_rebalance_recommended`
  - logs cron run:
    - action: `affiliate_rotation_guard_cron`
- New monitoring endpoint:
  - `/api/monitoring/redirect-rotation`
  - auth via `x-monitor-token` or `?token=` using `CRON_SECRET`
  - status: `ok|warn|critical`

### 2) Admin Dashboard Rotation UX
- Added redirect rotation section in `/admin`:
  - total redirects
  - rotated share
  - preferred/primary counts
  - top programs table
  - flagged skew products table
  - guard run + recommendation summary
- Added row-level `Investigate` link from skew table to `/admin/logs` with exact filters.

### 3) Admin Logs Exact Filtering + Export
- Extended `/admin/logs` filters:
  - `entityId`
  - `permission`
  - `selectionMode` (mapped to log `returnTo`)
  - existing filters retained
- Quick filters include:
  - `Redirect Rotated`
  - `Rebalance Recommendation`
  - `Rotation Guard Cron`
  - `Sent Warn`
  - `Sent Critical`
- New owner-only CSV export endpoint:
  - `/api/admin/logs/export`
  - exports current filtered logs
  - checked via admin identity + `canAccessAdminPath(role, "/admin/logs")`

### 4) Security Alert Hardening
- Existing `/api/cron/security-alerts` improved:
  - severity-specific webhook routing retained (`warn` / `critical`)
  - severity-specific cooldowns added:
    - `SECURITY_ALERT_COOLDOWN_MS_WARN`
    - `SECURITY_ALERT_COOLDOWN_MS_CRITICAL`
    - fallback `SECURITY_ALERT_COOLDOWN_MS`
  - sustained breach escalation added:
    - `SECURITY_ALERT_SUSTAINED_WINDOW_DAYS`
    - `SECURITY_ALERT_SUSTAINED_MIN_BREACH_DAYS`
  - payload now includes `sustainedBreach`
- `/admin/logs` observability extended:
  - severity cooldown cards (`warn` and `critical`) with readiness/retry
  - severity trend table (7-day warn vs critical sent)

## Key Query Additions (activity logs)
- `listActivityLogsForExport(...)`
- `getSecurityAlertSeveritySummary()`
- `getSecurityAlertSeverityTrend(days)`
- `getLatestActivityLogByActionAndEntityId(...)`
- `getAffiliateRedirectProgramStats(...)`
- `getAffiliateRedirectRotationSkewSummary(...)`
- `getAffiliateRotationGuardSummary()`

## API Endpoints Added
- `GET /api/admin/logs/export`
- `POST|GET /api/cron/redirect-rotation-guard`
- `GET /api/monitoring/redirect-rotation`

## Tests Added/Expanded
- `src/app/api/cron/redirect-rotation-guard/__tests__/route.test.ts`
- `src/app/api/monitoring/redirect-rotation/__tests__/route.test.ts`
- `src/app/api/admin/logs/export/__tests__/route.test.ts`
- `src/app/admin/__tests__/page.rotation-observability.test.tsx`
- `src/app/admin/logs/__tests__/page.filters.test.tsx`
- `src/app/admin/logs/__tests__/page.alert-banners.test.tsx`
- `src/app/api/cron/security-alerts/__tests__/route.test.ts` expanded for:
  - severity cooldown behavior
  - sustained breach escalation

## Environment Variables Added/Used

### Security Alerts
- `SECURITY_ALERT_COOLDOWN_MS_WARN`
- `SECURITY_ALERT_COOLDOWN_MS_CRITICAL`
- `SECURITY_ALERT_SUSTAINED_WINDOW_DAYS`
- `SECURITY_ALERT_SUSTAINED_MIN_BREACH_DAYS`

### Rotation Guardrail
- `AFFILIATE_REDIRECT_ROTATION_IMBALANCE_THRESHOLD`
- `AFFILIATE_REDIRECT_ROTATION_MIN_EVENTS`
- `AFFILIATE_REDIRECT_ROTATION_MAX_FLAGGED_PRODUCTS`
- `AFFILIATE_REDIRECT_ROTATION_REBALANCE_COOLDOWN_MS`
- `AFFILIATE_ROTATION_GUARD_CRON_RATE_LIMIT_MAX`
- `AFFILIATE_ROTATION_GUARD_CRON_RATE_LIMIT_WINDOW_MS`

### Rotation Monitoring
- `AFFILIATE_REDIRECT_ROTATION_MONITOR_WARN_FLAGGED`
- `AFFILIATE_REDIRECT_ROTATION_MONITOR_CRITICAL_FLAGGED`
- `AFFILIATE_REDIRECT_ROTATION_MONITOR_STALE_MINUTES_WARN`
- `AFFILIATE_REDIRECT_ROTATION_MONITOR_STALE_MINUTES_CRITICAL`

## Verification Status (latest)
- `pnpm lint` ✅
- `pnpm test` ✅ (52 passed)
- `pnpm build` ✅

## Docs Updated
- `README.md` (routes, envs, observability behavior)
- `AGENTS.md` (handoff checklist + env list + implemented scope)

## Additional Serena Memories Written
- `handoff/2026-03-06_admin_rotation_observability_export`
- `handoff/2026-03-06_full_sprint_security_observability`

