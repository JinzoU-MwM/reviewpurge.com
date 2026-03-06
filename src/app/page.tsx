import Link from "next/link";
import { cookies } from "next/headers";
import { HomeIntentHero } from "@/components/home-intent-hero";
import { ProductCard } from "@/components/product-card";
import { StatCard } from "@/components/stat-card";
import { getPublicTrustSnapshot } from "@/lib/db/queries/products";
import {
  TRUST_COPY_COOKIE,
  isTrustCopyVariant,
  type TrustCopyVariant,
} from "@/lib/experiments/trust-copy";

const pillars = [
  {
    title: "Lokal & Trending",
    href: "/indonesia",
    description: "Produk fisik terkurasi dari marketplace Indonesia, fokus value dan jalur beli paling cepat.",
    tag: "Indonesia",
    emoji: "ID",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    title: "SaaS & AI Tools",
    href: "/global",
    description: "Software global untuk kerja, growth, dan automation dengan evaluasi ROI yang lebih jelas.",
    tag: "Global",
    emoji: "GL",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    title: "In-Depth Reviews",
    href: "/blog",
    description: "Panduan komparasi detail supaya keputusan beli lebih terukur, bukan ikut hype sesaat.",
    tag: "Guides",
    emoji: "RV",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
];

const howItWorks = [
  { step: "01", title: "Discover", description: "Temukan shortlist produk yang sudah disaring dari ribuan opsi." },
  { step: "02", title: "Compare", description: "Baca plus-minus, fitur, dan skor agar evaluasi lebih objektif." },
  { step: "03", title: "Decide", description: "Lanjut ke merchant terpercaya saat kamu sudah yakin dengan pilihanmu." },
];

function formatCount(value: number, withPlus = false) {
  if (value <= 0) return "0";
  return withPlus ? `${value}+` : `${value}`;
}

function inferRegionFromCategory(
  region: "indonesia" | "global" | null | undefined,
  slug: string | null | undefined,
): "indonesia" | "global" {
  if (region === "indonesia" || region === "global") return region;
  return slug?.startsWith("id-") ? "indonesia" : "global";
}

function isProgramStatusAvailable(status: string | null | undefined) {
  return !status || status === "healthy";
}

function isLinkAvailableForRegion(
  region: "indonesia" | "global",
  programs: Array<{
    region: "indonesia" | "global";
    isActive: boolean;
    lastHealthStatus: string | null;
  }>,
) {
  const activePrograms = programs.filter(
    (program) => program.isActive && program.region === region,
  );
  if (activePrograms.length === 0) return true;
  return activePrograms.some((program) =>
    isProgramStatusAvailable(program.lastHealthStatus),
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const preferredIntent = cookieStore.get("rp_intent")?.value;
  const trustVariantCookie = cookieStore.get(TRUST_COPY_COOKIE)?.value;
  const snapshot = await getPublicTrustSnapshot(4);
  const metrics = [
    {
      icon: "VP",
      label: "Verified Picks",
      value: formatCount(snapshot.publishedCount, true),
      detail: "Produk yang lolos kurasi publik",
    },
    {
      icon: "IN",
      label: "Independent Review",
      value: "100%",
      detail: "Tanpa sponsored placement",
    },
    {
      icon: "UP",
      label: "Update Cycle",
      value: "<24h",
      detail: "Harga dan offer dipantau rutin",
    },
    {
      icon: "PG",
      label: "Purged Drafts",
      value: formatCount(snapshot.purgedCount, true),
      detail: "Produk yang ditolak dengan alasan objektif",
    },
  ];

  const initialIntent = preferredIntent === "global" ? "global" : "indonesia";
  const initialVariant: TrustCopyVariant =
    trustVariantCookie && isTrustCopyVariant(trustVariantCookie)
      ? trustVariantCookie
      : "control";

  return (
    <div className="space-y-12">
      <HomeIntentHero initialIntent={initialIntent} initialVariant={initialVariant} />

      {/* Stats */}
      <section className="space-y-6">
        <div className="text-center">
          <p className="section-kicker">Trust Metrics</p>
          <h2 className="heading-display mt-2 text-3xl text-slate-900 md:text-4xl">
            Bukti Kurasi, Bukan Klaim Kosong
          </h2>
        </div>
        <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </section>

      {/* Pillar Categories */}
      <section className="space-y-6">
        <div className="text-center">
          <p className="section-kicker">Categories</p>
          <h2 className="heading-display mt-2 text-3xl text-slate-900 md:text-4xl">
            Pilih Jalur Risetmu
          </h2>
        </div>
        <div className="stagger-children grid gap-5 md:grid-cols-3">
          {pillars.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group product-card overflow-hidden"
            >
              <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${item.gradient}`}>
                <span className="text-5xl transition-transform duration-500 group-hover:scale-125">
                  {item.emoji}
                </span>
              </div>
              <div className="space-y-2 p-5">
                <span className="badge badge-neutral text-[10px]">{item.tag}</span>
                <h3 className="heading-display text-xl font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
                <p className="pt-1 text-xs font-bold uppercase tracking-wider text-primary transition-colors group-hover:text-primary-light">
                  Open section &gt;
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest verified picks */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Live Curation</p>
            <h2 className="heading-display mt-2 text-3xl text-slate-900 md:text-4xl">
              Latest Verified Picks
            </h2>
          </div>
          <Link href="/indonesia" className="btn btn-outline btn-sm">
            Browse all picks
          </Link>
        </div>
        {snapshot.latestVerified.length > 0 ? (
          <div className="stagger-children grid gap-5 md:grid-cols-2">
            {snapshot.latestVerified.map((item) => {
              const region = inferRegionFromCategory(item.category?.region, item.category?.slug);
              return (
                <ProductCard
                  key={item.id}
                  name={item.name}
                  slug={item.slug}
                  description={item.description}
                  region={region}
                  rpScoreTotal={item.rpScoreTotal}
                  rpScoreQuality={item.rpScoreQuality}
                  rpScoreReputation={item.rpScoreReputation}
                  rpScoreValue={item.rpScoreValue}
                  trustCopyVariant={initialVariant}
                  isLinkAvailable={isLinkAvailableForRegion(region, item.affiliatePrograms ?? [])}
                />
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-6">
            <p className="text-sm text-slate-600">
              Belum ada produk yang dipublikasikan. Tambahkan produk di dashboard admin
              lalu publish untuk menampilkan curated picks di homepage.
            </p>
          </div>
        )}
      </section>

      {/* The purged */}
      <section className="space-y-6">
        <div className="text-center">
          <p className="section-kicker">The Purged</p>
          <h2 className="heading-display mt-2 text-3xl text-slate-900 md:text-4xl">
            Produk Populer yang Sengaja Tidak Kami Rekomendasikan
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Transparansi kurasi: tidak semua produk populer layak direkomendasikan.
          </p>
        </div>
        {snapshot.latestPurged.length > 0 ? (
          <div className="stagger-children grid gap-4 md:grid-cols-2">
            {snapshot.latestPurged.map((item) => (
              <article key={item.id} className="glass-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="badge badge-neutral text-[10px]">
                    {inferRegionFromCategory(item.category?.region, item.category?.slug) === "indonesia"
                      ? "ID"
                      : "Global"}
                  </span>
                  <span className="badge badge-neutral text-[10px]">Rejected</span>
                </div>
                <h3 className="heading-display text-xl font-semibold text-slate-900">
                  {item.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.purgeReason ?? "Tidak lolos evaluasi editorial ReviewPurge."}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6">
            <p className="text-sm text-slate-600">
              Belum ada entri The Purged. Tandai produk sebagai The Purged di dashboard
              admin untuk menampilkan alasan penolakan di halaman ini.
            </p>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="space-y-8">
        <div className="text-center">
          <p className="section-kicker">How It Works</p>
          <h2 className="heading-display mt-2 text-3xl text-slate-900 md:text-4xl">
            Tiga Langkah Menuju Keputusan Terbaik
          </h2>
        </div>
        <div className="stagger-children grid gap-6 md:grid-cols-3">
          {howItWorks.map((item) => (
            <div key={item.step} className="glass-card p-6 text-center">
              <span className="gradient-text heading-display text-5xl font-black">
                {item.step}
              </span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="glass-card overflow-hidden p-8 text-center md:p-12">
        <p className="section-kicker">Stay Updated</p>
        <h2 className="heading-display mt-2 text-2xl text-slate-900 md:text-3xl">
          Dapatkan Rekomendasi Produk Terbaru
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
          Dapatkan update shortlist produk, tools baru, dan insight komparasi
          langsung ke inbox kamu.
        </p>
        <div className="mx-auto mt-6 flex max-w-md gap-2">
          <input
            type="email"
            placeholder="email@example.com"
            className="input flex-1"
            readOnly
          />
          <button type="button" className="btn btn-primary whitespace-nowrap">
            Subscribe
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          No spam. Unsubscribe anytime.
        </p>
      </section>
    </div>
  );
}
