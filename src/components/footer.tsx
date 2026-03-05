import Link from "next/link";

const quickLinks = [
    { href: "/indonesia", label: "Indonesia Products" },
    { href: "/global", label: "Global Tools" },
    { href: "/blog", label: "Blog" },
    { href: "/about", label: "About" },
];

const legalLinks = [
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-of-service", label: "Terms of Service" },
    { href: "/affiliate-disclosure", label: "Affiliate Disclosure" },
    { href: "/contact", label: "Contact" },
];

export function Footer() {
    return (
        <footer className="footer-section mt-16">
            <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
                <div className="grid gap-10 md:grid-cols-4">
                    {/* Brand */}
                    <div className="md:col-span-2 space-y-4">
                        <Link href="/" className="heading-display text-2xl font-bold text-slate-900">
                            Review<span className="text-primary">Purge</span>
                        </Link>
                        <p className="max-w-sm text-sm leading-relaxed text-slate-600">
                            Platform discovery produk terpercaya untuk Indonesia dan global.
                            Review independen, rekomendasi berbasis data.
                        </p>
                        <p className="font-mono text-[11px] uppercase tracking-widest text-slate-400">
                            Affiliate Intelligence Layer
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Explore
                        </p>
                        <nav className="footer-links flex flex-col gap-2">
                            {quickLinks.map((link) => (
                                <Link key={link.href} href={link.href}>
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Legal */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Legal
                        </p>
                        <nav className="footer-links flex flex-col gap-2">
                            {legalLinks.map((link) => (
                                <Link key={link.href} href={link.href}>
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 flex flex-col gap-3 border-t border-slate-200/80 pt-6 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-slate-500">
                        (c) {new Date().getFullYear()} ReviewPurge. All rights reserved.
                    </p>
                    <p className="text-xs text-slate-400">
                        Built with integrity. Powered by data.
                    </p>
                </div>
            </div>
        </footer>
    );
}

