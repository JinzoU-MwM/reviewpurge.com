import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/queries/activity-logs", () => ({
  getAffiliateRedirectRotationSkewSummary: vi.fn(),
  getAffiliateRotationGuardSummary: vi.fn(),
}));

import {
  getAffiliateRedirectRotationSkewSummary,
  getAffiliateRotationGuardSummary,
} from "@/lib/db/queries/activity-logs";
import { GET } from "../route";

function makeRequest(
  url = "http://localhost/api/monitoring/redirect-rotation?token=secret",
) {
  return new NextRequest(url, {
    method: "GET",
    headers: {
      "x-forwarded-for": "1.1.1.1",
    },
  });
}

describe("redirect rotation monitoring route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.CRON_SECRET = "secret";
    delete process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_WARN_FLAGGED;
    delete process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_CRITICAL_FLAGGED;
    delete process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_STALE_MINUTES_WARN;
    delete process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_STALE_MINUTES_CRITICAL;

    vi.mocked(getAffiliateRedirectRotationSkewSummary).mockResolvedValue({
      totalRotated24h: 0,
      thresholdSharePct: 65,
      minEventsPerProduct: 20,
      flaggedProducts: [],
    });
    vi.mocked(getAffiliateRotationGuardSummary).mockResolvedValue({
      recommendations24h: 0,
      recommendations7d: 0,
      guardRuns24h: 0,
      guardRuns7d: 0,
      lastGuardRunAt: null,
      lastGuardRunMode: null,
      lastGuardMessage: null,
      lastRecommendationAt: null,
    });
  });

  it("returns unauthorized when token is invalid", async () => {
    const response = await GET(
      makeRequest("http://localhost/api/monitoring/redirect-rotation?token=wrong"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns ok status when there is no flagged skew and no recommendation", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("ok");
    expect(body.skew.flaggedProducts).toHaveLength(0);
    expect(body.guard.recommendations24h).toBe(0);
  });

  it("returns critical when flagged products exceed critical threshold", async () => {
    process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_WARN_FLAGGED = "1";
    process.env.AFFILIATE_REDIRECT_ROTATION_MONITOR_CRITICAL_FLAGGED = "2";
    vi.mocked(getAffiliateRedirectRotationSkewSummary).mockResolvedValue({
      totalRotated24h: 120,
      thresholdSharePct: 65,
      minEventsPerProduct: 20,
      flaggedProducts: [
        {
          productId: 1,
          productSlug: "vpn-a",
          totalRotated24h: 60,
          dominantProgramKey: "impact",
          dominantCount: 50,
          dominantSharePct: 83.33,
          distribution: [],
        },
        {
          productId: 2,
          productSlug: "vpn-b",
          totalRotated24h: 60,
          dominantProgramKey: "cj",
          dominantCount: 48,
          dominantSharePct: 80,
          distribution: [],
        },
      ],
    });

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("critical");
    expect(body.skew.flaggedProducts).toHaveLength(2);
  });

  it("returns warn when recent rebalance recommendations exist", async () => {
    vi.mocked(getAffiliateRotationGuardSummary).mockResolvedValue({
      recommendations24h: 2,
      recommendations7d: 5,
      guardRuns24h: 4,
      guardRuns7d: 20,
      lastGuardRunAt: new Date(),
      lastGuardRunMode: "live",
      lastGuardMessage: "run summary",
      lastRecommendationAt: new Date(),
    });

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("warn");
    expect(body.guard.recommendations24h).toBe(2);
  });
});
