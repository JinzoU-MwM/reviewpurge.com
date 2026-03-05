import Link from "next/link";

type Props = {
    name: string;
    slug: string;
    description: string;
    region: "indonesia" | "global";
    emoji?: string;
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
        ctaLabel: "Visit Tool",
        ctaClass: "btn btn-accent btn-sm",
    },
} as const;

export function ProductCard({ name, slug, description, region, emoji }: Props) {
    const config = regionConfig[region];
    const displayEmoji = emoji || config.emoji;

    return (
        <article className="product-card group">
            <div className="product-card-image">
                <span className="relative z-10 text-5xl drop-shadow-sm transition-transform duration-500 group-hover:scale-110">
                    {displayEmoji}
                </span>
            </div>
            <div className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                    <span className={`badge ${config.badge}`}>{config.label}</span>
                </div>
                <h3 className="heading-display text-xl font-semibold text-slate-900">
                    {name}
                </h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {description}
                </p>
                <div className="pt-1">
                    <Link href={`/go/${slug}`} className={config.ctaClass}>
                        {config.ctaLabel}
                    </Link>
                </div>
            </div>
        </article>
    );
}

