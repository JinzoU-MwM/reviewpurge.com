import { NextRequest, NextResponse } from "next/server";
import { resolveAffiliateTarget } from "@/lib/affiliate/resolve-target";
import { trackAffiliateClick } from "@/lib/affiliate/track-click";
import { createActivityLog } from "@/lib/db/queries/activity-logs";
import { SESSION_COOKIE } from "@/lib/experiments/trust-copy";

type Params = {
  params: Promise<{ slug: string }>;
};

function sanitizeUtmValue(value: string | null, fallback: string) {
  if (!value) return fallback;
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return sanitized || fallback;
}

function appendDynamicUtm(inputUrl: string, params: { source: string; medium: string; campaign: string }) {
  try {
    const url = new URL(inputUrl);
    if (!url.searchParams.has("utm_source")) {
      url.searchParams.set("utm_source", params.source);
    }
    if (!url.searchParams.has("utm_medium")) {
      url.searchParams.set("utm_medium", params.medium);
    }
    if (!url.searchParams.has("utm_campaign")) {
      url.searchParams.set("utm_campaign", params.campaign);
    }
    return url.toString();
  } catch {
    return inputUrl;
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  const startedAt = Date.now();
  const { slug } = await params;
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value ?? null;
  const target = await resolveAffiliateTarget(
    slug,
    {
      preferredProgram: request.nextUrl.searchParams.get("program"),
      sessionId,
    },
  );

  if (!target) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const source = sanitizeUtmValue(request.nextUrl.searchParams.get("src"), "reviewpurge");
  const medium = sanitizeUtmValue(request.nextUrl.searchParams.get("medium"), "affiliate");
  const campaign = sanitizeUtmValue(
    request.nextUrl.searchParams.get("campaign"),
    `go-${slug}`,
  );
  const destinationUrl = appendDynamicUtm(target.url, { source, medium, campaign });

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent");
  const redirectLatencyMs = Date.now() - startedAt;

  // Keep redirect path responsive; analytics failures should not block the user.
  void trackAffiliateClick(target.productId, ipAddress, userAgent);
  void createActivityLog({
    actorEmail: null,
    entityType: "system",
    entityId: target.productId,
    action: "affiliate_redirect",
    reason: source,
    permission: target.selectedProgramKey,
    returnTo: target.selectionMode,
    webhookLatencyMs: redirectLatencyMs,
    message:
      target.selectedProgramName && target.selectionMode
        ? `Redirected /go/${slug} to affiliate destination via ${target.selectedProgramName} (${target.selectionMode})`
        : `Redirected /go/${slug} to affiliate destination`,
  });

  return NextResponse.redirect(destinationUrl, 302);
}
