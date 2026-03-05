import { NextRequest, NextResponse } from "next/server";
import { resolveAffiliateTarget } from "@/lib/affiliate/resolve-target";
import { trackAffiliateClick } from "@/lib/affiliate/track-click";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const target = await resolveAffiliateTarget(slug);

  if (!target) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;
  await trackAffiliateClick(target.productId, ipAddress);

  return NextResponse.redirect(target.url, 302);
}
