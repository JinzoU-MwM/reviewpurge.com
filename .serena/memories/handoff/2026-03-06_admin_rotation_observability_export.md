## Implementations completed (latest)

### 1) Rotation guard cron + observability
- Added `/api/cron/redirect-rotation-guard` with:
  - `CRON_SECRET` auth (+ optional `CRON_ALLOWED_IPS`)
  - dedicated rate-limit override envs:
    - `AFFILIATE_ROTATION_GUARD_CRON_RATE_LIMIT_MAX`
    - `AFFILIATE_ROTATION_GUARD_CRON_RATE_LIMIT_WINDOW_MS`
  - skew detection via `getAffiliateRedirectRotationSkewSummary(...)`
  - recommendation log dedupe/cooldown via:
    - action: `affiliate_rotation_rebalance_recommended`
    - env: `AFFILIATE_REDIRECT_ROTATION_REBALANCE_COOLDOWN_MS`
  - dry-run support (`?dry_run=1` / `x-dry-run: 1`)
  - run summary log action: `affiliate_rotation_guard_cron`

### 2) Rotation monitoring endpoint
- Added `/api/monitoring/redirect-rotation` (token via `x-monitor-token`/`?token=` using `CRON_SECRET`).
- Returns `ok/warn/critical` based on flagged skew + stale guard run + recent recommendations.
- Added monitoring env thresholds:
  - `AFFILIATE_REDIRECT_ROTATION_MONITOR_WARN_FLAGGED`
  - `AFFILIATE_REDIRECT_ROTATION_MONITOR_CRITICAL_FLAGGED`
  - `AFFILIATE_REDIRECT_ROTATION_MONITOR_STALE_MINUTES_WARN`
  - `AFFILIATE_REDIRECT_ROTATION_MONITOR_STALE_MINUTES_CRITICAL`

### 3) Admin dashboard UX (rotation section)
- Added summary banner/cards for:
  - rebalance recommendations (24h/7d)
  - guard runs (24h/7d)
  - last guard run + last recommendation timestamps
- Added monitor endpoint hint in UI.
- Added skew table `Investigate` button per row to deep-link into logs with exact filters.

### 4) Admin logs: exact filters + deep-linking
- Extended filters in query + UI for:
  - `entityId`
  - `permission`
  - `selectionMode` (mapped to `returnTo` exact filter)
- Replaced loose quick-filter approach (`q=rotated`) with exact `selectionMode=rotated`.
- Pagination preserves new filters.

### 5) CSV export for logs
- Added owner-only endpoint: `/api/admin/logs/export`
  - checks admin access via `getCurrentAdminIdentity()` + `canAccessAdminPath(role, "/admin/logs")`
  - exports filtered logs as CSV attachment
  - accepts same filter query params as logs page
- Added `Export CSV` button in `/admin/logs` carrying active filter state.

### 6) Query layer additions
- `listActivityLogsForExport(...)`
- `getLatestActivityLogByActionAndEntityId(...)`
- `getAffiliateRedirectProgramStats(...)`
- `getAffiliateRedirectRotationSkewSummary(...)`
- `getAffiliateRotationGuardSummary(...)`

### 7) Tests added/updated
- `src/app/api/cron/redirect-rotation-guard/__tests__/route.test.ts`
- `src/app/api/monitoring/redirect-rotation/__tests__/route.test.ts`
- `src/app/admin/__tests__/page.rotation-observability.test.tsx`
- `src/app/admin/logs/__tests__/page.filters.test.tsx`
- `src/app/api/admin/logs/export/__tests__/route.test.ts`

### 8) Docs/handoff updated
- `README.md` updated with new routes/env/filter docs (rotation monitor + log export).
- `AGENTS.md` updated with new implemented capabilities and env references.

### 9) Verification status
- Latest full checks passed:
  - `pnpm lint`
  - `pnpm test` (48 passed)
  - `pnpm build`

### Key files touched (latest cycle)
- `src/lib/db/queries/activity-logs.ts`
- `src/app/admin/page.tsx`
- `src/app/admin/logs/page.tsx`
- `src/app/api/cron/redirect-rotation-guard/route.ts`
- `src/app/api/monitoring/redirect-rotation/route.ts`
- `src/app/api/admin/logs/export/route.ts`
- tests under:
  - `src/app/admin/__tests__/...`
  - `src/app/admin/logs/__tests__/...`
  - `src/app/api/cron/redirect-rotation-guard/__tests__/...`
  - `src/app/api/monitoring/redirect-rotation/__tests__/...`
  - `src/app/api/admin/logs/export/__tests__/...`
- docs: `README.md`, `AGENTS.md`
