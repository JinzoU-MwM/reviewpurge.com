import Link from "next/link";

type CTAButton = {
    label: string;
    href: string;
    variant?: "accent" | "outline";
};

type Props = {
    kicker: string;
    title: string;
    description: string;
    ctas?: CTAButton[];
};

export function PageHero({ kicker, title, description, ctas }: Props) {
    return (
        <section className="hero-surface p-8 md:p-12 lg:p-14">
            <div className="hero-orb hero-orb-1" />
            <div className="hero-orb hero-orb-2" />
            <div className="relative z-10 max-w-4xl space-y-5">
                <p className="section-kicker text-white/70 reveal-up">{kicker}</p>
                <h1 className="heading-display text-4xl leading-[1.1] text-white md:text-5xl lg:text-6xl reveal-up">
                    {title}
                </h1>
                <p className="max-w-2xl text-base text-emerald-50/90 md:text-lg reveal-up">
                    {description}
                </p>
                {ctas && ctas.length > 0 && (
                    <div className="flex flex-wrap gap-3 pt-2 reveal-up">
                        {ctas.map((cta) => (
                            <Link
                                key={cta.href}
                                href={cta.href}
                                className={
                                    cta.variant === "outline"
                                        ? "btn btn-outline btn-sm"
                                        : "btn btn-accent btn-sm"
                                }
                            >
                                {cta.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
