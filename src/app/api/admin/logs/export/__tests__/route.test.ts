import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/queries/activity-logs", () => ({
  listActivityLogsForExport: vi.fn(),
}));

vi.mock("@/lib/security/admin-auth", () => ({
  getCurrentAdminIdentity: vi.fn(),
}));

vi.mock("@/lib/security/access", () => ({
  canAccessAdminPath: vi.fn(),
}));

import { listActivityLogsForExport } from "@/lib/db/queries/activity-logs";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { canAccessAdminPath } from "@/lib/security/access";
import { GET } from "../route";

function makeRequest(
  url = "http://localhost/api/admin/logs/export?action=affiliate_redirect&entityType=product&entityId=12&permission=impact&selectionMode=rotated",
) {
  return new NextRequest(url, { method: "GET" });
}

describe("admin logs export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getCurrentAdminIdentity).mockResolvedValue({
      email: "owner@example.com",
      role: "owner",
    });
    vi.mocked(canAccessAdminPath).mockReturnValue(true);
    vi.mocked(listActivityLogsForExport).mockResolvedValue([
      {
        id: 1,
        actorEmail: "system",
        entityType: "product",
        entityId: 12,
        action: "affiliate_redirect",
        message: 'A "quoted" message',
        reason: "src",
        permission: "impact",
        returnTo: "rotated",
        retryAfterMs: null,
        attemptCount: null,
        webhookStatusCode: null,
        webhookLatencyMs: 120,
        createdAt: new Date("2026-03-06T00:00:00.000Z"),
      },
    ]);
  });

  it("returns forbidden for users without access", async () => {
    vi.mocked(canAccessAdminPath).mockReturnValue(false);
    const response = await GET(makeRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
  });

  it("returns csv export for allowed users and forwards exact filters", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain(
      "attachment; filename=\"activity-logs-",
    );
    expect(listActivityLogsForExport).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "product",
        entityId: 12,
        action: "affiliate_redirect",
        permission: "impact",
        returnTo: "rotated",
      }),
    );

    const body = await response.text();
    expect(body).toContain("\"createdAt\",\"actorEmail\",\"entityType\"");
    expect(body).toContain("\"affiliate_redirect\"");
    expect(body).toContain("\"A \"\"quoted\"\" message\"");
  });
});
