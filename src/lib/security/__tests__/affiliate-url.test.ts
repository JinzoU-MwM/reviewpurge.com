import { describe, expect, it } from "vitest";
import { isAffiliateUrlAllowed } from "../affiliate-url";

describe("isAffiliateUrlAllowed", () => {
  it("allows https url when allowlist is empty", () => {
    process.env.AFFILIATE_ALLOWED_HOSTS = "";
    expect(isAffiliateUrlAllowed("https://example.com/path")).toBe(true);
  });

  it("blocks non-https urls", () => {
    process.env.AFFILIATE_ALLOWED_HOSTS = "";
    expect(isAffiliateUrlAllowed("http://example.com/path")).toBe(false);
  });

  it("allows host in allowlist and subdomains", () => {
    process.env.AFFILIATE_ALLOWED_HOSTS = "example.com,shop.co.id";
    expect(isAffiliateUrlAllowed("https://example.com/path")).toBe(true);
    expect(isAffiliateUrlAllowed("https://go.example.com/path")).toBe(true);
    expect(isAffiliateUrlAllowed("https://shop.co.id/path")).toBe(true);
  });

  it("blocks host not in allowlist", () => {
    process.env.AFFILIATE_ALLOWED_HOSTS = "example.com";
    expect(isAffiliateUrlAllowed("https://evil.com/path")).toBe(false);
  });
});
