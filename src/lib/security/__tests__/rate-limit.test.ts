import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  it("allows until max reached", async () => {
    const key = `test:${Date.now()}`;
    const first = await checkRateLimit({ key, max: 2, windowMs: 60_000 });
    const second = await checkRateLimit({ key, max: 2, windowMs: 60_000 });
    const third = await checkRateLimit({ key, max: 2, windowMs: 60_000 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });
});
