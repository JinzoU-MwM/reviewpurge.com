import { describe, expect, it } from "vitest";
import {
  hasAdminPermission,
  resolveAdminRoleFromEnv,
} from "../roles";

describe("resolveAdminRoleFromEnv", () => {
  it("resolves owner from ADMIN_OWNER_EMAILS", () => {
    process.env.ADMIN_OWNER_EMAILS = "owner@example.com";
    process.env.ADMIN_EDITOR_EMAILS = "editor@example.com";
    expect(resolveAdminRoleFromEnv("owner@example.com")).toBe("owner");
  });

  it("resolves editor from ADMIN_EDITOR_EMAILS", () => {
    process.env.ADMIN_OWNER_EMAILS = "owner@example.com";
    process.env.ADMIN_EDITOR_EMAILS = "editor@example.com";
    expect(resolveAdminRoleFromEnv("editor@example.com")).toBe("editor");
  });

  it("returns none for unknown email", () => {
    process.env.ADMIN_OWNER_EMAILS = "owner@example.com";
    process.env.ADMIN_EDITOR_EMAILS = "editor@example.com";
    expect(resolveAdminRoleFromEnv("unknown@example.com")).toBe("none");
  });
});

describe("hasAdminPermission", () => {
  it("owner can delete products", () => {
    expect(hasAdminPermission("owner", "products:delete")).toBe(true);
  });

  it("editor cannot delete products", () => {
    expect(hasAdminPermission("editor", "products:delete")).toBe(false);
  });
});
