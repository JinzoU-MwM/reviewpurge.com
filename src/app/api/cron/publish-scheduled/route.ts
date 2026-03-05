import { NextRequest, NextResponse } from "next/server";
import { createActivityLog } from "@/lib/db/queries/activity-logs";
import { publishDueScheduledArticles } from "@/lib/db/queries/articles";
import { checkRateLimit } from "@/lib/security/rate-limit";

function isAuthorized(request: NextRequest) {
  const token = process.env.CRON_SECRET?.trim();
  if (!token) return false;

  const headerToken = request.headers.get("x-cron-token")?.trim();
  const queryToken = request.nextUrl.searchParams.get("token")?.trim();
  if (!(headerToken === token || queryToken === token)) return false;

  const allowedIps = (process.env.CRON_ALLOWED_IPS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowedIps.length === 0) return true;

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const requestIp = forwardedFor.split(",")[0]?.trim();
  return Boolean(requestIp && allowedIps.includes(requestIp));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const requestIp = forwardedFor.split(",")[0]?.trim() || "unknown";
  const max = Number(process.env.CRON_RATE_LIMIT_MAX ?? "30");
  const windowMs = Number(process.env.CRON_RATE_LIMIT_WINDOW_MS ?? "60000");
  const rate = await checkRateLimit({
    key: `cron_publish:${requestIp}`,
    max: Number.isFinite(max) ? max : 30,
    windowMs: Number.isFinite(windowMs) ? windowMs : 60000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429 },
    );
  }

  const publishedCount = await publishDueScheduledArticles();
  await createActivityLog({
    actorEmail: "system",
    entityType: "system",
    action: "scheduled_publish_cron",
    message: `Published ${publishedCount} scheduled article(s).`,
  });

  return NextResponse.json({ ok: true, publishedCount });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
