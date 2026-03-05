import { describe, expect, it } from "vitest";
import {
  evaluateSecurityAlerts,
  resolveSecurityAlertThresholds,
} from "@/lib/security/alerts";

describe("security alerts", () => {
  it("falls back to default thresholds when values are missing", () => {
    const thresholds = resolveSecurityAlertThresholds({});
    expect(thresholds).toEqual({
      denied24h: 20,
      rateLimited24h: 40,
      blockedUrl24h: 10,
    });
  });

  it("returns only breached metrics", () => {
    const breached = evaluateSecurityAlerts(
      {
        denied24h: 25,
        denied7d: 30,
        rateLimited24h: 10,
        rateLimited7d: 12,
        blockedUrl24h: 10,
        blockedUrl7d: 11,
      },
      {
        denied24h: 20,
        rateLimited24h: 40,
        blockedUrl24h: 10,
      },
    );
    expect(breached.map((item) => item.key)).toEqual(["denied", "blocked_url"]);
  });
});
