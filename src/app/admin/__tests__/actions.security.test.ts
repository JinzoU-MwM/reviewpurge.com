import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/security/admin-auth", () => ({
  getCurrentAdminIdentity: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/affiliate-url", () => ({
  isAffiliateUrlAllowed: vi.fn(() => true),
}));

vi.mock("@/lib/db/queries/activity-logs", () => ({
  createActivityLog: vi.fn(),
}));

vi.mock("@/lib/db/queries/products", () => ({
  createProduct: vi.fn(async () => ({ ok: true })),
  updateProduct: vi.fn(async () => ({ ok: true })),
  deleteProduct: vi.fn(async () => ({ ok: true })),
  setProductsPublished: vi.fn(async () => ({ ok: true })),
  deleteProducts: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/db/queries/articles", () => ({
  createArticle: vi.fn(async () => ({ ok: true })),
  updateArticle: vi.fn(async () => ({ ok: true })),
  deleteArticle: vi.fn(async () => ({ ok: true })),
  setArticlesPublished: vi.fn(async () => ({ ok: true })),
  deleteArticles: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/db/queries/affiliate-programs", () => ({
  createAffiliateProgram: vi.fn(async () => ({ ok: true })),
  setPrimaryAffiliateProgram: vi.fn(async () => ({ ok: true })),
  setAffiliateProgramHealth: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/db/queries/admin-users", () => ({
  upsertAdminUser: vi.fn(async () => ({ ok: true })),
  setAdminUserActive: vi.fn(async () => ({ ok: true })),
}));

import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { createActivityLog } from "@/lib/db/queries/activity-logs";
import { isAffiliateUrlAllowed } from "@/lib/security/affiliate-url";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  createProductAction,
  deleteProductAction,
} from "../actions";

describe("admin action security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthorized destructive action", async () => {
    vi.mocked(getCurrentAdminIdentity).mockResolvedValue({
      email: "editor@example.com",
      role: "editor",
    });
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      retryAfterMs: 0,
    });

    const formData = new FormData();
    formData.set("id", "1");
    formData.set("returnTo", "/admin");

    await expect(deleteProductAction(formData)).rejects.toThrow(
      "REDIRECT:/admin?status=unauthorized",
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin_action_denied",
        entityType: "system",
      }),
    );
  });

  it("redirects when action rate-limited", async () => {
    vi.mocked(getCurrentAdminIdentity).mockResolvedValue({
      email: "owner@example.com",
      role: "owner",
    });
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterMs: 1000,
    });

    const formData = new FormData();
    formData.set("returnTo", "/admin");
    formData.set("name", "Test Product");
    formData.set("slug", "test-product");
    formData.set("description", "desc");
    formData.set("affiliateUrl", "https://example.com");
    formData.set("categorySlug", "global-ai-tools");
    formData.set("isPublished", "on");

    await expect(createProductAction(formData)).rejects.toThrow(
      "REDIRECT:/admin?status=rate_limited",
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin_action_rate_limited",
        entityType: "system",
      }),
    );
  });

  it("redirects and logs when affiliate url is blocked by policy", async () => {
    vi.mocked(getCurrentAdminIdentity).mockResolvedValue({
      email: "owner@example.com",
      role: "owner",
    });
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      retryAfterMs: 0,
    });
    vi.mocked(isAffiliateUrlAllowed).mockReturnValue(false);

    const formData = new FormData();
    formData.set("returnTo", "/admin");
    formData.set("name", "Blocked Product");
    formData.set("slug", "blocked-product");
    formData.set("description", "desc");
    formData.set("affiliateUrl", "https://blocked.example.com");
    formData.set("categorySlug", "global-ai-tools");

    await expect(createProductAction(formData)).rejects.toThrow(
      "REDIRECT:/admin?status=affiliate_url_blocked",
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin_action_blocked_url",
        reason: "affiliate_url_blocked",
        entityType: "system",
      }),
    );
  });
});
