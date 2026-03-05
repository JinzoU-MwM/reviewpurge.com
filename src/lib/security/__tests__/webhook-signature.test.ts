import { describe, expect, it } from "vitest";
import {
  signWebhookPayload,
  verifyWebhookSignature,
} from "@/lib/security/webhook-signature";

describe("webhook signature", () => {
  it("generates deterministic signature and verifies it", () => {
    const signature = signWebhookPayload({
      secret: "my-secret",
      timestamp: "1710000000",
      body: "{\"ok\":true}",
    });
    expect(signature).toHaveLength(64);
    expect(
      verifyWebhookSignature({
        secret: "my-secret",
        timestamp: "1710000000",
        body: "{\"ok\":true}",
        signature,
      }),
    ).toBe(true);
  });

  it("fails verification for mismatched payload", () => {
    const signature = signWebhookPayload({
      secret: "my-secret",
      timestamp: "1710000000",
      body: "{\"ok\":true}",
    });
    expect(
      verifyWebhookSignature({
        secret: "my-secret",
        timestamp: "1710000001",
        body: "{\"ok\":true}",
        signature,
      }),
    ).toBe(false);
  });
});
