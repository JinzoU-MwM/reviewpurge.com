import { NextRequest, NextResponse } from "next/server";
import { createActivityLog } from "@/lib/db/queries/activity-logs";
import {
  TRUST_COPY_EXPERIMENT_ID,
  isTrustCopyVariant,
  type TrustCopyVariant,
} from "@/lib/experiments/trust-copy";

const allowedEventTypes = new Set(["exposure", "cta_click", "score_label_view"]);

type ExperimentPayload = {
  experimentId?: unknown;
  variant?: unknown;
  eventType?: unknown;
  sourcePath?: unknown;
  context?: unknown;
};

function sanitizeSourcePath(value: unknown) {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.slice(0, 120);
}

function sanitizeContext(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 80);
}

function sanitizeEventType(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!allowedEventTypes.has(normalized)) return null;
  return normalized;
}

function sanitizeExperimentId(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized === TRUST_COPY_EXPERIMENT_ID ? normalized : null;
}

export async function POST(request: NextRequest) {
  let body: ExperimentPayload = {};
  try {
    body = (await request.json()) as ExperimentPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const experimentId = sanitizeExperimentId(body.experimentId);
  const variantRaw = typeof body.variant === "string" ? body.variant.trim() : undefined;
  const variant: TrustCopyVariant | null = isTrustCopyVariant(variantRaw) ? variantRaw : null;
  const eventType = sanitizeEventType(body.eventType);
  if (!experimentId || !variant || !eventType) {
    return NextResponse.json({ ok: false, error: "Invalid experiment payload." }, { status: 400 });
  }

  const sourcePath = sanitizeSourcePath(body.sourcePath);
  const context = sanitizeContext(body.context);
  await createActivityLog({
    actorEmail: null,
    entityType: "system",
    action: "experiment_event",
    reason: variant,
    permission: eventType,
    message: `Experiment ${experimentId} event=${eventType} source=${sourcePath}${context ? ` context=${context}` : ""}`,
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
