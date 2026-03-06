import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: unknown;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/components/admin-nav", () => ({
  AdminNav: () => null,
}));

vi.mock("@/lib/security/admin-auth", () => ({
  getCurrentAdminIdentity: vi.fn(),
}));

vi.mock("@/lib/security/access", () => ({
  canAccessAdminPath: vi.fn(),
}));

vi.mock("@/lib/security/alerts", () => ({
  evaluateSecurityAlerts: vi.fn(),
  resolveSecurityAlertThresholds: vi.fn(() => ({
    denied24h: 20,
    rateLimited24h: 40,
    blockedUrl24h: 10,
  })),
}));

vi.mock("@/lib/db/queries/activity-logs", () => ({
  getActivityLogSecurityStats: vi.fn(),
  getActivityLogSecurityTrend: vi.fn(),
  getLatestSecurityAlertStatus: vi.fn(),
  getSecurityAlertSeveritySummary: vi.fn(),
  getSecurityAlertSeverityTrend: vi.fn(),
  getSecurityAlertDeliveryStats: vi.fn(),
  getSecurityAlertDeliveryTrend: vi.fn(),
  getSecurityAlertLatencyPercentiles: vi.fn(),
  listActivityLogsPaginated: vi.fn(),
}));

import AdminLogsPage from "../page";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { canAccessAdminPath } from "@/lib/security/access";
import { evaluateSecurityAlerts } from "@/lib/security/alerts";
import {
  getActivityLogSecurityStats,
  getActivityLogSecurityTrend,
  getLatestSecurityAlertStatus,
  getSecurityAlertSeveritySummary,
  getSecurityAlertSeverityTrend,
  getSecurityAlertDeliveryStats,
  getSecurityAlertDeliveryTrend,
  getSecurityAlertLatencyPercentiles,
  listActivityLogsPaginated,
} from "@/lib/db/queries/activity-logs";

describe("admin logs alert banners", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCurrentAdminIdentity).mockResolvedValue({
      email: "owner@example.com",
      role: "owner",
    });
    vi.mocked(canAccessAdminPath).mockReturnValue(true);

    vi.mocked(listActivityLogsPaginated).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    vi.mocked(getActivityLogSecurityStats).mockResolvedValue({
      denied24h: 120,
      denied7d: 300,
      rateLimited24h: 30,
      rateLimited7d: 70,
      blockedUrl24h: 8,
      blockedUrl7d: 20,
    });
    vi.mocked(getActivityLogSecurityTrend).mockResolvedValue([]);
    vi.mocked(getSecurityAlertSeverityTrend).mockResolvedValue([]);
    vi.mocked(getSecurityAlertDeliveryTrend).mockResolvedValue([]);
    vi.mocked(getLatestSecurityAlertStatus).mockResolvedValue({
      lastOutcome: null,
      lastSent: null,
    });
    vi.mocked(getSecurityAlertSeveritySummary).mockResolvedValue({
      warnSent24h: 2,
      warnSent7d: 5,
      criticalSent24h: 1,
      criticalSent7d: 2,
      lastWarnSentAt: new Date("2026-03-06T01:00:00.000Z"),
      lastCriticalSentAt: new Date("2026-03-06T02:00:00.000Z"),
    });
    vi.mocked(getSecurityAlertDeliveryStats).mockResolvedValue({
      sent24h: 2,
      sent7d: 10,
      failed24h: 8,
      failed7d: 15,
      skipped24h: 3,
      skipped7d: 6,
    });
    vi.mocked(getSecurityAlertLatencyPercentiles).mockResolvedValue({
      p50_24h: 500,
      p95_24h: 3500,
      p99_24h: 7000,
      p50_7d: 480,
      p95_7d: 3400,
      p99_7d: 6800,
    });
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 120,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);
  });

  it("renders warning banners for breached thresholds and delivery degradation", async () => {
    const element = await AdminLogsPage({
      searchParams: Promise.resolve({ page: "1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Security Warning: Threshold Exceeded (24h)");
    expect(html).toContain("Delivery Warning: High Webhook Failure Rate (24h)");
    expect(html).toContain("P95 Latency Warning (24h)");
    expect(html).toContain("Critical: P99 Latency Very High (24h)");
    expect(html).toContain("Sent Critical");
  });
});
