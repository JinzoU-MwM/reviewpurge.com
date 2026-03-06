## Full sprint implementation summary (latest)

### Security Alert Hardening
1) Severity-specific cooldown implemented in `/api/cron/security-alerts`:
- warn cooldown override: `SECURITY_ALERT_COOLDOWN_MS_WARN`
- critical cooldown override: `SECURITY_ALERT_COOLDOWN_MS_CRITICAL`
- both fallback to `SECURITY_ALERT_COOLDOWN_MS`
- cooldown check now keyed by severity reason (`threshold_breach_warn` / `threshold_breach_critical`) so severities do not block each other.

2) Sustained breach escalation implemented:
- new env:
  - `SECURITY_ALERT_SUSTAINED_WINDOW_DAYS` (default 3)
  - `SECURITY_ALERT_SUSTAINED_MIN_BREACH_DAYS` (default 2)
- if sustained breach condition is met, severity escalates to `critical` even if strict 2x threshold + consecutive rule is not met.
- payload now includes `sustainedBreach` metadata.

### Admin Logs Observability UX
3) Added severity cooldown visibility (`/admin/logs`):
- warn vs critical cards with:
  - readiness status (Ready / Cooldown Active)
  - retry countdown
  - sent counters (24h/7d)
  - last sent timestamp.

4) Added severity trend table (`/admin/logs`):
- new 7-day trend panel:
  - warn sent/day
  - critical sent/day

5) Added investigation + filtering improvements (already in sprint chain):
- exact filters: `entityId`, `permission`, `selectionMode` (mapped to `returnTo`)
- skew table row-level investigate links with exact params
- quick filters for `Sent Warn` and `Sent Critical`.

6) CSV export shipped:
- `/api/admin/logs/export` owner-only
- exports filtered logs with active filter state from `/admin/logs`.

### Query/Backend additions
- `listActivityLogsForExport(...)`
- `getSecurityAlertSeveritySummary()`
- `getSecurityAlertSeverityTrend(days)`
- sustained breach evaluator integrated in security-alerts route.

### Tests added/updated
- security alerts route tests expanded for:
  - severity-specific cooldown
  - sustained multi-day escalation
- admin logs tests cover:
  - filter mapping + export link
  - observability banners
  - severity cooldown section + trend panel
- current test count: 52 passed.

### Documentation updates
- `README.md` updated for:
  - new security alert envs
  - admin logs severity cooldown + severity trend
  - csv export route
- `AGENTS.md` updated with implemented capabilities and env references.

### Verification
- `pnpm lint` ✅
- `pnpm test` ✅ (52 passed)
- `pnpm build` ✅
