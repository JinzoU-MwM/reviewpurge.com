import {
  TRUST_COPY_EXPERIMENT_ID,
  type TrustCopyVariant,
} from "@/lib/experiments/trust-copy";

type ExperimentEventType = "exposure" | "cta_click" | "score_label_view";

export function sanitizeSourcePath(pathname: string) {
  const value = pathname.trim();
  if (!value.startsWith("/")) return "/";
  return value.length > 120 ? value.slice(0, 120) : value;
}

export async function trackTrustCopyEvent(input: {
  variant: TrustCopyVariant;
  eventType: ExperimentEventType;
  context: string;
  sourcePath: string;
}) {
  try {
    await fetch("/api/analytics/experiment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        experimentId: TRUST_COPY_EXPERIMENT_ID,
        variant: input.variant,
        eventType: input.eventType,
        context: input.context.slice(0, 80),
        sourcePath: sanitizeSourcePath(input.sourcePath),
      }),
      keepalive: true,
    });
  } catch {
    // Never block UI for analytics event failures.
  }
}
