import Link from "next/link";
import { cookies } from "next/headers";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import {
  TRUST_COPY_COOKIE,
  isTrustCopyVariant,
  type TrustCopyVariant,
} from "@/lib/experiments/trust-copy";
import { listAffiliateProgramsByProducts } from "@/lib/db/queries/affiliate-programs";
import { listProductsByRegion } from "@/lib/db/queries/products";

type Props = {
  searchParams: Promise<{
    sort?: string;
    minScore?: string;
  }>;
};

type SortMode = "score_desc" | "score_asc" | "name" | "value_desc";

const fallback = [
  {
    id: "id-1",
    name: "Produk TikTok Viral",
    slug: "produk-tiktok-viral",
    description: "Contoh listing awal sampai data database tersedia.",
    rpScoreTotal: null,
    rpScoreQuality: null,
    rpScoreReputation: null,
    rpScoreValue: null,
    marketplacePrograms: [] as Array<{
      label: string;
      programKey: string;
      isPrimary?: boolean;
    }>,
    isLinkAvailable: true,
  },
];

function normalizeProgramKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function marketplaceLabel(programName: string) {
  const name = programName.toLowerCase();
  if (name.includes("tokopedia")) return "Tokopedia";
  if (name.includes("shopee")) return "Shopee";
  if (name.includes("tiktok")) return "TikTok Shop";
  if (name.includes("lazada")) return "Lazada";
  if (name.includes("blibli")) return "Blibli";
  return programName;
}

function isProgramStatusAvailable(status: string | null | undefined) {
  return !status || status === "healthy";
}

function safeScore(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function parseSort(value: string | undefined): SortMode {
  if (
    value === "score_desc" ||
    value === "score_asc" ||
    value === "name" ||
    value === "value_desc"
  ) {
    return value;
  }
  return "score_desc";
}

function parseMinScore(value: string | undefined) {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  if (parsed >= 80) return 80;
  if (parsed >= 60) return 60;
  return 0;
}

function sortRows<T extends { name: string; rpScoreTotal: number | null; rpScoreValue: number | null }>(
  rows: T[],
  sort: SortMode,
) {
  return [...rows].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "en");
    if (sort === "score_asc") return safeScore(a.rpScoreTotal) - safeScore(b.rpScoreTotal);
    if (sort === "value_desc") return safeScore(b.rpScoreValue) - safeScore(a.rpScoreValue);
    return safeScore(b.rpScoreTotal) - safeScore(a.rpScoreTotal);
  });
}

function scoreBand(score: number | null) {
  if (score == null) return "unrated";
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "baseline";
}

function sortLabel(sort: SortMode) {
  if (sort === "score_asc") return "Score low-high";
  if (sort === "name") return "Name A-Z";
  if (sort === "value_desc") return "Value high-low";
  return "Score high-low";
}

export default async function IndonesiaPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const minScore = parseMinScore(params.minScore);

  const cookieStore = await cookies();
  const variantCookie = cookieStore.get(TRUST_COPY_COOKIE)?.value;
  const trustCopyVariant: TrustCopyVariant =
    variantCookie && isTrustCopyVariant(variantCookie) ? variantCookie : "control";

  const products = await listProductsByRegion("indonesia");
  const programRows = await listAffiliateProgramsByProducts({
    productIds: products.map((product) => product.id),
    region: "indonesia",
    activeOnly: true,
  });
  const availabilityByProductId = new Map<number, boolean>();
  for (const product of products) {
    const activePrograms = (product.affiliatePrograms ?? []).filter(
      (program) => program.isActive && program.region === "indonesia",
    );
    if (activePrograms.length === 0) {
      availabilityByProductId.set(product.id, true);
      continue;
    }
    availabilityByProductId.set(
      product.id,
      activePrograms.some((program) => isProgramStatusAvailable(program.lastHealthStatus)),
    );
  }
  const programsByProductId = new Map<
    number,
    Array<{ label: string; programKey: string; isPrimary?: boolean }>
  >();
  for (const program of programRows) {
    if (!isProgramStatusAvailable(program.lastHealthStatus)) continue;
    const key = normalizeProgramKey(program.programName);
    if (!key) continue;
    const existing = programsByProductId.get(program.productId) ?? [];
    if (!existing.some((item) => item.programKey === key)) {
      existing.push({
        label: marketplaceLabel(program.programName),
        programKey: key,
        isPrimary: program.isPrimary,
      });
      existing.sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));
      programsByProductId.set(program.productId, existing.slice(0, 3));
    }
  }

  const items =
    products.length > 0
      ? products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          rpScoreTotal: p.rpScoreTotal,
          rpScoreQuality: p.rpScoreQuality,
          rpScoreReputation: p.rpScoreReputation,
          rpScoreValue: p.rpScoreValue,
          marketplacePrograms: programsByProductId.get(p.id) ?? [],
          isLinkAvailable: availabilityByProductId.get(p.id) ?? true,
        }))
      : fallback;

  const comparisonRows = sortRows(
    items.filter((item) => safeScore(item.rpScoreTotal) >= minScore),
    sort,
  );

  const querySort = sort !== "score_desc" ? `&sort=${sort}` : "";
  const minScoreLabel = minScore === 0 ? "All" : `${minScore}+`;

  return (
    <div className="space-y-10">
      <PageHero
        kicker="Indonesia Market"
        title="High-Intent Local Picks"
        description="Kumpulan produk untuk audience Indonesia dengan pola belanja cepat dan repeat demand."
        ctas={[
          { label: "Browse All", href: "#products", variant: "accent" },
          { label: "Quick Compare", href: "#comparison", variant: "outline" },
        ]}
      />

      <section id="products" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-2xl text-slate-900">Products</h2>
          <span className="badge badge-primary">{items.length} items</span>
        </div>
        <p className="text-xs text-slate-500">
          RP Score = rata-rata kualitas barang, reputasi penjual, dan value harga (0-100).
        </p>

        {items.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <span className="text-4xl">PKG</span>
            <p className="mt-3 text-sm text-slate-600">Belum ada produk Indonesia. Coming soon!</p>
          </div>
        ) : (
          <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                name={item.name}
                slug={item.slug}
                description={item.description}
                region="indonesia"
                rpScoreTotal={item.rpScoreTotal}
                rpScoreQuality={item.rpScoreQuality}
                rpScoreReputation={item.rpScoreReputation}
                rpScoreValue={item.rpScoreValue}
                trustCopyVariant={trustCopyVariant}
                marketplacePrograms={item.marketplacePrograms}
                isLinkAvailable={item.isLinkAvailable}
              />
            ))}
          </div>
        )}
      </section>

      <section id="comparison" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="heading-display text-2xl text-slate-900">Quick Comparison</h2>
            <p className="text-sm text-slate-600">Scan cepat untuk pilih produk dengan value paling relevan.</p>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort</label>
              <select name="sort" defaultValue={sort} className="input min-w-[170px]">
                <option value="score_desc">Score high-low</option>
                <option value="score_asc">Score low-high</option>
                <option value="value_desc">Value high-low</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Min score</label>
              <select name="minScore" defaultValue={String(minScore)} className="input min-w-[130px]">
                <option value="0">All</option>
                <option value="60">60+</option>
                <option value="80">80+</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Apply</button>
            <Link href="/indonesia#comparison" className="btn btn-ghost">Reset</Link>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="badge badge-neutral">Sort: {sortLabel(sort)}</span>
          <span className="badge badge-neutral">Min score: {minScoreLabel}</span>
          <Link href={`/indonesia?minScore=80${querySort}#comparison`} className="badge badge-primary">Top 80+</Link>
          <Link href={`/indonesia?minScore=60${querySort}#comparison`} className="badge badge-neutral">Balanced 60+</Link>
        </div>

        {comparisonRows.length === 0 ? (
          <div className="panel p-6 text-sm text-slate-600">Tidak ada produk untuk filter ini.</div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--line)] bg-white/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">RP Score</th>
                  <th className="px-4 py-3 text-left">Quality</th>
                  <th className="px-4 py-3 text-left">Reputation</th>
                  <th className="px-4 py-3 text-left">Value</th>
                  <th className="px-4 py-3 text-left">Band</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--line)]/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.slug}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.rpScoreTotal ?? "-"}</td>
                    <td className="px-4 py-3">{item.rpScoreQuality ?? "-"}</td>
                    <td className="px-4 py-3">{item.rpScoreReputation ?? "-"}</td>
                    <td className="px-4 py-3">{item.rpScoreValue ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-neutral">{scoreBand(item.rpScoreTotal)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/go/${item.slug}?src=indonesia-compare&medium=onsite&campaign=compare-table-${trustCopyVariant}`}
                        className="btn btn-primary btn-sm"
                      >
                        Check offer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
