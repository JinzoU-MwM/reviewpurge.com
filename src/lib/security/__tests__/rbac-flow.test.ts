import { describe, expect, it } from "vitest";
import { canAccessAdminPath } from "../access";
import { hasAdminPermission } from "../roles";

describe("RBAC route access flow", () => {
  it("owner can access all admin sections", () => {
    expect(canAccessAdminPath("owner", "/admin")).toBe(true);
    expect(canAccessAdminPath("owner", "/admin/articles")).toBe(true);
    expect(canAccessAdminPath("owner", "/admin/logs")).toBe(true);
    expect(canAccessAdminPath("owner", "/admin/users")).toBe(true);
  });

  it("editor cannot access owner-only sections", () => {
    expect(canAccessAdminPath("editor", "/admin")).toBe(true);
    expect(canAccessAdminPath("editor", "/admin/articles")).toBe(true);
    expect(canAccessAdminPath("editor", "/admin/logs")).toBe(false);
    expect(canAccessAdminPath("editor", "/admin/users")).toBe(false);
  });

  it("none cannot access admin sections", () => {
    expect(canAccessAdminPath("none", "/admin")).toBe(false);
    expect(canAccessAdminPath("none", "/admin/articles")).toBe(false);
    expect(canAccessAdminPath("none", "/admin/logs")).toBe(false);
    expect(canAccessAdminPath("none", "/admin/users")).toBe(false);
  });
});

describe("RBAC action permission flow", () => {
  it("owner can perform destructive operations", () => {
    expect(hasAdminPermission("owner", "products:delete")).toBe(true);
    expect(hasAdminPermission("owner", "articles:delete")).toBe(true);
    expect(hasAdminPermission("owner", "users:manage")).toBe(true);
  });

  it("editor cannot perform destructive or user-management operations", () => {
    expect(hasAdminPermission("editor", "products:delete")).toBe(false);
    expect(hasAdminPermission("editor", "articles:delete")).toBe(false);
    expect(hasAdminPermission("editor", "users:manage")).toBe(false);
  });
});
