export type SecurityStats = {
  denied24h: number;
  denied7d: number;
  rateLimited24h: number;
  rateLimited7d: number;
  blockedUrl24h: number;
  blockedUrl7d: number;
};

export type SecurityAlertThresholds = {
  denied24h: number;
  rateLimited24h: number;
  blockedUrl24h: number;
};

export type SecurityAlertItem = {
  key: "denied" | "rate_limited" | "blocked_url";
  label: string;
  value: number;
  threshold: number;
  action:
    | "admin_action_denied"
    | "admin_action_rate_limited"
    | "admin_action_blocked_url";
};

function parseThreshold(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveSecurityAlertThresholds(
  source: Record<string, string | undefined> = process.env,
): SecurityAlertThresholds {
  return {
    denied24h: parseThreshold(source["LOG_ALERT_DENIED_24H_THRESHOLD"], 20),
    rateLimited24h: parseThreshold(
      source["LOG_ALERT_RATE_LIMITED_24H_THRESHOLD"],
      40,
    ),
    blockedUrl24h: parseThreshold(source["LOG_ALERT_BLOCKED_URL_24H_THRESHOLD"], 10),
  };
}

export function evaluateSecurityAlerts(
  stats: SecurityStats,
  thresholds: SecurityAlertThresholds,
): SecurityAlertItem[] {
  const items: SecurityAlertItem[] = [
    {
      key: "denied",
      label: "Denied actions",
      value: stats.denied24h,
      threshold: thresholds.denied24h,
      action: "admin_action_denied",
    },
    {
      key: "rate_limited",
      label: "Rate-limited actions",
      value: stats.rateLimited24h,
      threshold: thresholds.rateLimited24h,
      action: "admin_action_rate_limited",
    },
    {
      key: "blocked_url",
      label: "Blocked URLs",
      value: stats.blockedUrl24h,
      threshold: thresholds.blockedUrl24h,
      action: "admin_action_blocked_url",
    },
  ];
  return items.filter((item) => item.value >= item.threshold);
}
