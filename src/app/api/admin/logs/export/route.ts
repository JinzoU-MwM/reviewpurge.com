import { NextRequest, NextResponse } from "next/server";
import { listActivityLogsForExport } from "@/lib/db/queries/activity-logs";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { canAccessAdminPath } from "@/lib/security/access";

function parsePositiveInt(value: string | null, fallback = 0) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function escapeCsvCell(value: unknown) {
  if (value == null) return "";
  const text = String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export async function GET(request: NextRequest) {
  const { role } = await getCurrentAdminIdentity();
  if (!canAccessAdminPath(role, "/admin/logs")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const entityTypeParam = request.nextUrl.searchParams.get("entityType")?.trim();
  const entityType =
    entityTypeParam === "product" ||
    entityTypeParam === "article" ||
    entityTypeParam === "system"
      ? entityTypeParam
      : "all";
  const action = request.nextUrl.searchParams.get("action")?.trim() ?? "";
  const reason = request.nextUrl.searchParams.get("reason")?.trim() ?? "";
  const permission = request.nextUrl.searchParams.get("permission")?.trim() ?? "";
  const selectionMode =
    request.nextUrl.searchParams.get("selectionMode")?.trim() ?? "";
  const entityId = parsePositiveInt(request.nextUrl.searchParams.get("entityId"), 0);
  const minAttemptCount = parsePositiveInt(
    request.nextUrl.searchParams.get("minAttemptCount"),
    0,
  );
  const minWebhookLatencyMs = parsePositiveInt(
    request.nextUrl.searchParams.get("minWebhookLatencyMs"),
    0,
  );
  const webhookStatusCode = parsePositiveInt(
    request.nextUrl.searchParams.get("webhookStatusCode"),
    0,
  );
  const limit = parsePositiveInt(
    request.nextUrl.searchParams.get("limit"),
    2_000,
  );

  const rows = await listActivityLogsForExport({
    q,
    entityType,
    entityId,
    action,
    reason,
    permission,
    returnTo: selectionMode,
    minAttemptCount,
    minWebhookLatencyMs,
    webhookStatusCode,
    limit,
  });

  const header = [
    "createdAt",
    "actorEmail",
    "entityType",
    "entityId",
    "action",
    "reason",
    "permission",
    "returnTo",
    "retryAfterMs",
    "attemptCount",
    "webhookStatusCode",
    "webhookLatencyMs",
    "message",
  ];
  const csvLines = [
    header.map((item) => escapeCsvCell(item)).join(","),
    ...rows.map((row) =>
      [
        row.createdAt.toISOString(),
        row.actorEmail ?? "",
        row.entityType,
        row.entityId ?? "",
        row.action,
        row.reason ?? "",
        row.permission ?? "",
        row.returnTo ?? "",
        row.retryAfterMs ?? "",
        row.attemptCount ?? "",
        row.webhookStatusCode ?? "",
        row.webhookLatencyMs ?? "",
        row.message,
      ]
        .map((item) => escapeCsvCell(item))
        .join(","),
    ),
  ];
  const csv = `${csvLines.join("\n")}\n`;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="activity-logs-${stamp}.csv"`,
    },
  });
}
