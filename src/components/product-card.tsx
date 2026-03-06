"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import {
    getTrustCopyPayload,
    TRUST_COPY_EXPERIMENT_ID,
    type TrustCopyVariant,
} from "@/lib/experiments/trust-copy";
import {
    sanitizeSourcePath,
    trackTrustCopyEvent,
} from "@/lib/experiments/track-event-client";

type Props = {
    name: string;
    slug: string;
    description: string;
    region: "indonesia" | "global";
    emoji?: string;
    rpScoreTotal?: number | null;
    rpScoreQuality?: number | null;
    rpScoreReputation?: number | null;
    rpScoreValue?: number | null;
    trustCopyVariant?: TrustCopyVariant;
    marketplacePrograms?: Array<{
        label: string;
        programKey: string;
        isPrimary?: boolean;
    }>;
    isLinkAvailable?: boolean;
};

const regionConfig = {
    indonesia: {
        badge: "badge-primary",
        label: "Indonesia",
        emoji: "ID",
        ctaLabel: "Check Offer",
        ctaClass: "btn btn-primary btn-sm",
    },
    global: {
        badge: "badge-accent",
        label: "Global",
        emoji: "GL",
        ctaLabel: "Start Free Trial",
        ctaClass: "btn btn-accent btn-sm",
    },
} as const;

function hasScore(value: number | null | undefined): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function inferGlobalCardSpecs(description: string) {
    const text = description.toLowerCase();

    const pricingModel =
        text.includes("freemium") || text.includes("free trial") || text.includes("trial")
            ? "Freemium"
            : text.includes("subscription") || text.includes("monthly") || text.includes("annual")
                ? "Subscription"
                : text.includes("lifetime") || text.includes("one-time") || text.includes("one time")
                    ? "One-time"
                    : "Custom pricing";

    const platformFlags = [
        ["Web", ["web", "browser", "cloud"]],
        ["iOS", ["ios", "iphone"]],
        ["Android", ["android"]],
        ["Desktop", ["windows", "mac", "linux", "desktop"]],
        ["API", ["api", "sdk", "integration"]],
    ] as const;
    const platforms = platformFlags
        .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
        .map(([label]) => label)
        .slice(0, 2);

    const usageSignal =
        text.includes("limit") || text.includes("quota") || text.includes("seat") || text.includes("credit")
            ? "Usage limits apply"
            : "No major limit note";

    return {
        pricingModel,
        platforms: platforms.length > 0 ? platforms : ["Web"],
        usageSignal,
    };
}

export function ProductCard({
    name,
    slug,
    description,
    region,
    emoji,
    rpScoreTotal,
    rpScoreQuality,
    rpScoreReputation,
    rpScoreValue,
    trustCopyVariant = "control",
    marketplacePrograms,
    isLinkAvailable = true,
}: Props) {
    const config = regionConfig[region];
    const displayEmoji = emoji || config.emoji;
    const hasRpScore = hasScore(rpScoreTotal);
    const redirectHref = `/go/${slug}?src=${region}-listing&medium=onsite&campaign=product-card-${trustCopyVariant}`;
    const trustCopy = getTrustCopyPayload(trustCopyVariant);
    const cardRef = useRef<HTMLElement | null>(null);
    const globalSpecs = useMemo(
        () => (region === "global" ? inferGlobalCardSpecs(description) : null),
        [description, region],
    );
    const marketplaceButtons = useMemo(
        () => (region === "indonesia" ? (marketplacePrograms ?? []).slice(0, 2) : []),
        [marketplacePrograms, region],
    );

    useEffect(() => {
        const element = cardRef.current;
        if (!element) return;

        const exposureKey = `${TRUST_COPY_EXPERIMENT_ID}:card_exposure:${slug}`;
        const scoreViewKey = `${TRUST_COPY_EXPERIMENT_ID}:score_label_view:${slug}`;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry || !entry.isIntersecting) return;

                if (sessionStorage.getItem(exposureKey) !== "1") {
                    sessionStorage.setItem(exposureKey, "1");
                    void trackTrustCopyEvent({
                        variant: trustCopyVariant,
                        eventType: "exposure",
                        context: `product_card:${region}:${slug}`,
                        sourcePath: sanitizeSourcePath(window.location.pathname),
                    });
                }

                if (hasRpScore && sessionStorage.getItem(scoreViewKey) !== "1") {
                    sessionStorage.setItem(scoreViewKey, "1");
                    void trackTrustCopyEvent({
                        variant: trustCopyVariant,
                        eventType: "score_label_view",
                        context: `score_label:${region}:${slug}`,
                        sourcePath: sanitizeSourcePath(window.location.pathname),
                    });
                }

                observer.disconnect();
            },
            {
                threshold: 0.45,
            },
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [hasRpScore, region, slug, trustCopyVariant]);

    const handleCtaClick = (context?: string) => {
        void trackTrustCopyEvent({
            variant: trustCopyVariant,
            eventType: "cta_click",
            context: context ?? `product_card_cta:${region}:${slug}`,
            sourcePath: sanitizeSourcePath(window.location.pathname),
        });
    };

    return (
        <article ref={cardRef} className="product-card group">
            <div className="product-card-image">
                <span className="relative z-10 text-5xl drop-shadow-sm transition-transform duration-500 group-hover:scale-110">
                    {displayEmoji}
                </span>
            </div>
            <div className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                    <span className={`badge ${config.badge}`}>{config.label}</span>
                    {hasRpScore && (
                        <span className="badge badge-primary">{trustCopy.scoreLabel} {rpScoreTotal}</span>
                    )}
                </div>
                <h3 className="heading-display text-xl font-semibold text-slate-900">
                    {name}
                </h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {description}
                </p>
                {hasRpScore && (
                    <p className="text-xs text-slate-500">
                        Method: Q {rpScoreQuality ?? "-"} | R {rpScoreReputation ?? "-"} | V {rpScoreValue ?? "-"}
                    </p>
                )}
                {globalSpecs && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="badge badge-neutral">{globalSpecs.pricingModel}</span>
                        <span className="badge badge-neutral">{globalSpecs.platforms.join(" + ")}</span>
                        <span className="badge badge-neutral">{globalSpecs.usageSignal}</span>
                    </div>
                )}
                <div className="pt-1">
                    {!isLinkAvailable ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Link sementara tidak tersedia. Tim kami sedang update tujuan affiliate.
                        </div>
                    ) : marketplaceButtons.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {marketplaceButtons.map((program, index) => {
                                const href = `/go/${slug}?src=${region}-listing&medium=onsite&campaign=market-${program.programKey}-${trustCopyVariant}&program=${program.programKey}`;
                                const className = index === 0 ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm";
                                return (
                                    <Link
                                        key={program.programKey}
                                        href={href}
                                        className={className}
                                        onClick={() => handleCtaClick(`marketplace:${program.programKey}:${region}:${slug}`)}
                                    >
                                        {program.label}
                                    </Link>
                                );
                            })}
                            <Link
                                href={redirectHref}
                                className="btn btn-outline btn-sm"
                                onClick={() => handleCtaClick(`fallback:${region}:${slug}`)}
                            >
                                More options
                            </Link>
                        </div>
                    ) : (
                        <Link href={redirectHref} className={config.ctaClass} onClick={() => handleCtaClick()}>
                            {config.ctaLabel}
                        </Link>
                    )}
                </div>
            </div>
        </article>
    );
}
