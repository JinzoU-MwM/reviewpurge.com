import Link from "next/link";
import { cookies } from "next/headers";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import {
  TRUST_COPY_COOKIE,
  isTrustCopyVariant,
  type TrustCopyVariant,
} from "@/lib/experiments/trust-copy";
import { listProductsByRegion } from "@/lib/db/queries/products";

type Props = {
  searchParams: Promise<{
    sort?: string;
    minScore?: string;
    useCase?: string;
  }>;
};

type SortMode = "roi_desc" | "score_desc" | "name";
type UseCase = "all" | "startup" | "creator" | "smb" | "engineering";

type ComparisonRow = {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  rpScoreTotal: number | null;
  rpScoreQuality: number | null;
  rpScoreReputation: number | null;
  rpScoreValue: number | null;
  automationFit: number;
  collaborationFit: number;
  roiSignal: number;
  bestUseCase: Exclude<UseCase, "all">;
  useCaseMatch: Record<Exclude<UseCase, "all">, number>;
};

const fallback = [
  {
    id: "global-1",
    name: "Best AI Tools",
    slug: "best-ai-tools",
    description: "Contoh listing awal sampai data database tersedia.",
    rpScoreTotal: null,
    rpScoreQuality: null,
    rpScoreReputation: null,
    rpScoreValue: null,
    isLinkAvailable: true,
  },
];

const useCaseKeywords: Record<Exclude<UseCase, "all">, string[]> = {
  startup: ["startup", "growth", "marketing", "sales", "lead", "automation", "launch"],
  creator: ["creator", "content", "video", "design", "editing", "writing", "social", "seo"],
  smb: ["team", "ops", "operations", "invoice", "support", "crm", "commerce", "store"],
  engineering: ["api", "dev", "code", "deploy", "infra", "monitor", "security", "cloud"],
};

function safeScore(value: number | null | undefined, fallbackValue = 50) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallbackValue;
  return value;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function parseSort(value: string | undefined): SortMode {
  if (value === "score_desc" || value === "name") return value;
  return "roi_desc";
}

function parseMinScore(value: string | undefined) {
  const parsed = Number(value ?? "0");
  if (!Number.isFinite(parsed)) return 0;
  if (parsed >= 80) return 80;
  if (parsed >= 60) return 60;
  return 0;
}

function parseUseCase(value: string | undefined): UseCase {
  if (
    value === "startup" ||
    value === "creator" ||
    value === "smb" ||
    value === "engineering"
  ) {
    return value;
  }
  return "all";
}

function keywordHits(text: string, words: string[]) {
  let count = 0;
  for (const word of words) {
    if (text.includes(word)) count += 1;
  }
  return count;
}

function buildComparisonRow(item: {
  id: string | number;
  name: string;
  slug: string;
  description: string;
  rpScoreTotal: number | null;
  rpScoreQuality: number | null;
  rpScoreReputation: number | null;
  rpScoreValue: number | null;
}): ComparisonRow {
  const q = safeScore(item.rpScoreQuality);
  const r = safeScore(item.rpScoreReputation);
  const v = safeScore(item.rpScoreValue);
  const total = safeScore(item.rpScoreTotal, Math.round((q + r + v) / 3));
  const text = `${item.name} ${item.description}`.toLowerCase();

  const startupHits = keywordHits(text, useCaseKeywords.startup);
  const creatorHits = keywordHits(text, useCaseKeywords.creator);
  const smbHits = keywordHits(text, useCaseKeywords.smb);
  const engineeringHits = keywordHits(text, useCaseKeywords.engineering);

  const useCaseMatch = {
    startup: clampScore(total * 0.45 + v * 0.35 + startupHits * 6),
    creator: clampScore(total * 0.4 + q * 0.3 + creatorHits * 7),
    smb: clampScore(total * 0.35 + r * 0.45 + smbHits * 7),
    engineering: clampScore(total * 0.3 + q * 0.4 + engineeringHits * 8),
  };

  const ranking = Object.entries(useCaseMatch).sort((a, b) => b[1] - a[1]);
  const bestUseCase = (ranking[0]?.[0] ?? "startup") as Exclude<UseCase, "all">;

  return {
    ...item,
    rpScoreTotal: item.rpScoreTotal,
    rpScoreQuality: item.rpScoreQuality,
    rpScoreReputation: item.rpScoreReputation,
    rpScoreValue: item.rpScoreValue,
    automationFit: clampScore(v * 0.55 + q * 0.25 + startupHits * 6 + engineeringHits * 4),
    collaborationFit: clampScore(r * 0.5 + q * 0.2 + smbHits * 7 + creatorHits * 3),
    roiSignal: clampScore(total * 0.5 + v * 0.45 + startupHits * 4 + smbHits * 3),
    bestUseCase,
    useCaseMatch,
  };
}

function sortRows(rows: ComparisonRow[], sort: SortMode) {
  return [...rows].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "en");
    if (sort === "score_desc") return safeScore(b.rpScoreTotal, 0) - safeScore(a.rpScoreTotal, 0);
    return b.roiSignal - a.roiSignal;
  });
}

function sortLabel(sort: SortMode) {
  if (sort === "score_desc") return "Score high-low";
  if (sort === "name") return "Name A-Z";
  return "ROI high-low";
}

function isProgramStatusAvailable(status: string | null | undefined) {
  return !status || status === "healthy";
}

export default async function GlobalPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const minScore = parseMinScore(params.minScore);
  const useCase = parseUseCase(params.useCase);

  const cookieStore = await cookies();
  const variantCookie = cookieStore.get(TRUST_COPY_COOKIE)?.value;
  const trustCopyVariant: TrustCopyVariant =
    variantCookie && isTrustCopyVariant(variantCookie) ? variantCookie : "control";

  const products = await listProductsByRegion("global");
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
          isLinkAvailable: (() => {
            const activeGlobalPrograms = (p.affiliatePrograms ?? []).filter(
              (program) => program.isActive && program.region === "global",
            );
            if (activeGlobalPrograms.length === 0) return true;
            return activeGlobalPrograms.some((program) =>
              isProgramStatusAvailable(program.lastHealthStatus),
            );
          })(),
        }))
      : fallback;

  const comparisonRows = sortRows(
    items
      .map(buildComparisonRow)
      .filter((item) => safeScore(item.rpScoreTotal, 0) >= minScore)
      .filter((item) => (useCase === "all" ? true : item.bestUseCase === useCase)),
    sort,
  );

  const querySort = sort !== "roi_desc" ? `&sort=${sort}` : "";
  const queryMinScore = minScore > 0 ? `&minScore=${minScore}` : "";

  return (
    <div className="space-y-10">
      <PageHero
        kicker="Global Stack"
        title="Software & AI Winners"
        description="Kurasi tool global untuk buyer intent yang lebih jelas: productivity, growth, creator workflow, dan engineering operations."
        ctas={[
          { label: "Browse Tools", href: "#products", variant: "accent" },
          { label: "Feature Table", href: "#comparison", variant: "outline" },
        ]}
      />

      <section id="products" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="heading-display text-2xl text-slate-900">Tools</h2>
          <span className="badge badge-accent">{items.length} items</span>
        </div>
        <p className="text-xs text-slate-500">
          RP Score = rata-rata quality, vendor reputation, dan price-to-value fit (0-100).
        </p>

        {items.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <span className="text-4xl">TOOL</span>
            <p className="mt-3 text-sm text-slate-600">Belum ada tools global. Coming soon!</p>
          </div>
        ) : (
          <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                name={item.name}
                slug={item.slug}
                description={item.description}
                region="global"
                rpScoreTotal={item.rpScoreTotal}
                rpScoreQuality={item.rpScoreQuality}
                rpScoreReputation={item.rpScoreReputation}
                rpScoreValue={item.rpScoreValue}
                trustCopyVariant={trustCopyVariant}
                isLinkAvailable={item.isLinkAvailable}
              />
            ))}
          </div>
        )}
      </section>

      <section id="comparison" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="heading-display text-2xl text-slate-900">Feature and ROI Comparison</h2>
            <p className="text-sm text-slate-600">Filter per use-case lalu lihat sinyal ROI dan fit secara cepat.</p>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Use-case</label>
              <select name="useCase" defaultValue={useCase} className="input min-w-[150px]">
                <option value="all">All</option>
                <option value="startup">Startup</option>
                <option value="creator">Creator</option>
                <option value="smb">SMB</option>
                <option value="engineering">Engineering</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort</label>
              <select name="sort" defaultValue={sort} className="input min-w-[160px]">
                <option value="roi_desc">ROI high-low</option>
                <option value="score_desc">Score high-low</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Min score</label>
              <select name="minScore" defaultValue={String(minScore)} className="input min-w-[120px]">
                <option value="0">All</option>
                <option value="60">60+</option>
                <option value="80">80+</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Apply</button>
            <Link href="/global#comparison" className="btn btn-ghost">Reset</Link>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="badge badge-neutral">Sort: {sortLabel(sort)}</span>
          <span className="badge badge-neutral">Use-case: {useCase}</span>
          <Link href={`/global?useCase=startup${querySort}${queryMinScore}#comparison`} className="badge badge-accent">Startup</Link>
          <Link href={`/global?useCase=creator${querySort}${queryMinScore}#comparison`} className="badge badge-neutral">Creator</Link>
          <Link href={`/global?useCase=engineering${querySort}${queryMinScore}#comparison`} className="badge badge-neutral">Engineering</Link>
        </div>

        {comparisonRows.length === 0 ? (
          <div className="panel p-6 text-sm text-slate-600">Tidak ada tools untuk filter ini.</div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-[var(--line)] bg-white/60 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tool</th>
                  <th className="px-4 py-3 text-left">RP Score</th>
                  <th className="px-4 py-3 text-left">ROI Signal</th>
                  <th className="px-4 py-3 text-left">Automation Fit</th>
                  <th className="px-4 py-3 text-left">Collab Fit</th>
                  <th className="px-4 py-3 text-left">Best For</th>
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
                    <td className="px-4 py-3">{item.roiSignal}</td>
                    <td className="px-4 py-3">{item.automationFit}</td>
                    <td className="px-4 py-3">{item.collaborationFit}</td>
                    <td className="px-4 py-3">
                      <span className="badge badge-neutral">{item.bestUseCase}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/go/${item.slug}?src=global-compare&medium=onsite&campaign=feature-table-${trustCopyVariant}`}
                        className="btn btn-accent btn-sm"
                      >
                        Visit tool
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
