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

vi.mock("@/components/bulk-select-controls", () => ({
  BulkSelectControls: () => null,
}));

vi.mock("@/app/admin/actions", () => ({
  bulkProductAction: vi.fn(),
  checkAffiliateProgramHealthAction: vi.fn(),
  createAffiliateProgramAction: vi.fn(),
  createProductAction: vi.fn(),
  deleteProductAction: vi.fn(),
  setPrimaryAffiliateProgramAction: vi.fn(),
  updateProductAction: vi.fn(),
}));

vi.mock("@/lib/security/admin-auth", () => ({
  getCurrentAdminIdentity: vi.fn(),
}));

vi.mock("@/lib/security/access", () => ({
  canAccessAdminPath: vi.fn(),
}));

vi.mock("@/lib/db/queries/products", () => ({
  listProductsPaginated: vi.fn(),
}));

vi.mock("@/lib/db/queries/affiliate-programs", () => ({
  getAffiliateLinkHealthSummary: vi.fn(),
  listAffiliateProgramsByProduct: vi.fn(),
}));

vi.mock("@/lib/db/queries/funnel-metrics", () => ({
  getAffiliateFunnelMetrics: vi.fn(),
}));

vi.mock("@/lib/db/queries/activity-logs", () => ({
  getAffiliateHealthMonitoringSummary: vi.fn(),
  getAffiliateRedirectProgramStats: vi.fn(),
  getAffiliateRedirectRotationSkewSummary: vi.fn(),
  getAffiliateRotationGuardSummary: vi.fn(),
  getTrustCopyExperimentStats: vi.fn(),
  listRecentActivityLogs: vi.fn(),
}));

import AdminPage from "../page";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { canAccessAdminPath } from "@/lib/security/access";
import { listProductsPaginated } from "@/lib/db/queries/products";
import {
  getAffiliateLinkHealthSummary,
  listAffiliateProgramsByProduct,
} from "@/lib/db/queries/affiliate-programs";
import { getAffiliateFunnelMetrics } from "@/lib/db/queries/funnel-metrics";
import {
  getAffiliateHealthMonitoringSummary,
  getAffiliateRedirectProgramStats,
  getAffiliateRedirectRotationSkewSummary,
  getAffiliateRotationGuardSummary,
  getTrustCopyExperimentStats,
  listRecentActivityLogs,
} from "@/lib/db/queries/activity-logs";

describe("admin page rotation observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCurrentAdminIdentity).mockResolvedValue({
      email: "owner@example.com",
      role: "owner",
    });
    vi.mocked(canAccessAdminPath).mockReturnValue(true);

    vi.mocked(listProductsPaginated).mockResolvedValue({
      items: [
        {
          id: 1,
          name: "VPN Service",
          slug: "vpn-service",
          description: "desc",
          affiliateUrl: "https://example.com",
          isPublished: true,
          isPurged: false,
          purgeReason: null,
          rpScoreQuality: 80,
          rpScoreReputation: 82,
          rpScoreValue: 78,
          rpScoreTotal: 80,
          category: { slug: "global" },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 5,
    });
    vi.mocked(listAffiliateProgramsByProduct).mockResolvedValue([]);
    vi.mocked(listRecentActivityLogs).mockResolvedValue([]);
    vi.mocked(getAffiliateFunnelMetrics).mockResolvedValue({
      indonesia: { ctr24h: 2, ctr7d: 3, clicks24h: 2, intent24h: 100 },
      global: { ctr24h: 3, ctr7d: 4, clicks24h: 3, intent24h: 100 },
      redirectLatency: {
        p50_24h: 120,
        p95_24h: 220,
        p50_7d: 130,
        p95_7d: 240,
      },
    });
    vi.mocked(getAffiliateRedirectProgramStats).mockResolvedValue({
      programs: [
        {
          programKey: "impact",
          redirects24h: 40,
          redirects7d: 180,
          avgLatency24h: 95,
        },
      ],
      selection: {
        total24h: 80,
        preferred24h: 15,
        rotated24h: 50,
        primary24h: 10,
        fallback24h: 5,
        rotatedShare24h: 62.5,
      },
    });
    vi.mocked(getAffiliateRedirectRotationSkewSummary).mockResolvedValue({
      totalRotated24h: 50,
      thresholdSharePct: 65,
      minEventsPerProduct: 20,
      flaggedProducts: [
        {
          productId: 1,
          productSlug: "vpn-service",
          totalRotated24h: 50,
          dominantProgramKey: "impact",
          dominantCount: 40,
          dominantSharePct: 80,
          distribution: [
            { programKey: "impact", count: 40, sharePct: 80 },
            { programKey: "cj", count: 10, sharePct: 20 },
          ],
        },
      ],
    });
    vi.mocked(getAffiliateRotationGuardSummary).mockResolvedValue({
      recommendations24h: 2,
      recommendations7d: 4,
      guardRuns24h: 3,
      guardRuns7d: 18,
      lastGuardRunAt: new Date("2026-03-06T10:00:00.000Z"),
      lastGuardRunMode: "live",
      lastGuardMessage: "Rotation guard run",
      lastRecommendationAt: new Date("2026-03-06T09:00:00.000Z"),
    });
    vi.mocked(getTrustCopyExperimentStats).mockResolvedValue({
      control: {
        exposure24h: 60,
        exposure7d: 400,
        ctaClick24h: 6,
        ctaClick7d: 36,
        scoreLabelView24h: 20,
        scoreLabelView7d: 120,
        ctr24h: 10,
        ctr7d: 9,
      },
      verified: {
        exposure24h: 60,
        exposure7d: 420,
        ctaClick24h: 9,
        ctaClick7d: 44,
        scoreLabelView24h: 24,
        scoreLabelView7d: 134,
        ctr24h: 15,
        ctr7d: 10.47,
      },
      winner24h: "verified",
    });
    vi.mocked(getAffiliateLinkHealthSummary).mockResolvedValue({
      totalActiveOnPublished: 10,
      healthyCount: 10,
      unhealthyCount: 0,
      unknownCount: 0,
      healthyRate: 100,
    });
    vi.mocked(getAffiliateHealthMonitoringSummary).mockResolvedValue({
      runs24h: 4,
      runs7d: 20,
      checks24h: 80,
      healthy24h: 78,
      unhealthy24h: 2,
      recovered24h: 1,
      recovered7d: 5,
      degraded24h: 2,
      degraded7d: 7,
      successRate24h: 97.5,
      lastRunAt: new Date("2026-03-06T10:30:00.000Z"),
      lastRunMode: "live",
      lastRun: {
        checked: 20,
        healthy: 19,
        unhealthy: 1,
        recovered: 1,
        degraded: 1,
      },
    });
  });

  it("shows rotation imbalance warning and guardrail cards", async () => {
    const element = await AdminPage({
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Redirect Rotation Imbalance");
    expect(html).toContain("Rebalance Recommendation");
    expect(html).toContain("Rebalance Reco");
    expect(html).toContain("Guard Cron Runs");
    expect(html).toContain("/api/monitoring/redirect-rotation");
    expect(html).toContain("action=affiliate_redirect&amp;selectionMode=rotated");
    expect(html).toContain("vpn-service");
    expect(html).toContain("Investigate");
    expect(html).toContain(
      "action=affiliate_redirect&amp;entityType=product&amp;entityId=1&amp;permission=impact&amp;selectionMode=rotated",
    );
  });
});
