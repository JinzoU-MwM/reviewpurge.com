"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  TRUST_COPY_EXPERIMENT_ID,
  getTrustCopyPayload,
  type TrustCopyVariant,
} from "@/lib/experiments/trust-copy";
import {
  sanitizeSourcePath,
  trackTrustCopyEvent,
} from "@/lib/experiments/track-event-client";

type Intent = "indonesia" | "global";

type Props = {
  initialIntent: Intent;
  initialVariant: TrustCopyVariant;
};

const intentConfig: Record<
  Intent,
  {
    kicker: string;
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  }
> = {
  indonesia: {
    kicker: "Lokal & Trending",
    title: "Belanja lebih yakin tanpa tenggelam di listing spam.",
    description:
      "Kurasi marketplace Indonesia dengan fokus pada value, kecepatan checkout, dan risiko barang zonk yang lebih rendah.",
    primaryLabel: "Explore Indonesia Picks",
    primaryHref: "/indonesia",
    secondaryLabel: "Explore Global Tools",
    secondaryHref: "/global",
  },
  global: {
    kicker: "SaaS & AI Tools",
    title: "Pilih software berdasarkan dampak, bukan sekadar hype.",
    description:
      "Ringkasan fitur, use-case, dan ROI untuk bantu kamu memutuskan tool yang benar-benar layak dipakai.",
    primaryLabel: "Explore Global Tools",
    primaryHref: "/global",
    secondaryLabel: "Explore Indonesia Picks",
    secondaryHref: "/indonesia",
  },
};

async function trackIntentSelection(intent: Intent, sourcePath: string) {
  try {
    await fetch("/api/analytics/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent, sourcePath }),
      keepalive: true,
    });
  } catch {
    // Do not block UX if analytics capture fails.
  }
}

export function HomeIntentHero({ initialIntent, initialVariant }: Props) {
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const variant = initialVariant;
  const activeConfig = useMemo(() => intentConfig[intent], [intent]);
  const trustCopy = useMemo(() => getTrustCopyPayload(variant), [variant]);

  useEffect(() => {
    const key = `${TRUST_COPY_EXPERIMENT_ID}:exposed`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    void trackTrustCopyEvent({
      variant,
      eventType: "exposure",
      context: intent,
      sourcePath: sanitizeSourcePath(window.location.pathname),
    });
  }, [intent, variant]);

  const handleSelect = (nextIntent: Intent) => {
    setIntent(nextIntent);
    document.cookie = `rp_intent=${nextIntent}; Path=/; Max-Age=15552000; SameSite=Lax`;
    void trackIntentSelection(nextIntent, sanitizeSourcePath(window.location.pathname));
  };

  const handleCtaClick = (context: string) => {
    void trackTrustCopyEvent({
      variant,
      eventType: "cta_click",
      context,
      sourcePath: sanitizeSourcePath(window.location.pathname),
    });
  };

  return (
    <section className="hero-surface p-8 md:p-12 lg:p-16">
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-6">
          <p className="section-kicker text-white/70 reveal-up">{activeConfig.kicker}</p>
          <h1 className="heading-display text-4xl leading-[1.08] text-white md:text-5xl lg:text-[3.35rem] reveal-up">
            {activeConfig.title}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-emerald-50/90 md:text-lg reveal-up">
            {activeConfig.description}
          </p>
          <div className="inline-flex max-w-fit items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
            {trustCopy.trustChip}
          </div>
          <p className="max-w-2xl text-sm text-emerald-100/80">{trustCopy.trustLine}</p>
          <div className="flex flex-wrap gap-3 pt-2 reveal-up">
            <Link
              href={activeConfig.primaryHref}
              className="btn btn-accent"
              onClick={() => handleCtaClick(`primary:${intent}`)}
            >
              {activeConfig.primaryLabel}
            </Link>
            <Link
              href={activeConfig.secondaryHref}
              className="btn btn-outline"
              onClick={() => handleCtaClick(`secondary:${intent}`)}
            >
              {activeConfig.secondaryLabel}
            </Link>
          </div>
        </div>

        <div className="glass-card space-y-3 border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            Pilih Fokusmu
          </p>
          <button
            type="button"
            onClick={() => handleSelect("indonesia")}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
              intent === "indonesia"
                ? "border-amber-200/70 bg-amber-300/25 text-white"
                : "border-white/20 bg-white/5 text-white/75 hover:bg-white/10"
            }`}
          >
            <span className="block text-xs uppercase tracking-[0.16em]">Indonesia</span>
            <span className="mt-1 block text-sm font-semibold">Kurasi marketplace, cepat dan praktis</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelect("global")}
            className={`w-full rounded-xl border px-4 py-3 text-left transition ${
              intent === "global"
                ? "border-emerald-200/70 bg-emerald-300/20 text-white"
                : "border-white/20 bg-white/5 text-white/75 hover:bg-white/10"
            }`}
          >
            <span className="block text-xs uppercase tracking-[0.16em]">Global</span>
            <span className="mt-1 block text-sm font-semibold">Komparasi software yang lebih objektif</span>
          </button>
        </div>
      </div>
    </section>
  );
}
