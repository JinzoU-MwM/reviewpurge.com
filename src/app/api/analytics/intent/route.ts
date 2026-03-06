import { NextRequest, NextResponse } from "next/server";
import { createActivityLog } from "@/lib/db/queries/activity-logs";

type IntentPayload = {
  intent?: unknown;
  sourcePath?: unknown;
};

function sanitizeIntent(value: unknown): "indonesia" | "global" | null {
  if (value === "indonesia" || value === "global") return value;
  return null;
}

function sanitizeSourcePath(value: unknown) {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.slice(0, 120);
}

export async function POST(request: NextRequest) {
  let body: IntentPayload = {};
  try {
    body = (await request.json()) as IntentPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const intent = sanitizeIntent(body.intent);
  if (!intent) {
    return NextResponse.json({ ok: false, error: "Invalid intent." }, { status: 400 });
  }

  const sourcePath = sanitizeSourcePath(body.sourcePath);
  await createActivityLog({
    actorEmail: null,
    entityType: "system",
    action: "intent_selected",
    reason: intent,
    message: `Intent "${intent}" selected from ${sourcePath}`,
  });

  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
