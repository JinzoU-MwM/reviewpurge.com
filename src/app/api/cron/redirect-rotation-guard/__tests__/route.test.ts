import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/queries/activity-logs", () => ({
  createActivityLog: vi.fn(),
  getAffiliateRedirectRotationSkewSummary: vi.fn(),
  getLatestActivityLogByActionAndEntityId: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

import {
  createActivityLog,
  getAffiliateRedirectRotationSkewSummary,
  getLatestActivityLogByActionAndEntityId,
} from "@/lib/db/queries/activity-logs";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { POST } from "../route";

function makeRequest(
  url = "http://localhost/api/cron/redirect-rotation-guard?token=secret",
) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "x-forwarded-for": "1.1.1.1",
    },
  });
}

describe("redirect rotation guard cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

    process.env.CRON_SECRET = "secret";
    process.env.CRON_ALLOWED_IPS = "";
    delete process.env.AFFILIATE_REDIRECT_ROTATION_IMBALANCE_THRESHOLD;
    delete process.env.AFFILIATE_REDIRECT_ROTATION_MIN_EVENTS;
    delete process.env.AFFILIATE_REDIRECT_ROTATION_MAX_FLAGGED_PRODUCTS;
    delete process.env.AFFILIATE_REDIRECT_ROTATION_REBALANCE_COOLDOWN_MS;
    delete process.env.AFFILIATE_ROTATION_GUARD_CRON_RATE_LIMIT_MAX;
    delete process.env.AFFILIATE_ROTATION_GUARD_CRON_RATE_LIMIT_WINDOW_MS;
    delete process.env.CRON_RATE_LIMIT_MAX;
    delete process.env.CRON_RATE_LIMIT_WINDOW_MS;

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 9,
      retryAfterMs: 0,
    });
    vi.mocked(getAffiliateRedirectRotationSkewSummary).mockResolvedValue({
      totalRotated24h: 0,
      thresholdSharePct: 65,
      minEventsPerProduct: 20,
      flaggedProducts: [],
    });
    vi.mocked(getLatestActivityLogByActionAndEntityId).mockResolvedValue(null);
  });

  it("returns unauthorized when cron token is invalid", async () => {
    const response = await POST(
      makeRequest("http://localhost/api/cron/redirect-rotation-guard?token=wrong"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns 429 when rate limit blocks the request", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterMs: 1_000,
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Rate limit exceeded",
    });
  });

  it("supports dry run without creating recommendation logs", async () => {
    vi.mocked(getAffiliateRedirectRotationSkewSummary).mockResolvedValue({
      totalRotated24h: 42,
      thresholdSharePct: 65,
      minEventsPerProduct: 20,
      flaggedProducts: [
        {
          productId: 1,
          productSlug: "vpn-service",
          totalRotated24h: 30,
          dominantProgramKey: "amazon",
          dominantCount: 24,
          dominantSharePct: 80,
          distribution: [
            { programKey: "amazon", count: 24, sharePct: 80 },
            { programKey: "impact", count: 6, sharePct: 20 },
          ],
        },
      ],
    });

    const response = await POST(
      makeRequest("http://localhost/api/cron/redirect-rotation-guard?token=secret&dry_run=1"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);
    expect(body.flagged).toBe(1);
    expect(body.createdRecommendations).toBe(0);
    expect(body.skippedCooldown).toBe(0);
    expect(body.products).toEqual([
      {
        productId: 1,
        productSlug: "vpn-service",
        dominantProgramKey: "amazon",
        dominantSharePct: 80,
        totalRotated24h: 30,
      },
    ]);
    expect(createActivityLog).toHaveBeenCalledTimes(1);
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "affiliate_rotation_guard_cron",
        reason: "dry_run",
      }),
    );
  });

  it("skips recommendation when cooldown is still active", async () => {
    process.env.AFFILIATE_REDIRECT_ROTATION_REBALANCE_COOLDOWN_MS = String(
      6 * 60 * 60 * 1000,
    );
    vi.mocked(getAffiliateRedirectRotationSkewSummary).mockResolvedValue({
      totalRotated24h: 30,
      thresholdSharePct: 65,
      minEventsPerProduct: 20,
      flaggedProducts: [
        {
          productId: 99,
          productSlug: "password-manager",
          totalRotated24h: 30,
          dominantProgramKey: "impact",
          dominantCount: 23,
          dominantSharePct: 76.67,
          distribution: [{ programKey: "impact", count: 23, sharePct: 76.67 }],
        },
      ],
    });
    vi.mocked(getLatestActivityLogByActionAndEntityId).mockResolvedValue({
      id: 1,
      entityId: 99,
      reason: "impact",
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      message: "recent recommendation",
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.createdRecommendations).toBe(0);
    expect(body.skippedCooldown).toBe(1);
    expect(createActivityLog).toHaveBeenCalledTimes(1);
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "affiliate_rotation_guard_cron",
        reason: "live",
      }),
    );
  });

  it("creates recommendation logs for flagged products outside cooldown", async () => {
    process.env.AFFILIATE_REDIRECT_ROTATION_IMBALANCE_THRESHOLD = "70";
    process.env.AFFILIATE_REDIRECT_ROTATION_MIN_EVENTS = "25";
    process.env.AFFILIATE_REDIRECT_ROTATION_MAX_FLAGGED_PRODUCTS = "3";
    process.env.AFFILIATE_REDIRECT_ROTATION_REBALANCE_COOLDOWN_MS = String(60_000);
    vi.mocked(getAffiliateRedirectRotationSkewSummary).mockResolvedValue({
      totalRotated24h: 80,
      thresholdSharePct: 70,
      minEventsPerProduct: 25,
      flaggedProducts: [
        {
          productId: 10,
          productSlug: "antivirus-pro",
          totalRotated24h: 40,
          dominantProgramKey: "cj",
          dominantCount: 35,
          dominantSharePct: 87.5,
          distribution: [],
        },
        {
          productId: 11,
          productSlug: "vpn-max",
          totalRotated24h: 40,
          dominantProgramKey: "impact",
          dominantCount: 30,
          dominantSharePct: 75,
          distribution: [],
        },
      ],
    });
    vi.mocked(getLatestActivityLogByActionAndEntityId).mockResolvedValue(null);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.createdRecommendations).toBe(2);
    expect(body.skippedCooldown).toBe(0);
    expect(body.thresholdSharePct).toBe(70);
    expect(body.minEventsPerProduct).toBe(25);

    const calls = vi.mocked(createActivityLog).mock.calls.map(([arg]) => arg);
    const recommendationCalls = calls.filter(
      (arg) => arg.action === "affiliate_rotation_rebalance_recommended",
    );
    expect(recommendationCalls).toHaveLength(2);
    expect(recommendationCalls[0]).toEqual(
      expect.objectContaining({
        actorEmail: "system",
        entityType: "product",
        entityId: 10,
        action: "affiliate_rotation_rebalance_recommended",
        reason: "cj",
      }),
    );
    expect(recommendationCalls[1]).toEqual(
      expect.objectContaining({
        actorEmail: "system",
        entityType: "product",
        entityId: 11,
        action: "affiliate_rotation_rebalance_recommended",
        reason: "impact",
      }),
    );
    expect(calls[calls.length - 1]).toEqual(
      expect.objectContaining({
        action: "affiliate_rotation_guard_cron",
        reason: "live",
      }),
    );
  });
});
