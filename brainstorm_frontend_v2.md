# Frontend Brainstorm V2 - Landing Pages

## 1. Objective

Rework landing pages so users can decide faster with less risk.

Core promise:
- Choose faster.
- Avoid bad picks.
- See clear reasons behind every recommendation.

Primary pages in scope:
- `/` (homepage)
- `/indonesia`
- `/global`

Out of scope (for this round):
- Admin pages (`/admin/*`)
- Backend schema changes

## 2. Product Narrative

Current strength:
- Trust metrics, latest verified picks, and The Purged are already present.

Gap to close:
- Copy and flow are still partially product-centric, not fully decision-centric.
- User intent shortcuts are not explicit enough at top-level.

Narrative direction:
- From "discovery catalog" to "decision assistant".

## 3. UX Principles

1. Zero Noise
- Every section must answer one user question.
- Remove any text that does not help decide what to buy/use.

2. Show, Don't Tell
- Prefer proof cards, badges, and reason snippets over claims.

3. Decision in 10 Seconds
- Above-the-fold must offer immediate next action.

4. Trust by Transparency
- Keep The Purged and explicit rejection reasons visible.

5. Mobile-First Scanability
- Short headings, compact cards, quick filters, sticky CTAs.

## 4. Information Architecture (Per Page)

### 4.1 Homepage (`/`)

Goal:
- Establish trust quickly and route users to the right path.

Section order:
1. Hero with dual CTA:
- `Lihat Produk Lokal`
- `Lihat Tools Global`

2. Trust Metrics strip:
- Verified picks
- Independent review
- Update cycle
- Purged count
- Add: `Updated X jam lalu`

3. Latest Verified Picks (4 cards)
- Each card shows:
  - region badge
  - score/value cue
  - 1-line "why this pick"

4. Decision Paths (new)
- Quick intent chips/buttons:
  - `Butuh cepat`
  - `Butuh termurah`
  - `Butuh paling aman`
- Route to pre-filtered indonesia/global views.

5. The Purged (keep, compact)
- 2-3 items max on homepage.
- Add link: `Lihat semua yang ditolak` (optional future page/filter).

6. How It Works
- Keep 3-step framework.
- Localize title text to Indonesian-first:
  - `Cari`
  - `Bandingkan`
  - `Putuskan`

7. Final CTA
- Single, clear fallback action:
  - `Lihat shortlist untuk use-case kamu`

### 4.2 Indonesia Landing (`/indonesia`)

Goal:
- Help users decide what to buy now with local-market constraints.

Changes:
1. Hero copy by use-case, not generic catalog.
2. Add quick filters above the product grid:
- `Harga`
- `Rating`
- `Value`
- `Siap checkout`

3. Product cards:
- Add `Kenapa dipilih` (short reason)
- Add `Perlu diperhatikan` (small caution/red flag)

4. Comparison table:
- Keep existing table.
- Add sticky summary on mobile:
  - top candidate
  - best value
  - safest pick

5. CTA language:
- Prefer `Cek harga sekarang` over neutral labels.

### 4.3 Global Landing (`/global`)

Goal:
- Help users choose tools by outcome and ROI.

Changes:
1. Hero framed by work outcome:
- faster writing
- better selling
- faster shipping
- fewer manual ops

2. Group cards by outcome buckets (visual grouping):
- Write faster
- Sell better
- Ship faster
- Automate ops

3. Add ROI cues per card:
- `Hemat waktu`
- `Hemat biaya`
- `Impact tim`

4. Comparison table simplification:
- Default columns: ROI Signal, Automation Fit, Best For
- Advanced columns in expandable mode

## 5. Copywriting Guidelines

Do:
- Use user language: buy, compare, decide.
- Keep sentence length short.
- State reasons concretely.

Do not:
- Mention internal mechanics (RBAC, cron, pipelines) in public landing copy.
- Use funnel/operator terms like "convert" for end users.

## 6. Component-Level Tasks

1. `src/app/page.tsx`
- Refine hero and section copy.
- Add Decision Paths section.
- Add updated-time label in Trust Metrics.
- Keep Latest Verified Picks + The Purged, tighten card text.

2. `src/components/product-card.tsx`
- Add optional props:
  - `whyPicked?: string`
  - `watchout?: string`
  - `roiCue?: string`
- Render compact reason/caution blocks when provided.

3. `src/app/indonesia/page.tsx`
- Add quick-filter chips row.
- Update primary CTA wording.
- Add mobile sticky compare summary.

4. `src/app/global/page.tsx`
- Add outcome buckets UI.
- Prioritize ROI cues and simplified default table columns.

5. `src/app/globals.css`
- Add styles for:
  - decision chips
  - compact trust timestamp
  - sticky mobile summary
  - reason/caution micro-blocks

## 7. A/B Test Plan

Experiment set:
1. CTA label
- Variant A: `Cek harga`
- Variant B: `Lihat penawaran`
- Variant C: `Buka deal`

2. Card trust treatment
- Variant A: `Verified` badge only
- Variant B: `Verified + why picked`

3. Intent entry placement
- Variant A: in hero
- Variant B: below trust metrics

4. The Purged visibility
- Variant A: expanded by default
- Variant B: collapsed preview

Primary KPI:
- Click-through from landing to `/go/[slug]`

Secondary KPI:
- Scroll depth to Latest Verified Picks
- Filter usage rate
- Bounce rate delta

## 8. Success Metrics (Definition)

Target outcomes after rollout:
1. +10-15% CTR from homepage to offer click (`/go/[slug]`).
2. +8% usage of compare/filter controls.
3. Lower bounce on `/indonesia` and `/global`.
4. Higher click share on cards with visible "why picked".

## 9. Execution Plan

### Sprint 1 (Quick Wins, 3-4 days)
1. Homepage copy tightening.
2. Decision Paths section.
3. Trust metrics timestamp.
4. CTA label normalization.

### Sprint 2 (Structure, 4-6 days)
1. ProductCard reason/caution blocks.
2. Indonesia quick filters + mobile sticky summary.
3. Global outcome buckets + simplified default comparison view.

### Sprint 3 (Optimization, 3-5 days)
1. A/B experiments setup and instrumentation review.
2. Iterate winning copy/layout variants.
3. Cleanup and accessibility pass.

## 10. Definition of Done

Checklist:
1. All three landing pages follow decision-first narrative.
2. No internal/admin jargon appears on public landing copy.
3. Mobile layout remains readable and action-oriented.
4. New UX elements have tracking events.
5. Experiment flags can toggle key variants safely.
6. `pnpm lint`, `pnpm test`, and `pnpm build` pass.

## 11. Strategic Priority Addendum (Article-First)

Positioning update:
- For affiliate SEO business, articles are the main growth engine.
- Landing pages remain supporting layers for trust, routing, and click distribution.

Recommended effort allocation:
1. 60-75%: article production and refresh (intent research, depth, comparison quality, CTA quality).
2. 15-25%: landing page clarity and trust architecture.
3. 10-15%: CRO and experiment loop.

Landing page minimum scope (supporting, not overbuilt):
1. Clear value proposition in 1-2 lines.
2. Fast path to high-intent article clusters.
3. Compact trust proof blocks.
4. Strong internal links to money pages.

Decision rule:
- If there is a tradeoff, prioritize article quality and freshness over landing visual complexity.

## 12. Motion Policy (GSAP)

GSAP is allowed for polish, not for core value delivery.

Use GSAP for:
1. Short hero entrance reveal.
2. Light stagger on card grids.
3. Small scroll cue transitions.

Avoid:
1. Scroll-jacking.
2. Heavy parallax that delays content readability.
3. Long animation chains above-the-fold.

Performance and accessibility constraints:
1. Respect `prefers-reduced-motion`.
2. Keep animation non-blocking for content paint.
3. Load GSAP only in client components that need it (no global blocking load).
4. Validate impact on LCP/CLS after rollout.

Implementation note:
- Motion should improve scanability and trust perception, never become the primary interaction layer.
