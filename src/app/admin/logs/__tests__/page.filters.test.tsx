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
  evaluateSecurityAlerts: vi.fn(() => []),
  resolveSecurityAlertThresholds: vi.fn(() => ({
    denied24h: 100,
    rateLimited24h: 100,
    blockedUrl24h: 100,
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

describe("admin logs filters", () => {
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
      denied24h: 0,
      denied7d: 0,
      rateLimited24h: 0,
      rateLimited7d: 0,
      blockedUrl24h: 0,
      blockedUrl7d: 0,
    });
    vi.mocked(getActivityLogSecurityTrend).mockResolvedValue([]);
    vi.mocked(getSecurityAlertSeverityTrend).mockResolvedValue([]);
    vi.mocked(getSecurityAlertDeliveryTrend).mockResolvedValue([]);
    vi.mocked(getLatestSecurityAlertStatus).mockResolvedValue({
      lastOutcome: null,
      lastSent: null,
    });
    vi.mocked(getSecurityAlertSeveritySummary).mockResolvedValue({
      warnSent24h: 0,
      warnSent7d: 0,
      criticalSent24h: 0,
      criticalSent7d: 0,
      lastWarnSentAt: null,
      lastCriticalSentAt: null,
    });
    vi.mocked(getSecurityAlertDeliveryStats).mockResolvedValue({
      sent24h: 0,
      sent7d: 0,
      failed24h: 0,
      failed7d: 0,
      skipped24h: 0,
      skipped7d: 0,
    });
    vi.mocked(getSecurityAlertLatencyPercentiles).mockResolvedValue({
      p50_24h: null,
      p95_24h: null,
      p99_24h: null,
      p50_7d: null,
      p95_7d: null,
      p99_7d: null,
    });
  });

  it("maps entityId, permission, and selectionMode into exact query filters", async () => {
    const element = await AdminLogsPage({
      searchParams: Promise.resolve({
        page: "1",
        entityType: "product",
        entityId: "12",
        action: "affiliate_redirect",
        permission: "impact",
        selectionMode: "rotated",
      }),
    });
    const html = renderToStaticMarkup(element);

    expect(listActivityLogsPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "product",
        entityId: 12,
        action: "affiliate_redirect",
        permission: "impact",
        returnTo: "rotated",
      }),
    );
    expect(html).toContain("selectionMode=rotated");
    expect(html).toContain("/api/admin/logs/export?");
    expect(html).toContain("entityId=12");
    expect(html).toContain("permission=impact");
    expect(html).toContain("Severity Cooldown");
    expect(html).toContain("Warn Severity");
    expect(html).toContain("Critical Severity");
    expect(html).toContain("Alert Severity Trend (7 Days)");
  });
});
