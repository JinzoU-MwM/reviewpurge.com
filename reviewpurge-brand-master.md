# ReviewPurge Brand Master Document

## 1. Executive Snapshot

### Product
- **Name:** ReviewPurge
- **Type:** Affiliate product discovery platform
- **Coverage:** Indonesia commerce + global software/tools
- **Core model:** discovery content + affiliate conversion + secure admin ops

### One-line definition
- ReviewPurge membantu user memilih produk dan tools terbaik lewat kurasi independen, konten jelas, dan jalur affiliate yang terstruktur.

### Primary business goal
- Membangun mesin pertumbuhan berbasis SEO + conversion affiliate dengan fondasi trust yang kuat.

## 2. Product Core

### What it is
- Platform discovery untuk:
1. Kurasi produk Indonesia (high-intent buyer market)
2. Kurasi tools global (AI, SaaS, productivity, marketing)
3. Artikel SEO long-form
4. Redirect affiliate terukur (`/go/[slug]`)
5. Admin workflow yang aman dan observable

### Why it exists
- Mengurangi "noise affiliate" dan memberi keputusan beli yang lebih percaya diri.
- Menjembatani konten (intent) ke conversion (action) tanpa friksi.

## 3. Audience

### Segment A: Indonesia Commerce Buyers
- Pola: fast purchase, marketplace-oriented
- Intent: produk viral, rekomendasi praktis, harga/value

### Segment B: Global Tool Buyers
- Pola: research-oriented, compare-first
- Intent: AI tools, software stack, ROI and workflow fit

## 4. Jobs To Be Done
- "Saya mau keputusan beli lebih cepat tapi tetap yakin."
- "Saya butuh rekomendasi yang relevan, bukan list spam."
- "Saya ingin konten yang benar-benar membantu memilih."

## 5. Monetization Model

### Current
- Affiliate commissions (Indonesia + global programs)
- AdSense-friendly content inventory

### Future
- Sponsored listing
- Premium placement
- Monetized newsletter/products intel

## 6. Product Surface Map

### Public
- `/`
- `/indonesia`
- `/global`
- `/blog`
- `/blog/[slug]`
- `/about`
- `/contact`
- `/privacy-policy`
- `/terms-of-service`
- `/affiliate-disclosure`

### Conversion
- `/go/[slug]` (affiliate redirect + click tracking)

### Admin
- `/admin` (products + affiliate programs)
- `/admin/articles`
- `/admin/users` (owner only)
- `/admin/logs` (owner only)

## 7. Trust, Security, Operational Rigor

### Trust pillars
- Independent review stance
- Affiliate disclosure explicit
- Editorial structure and scheduled publishing

### Security/ops pillars
- RBAC (`owner` / `editor`) with DB-backed roles
- Activity logs and audit trail
- Admin action rate limiting
- Cron auth (`CRON_SECRET`) + optional IP allowlist
- Security alerts with webhook routing (`warn` / `critical`)
- Delivery retry/backoff, HMAC signing, latency and failure observability

### Brand implication
- Ini bukan "affiliate page farm"; ini platform dengan operational discipline.

## 8. Positioning Matrix

### Direction A: Trusted Buyer Guide
- **Statement:** Platform rekomendasi produk/tools yang mengutamakan kejelasan dan transparansi.
- **Promise:** "Beli lebih yakin, tanpa noise."
- **Strength:** luas dan aman untuk growth awal.
- **Risk:** bisa generik jika visual dan tone tidak distinctive.

### Direction B: Conversion Intelligence Layer
- **Statement:** Mesin discovery + conversion untuk audience affiliate modern.
- **Promise:** "Dari discovery ke conversion, tanpa friksi."
- **Strength:** lebih premium dan defensible.
- **Risk:** bisa terlalu teknis untuk audience consumer jika copy tidak dibalance.

### Direction C: Curated Commerce Authority
- **Statement:** Otoritas kurasi lintas region dengan standar editorial tegas.
- **Promise:** "Kurasi ketat. Rekomendasi yang layak dibeli."
- **Strength:** authority jangka panjang.
- **Risk:** perlu disiplin kualitas konten konsisten.

### Recommended blend
- **70% Direction A + 30% Direction B**
- Alasan: paling seimbang antara trust mass-market dan diferensiasi operasional.

## 9. Messaging House

### Brand promise
- Rekomendasi yang jelas, terverifikasi, dan benar-benar membantu keputusan beli.

### Pillar 1: Clarity
- Ringkas, kontekstual, actionable
- No jargon inflation

### Pillar 2: Trust
- Transparansi affiliate
- Review independen
- Update akurasi berkala

### Pillar 3: Operational Rigor
- Secure admin workflows
- Logged actions
- Observable system behavior

## 10. Tagline and Headline Bank

### Tagline candidates
- Trusted picks, zero noise.
- Keputusan beli lebih yakin.
- Kurasi ketat, pilihan tepat.
- Discover better, convert smarter.
- Search less, choose better.
- Rekomendasi yang layak dibeli.

### Hero headline candidates
- Kurasi Produk yang Bikin Keputusan Lebih Yakin
- Platform discovery produk yang fokus pada kualitas, bukan kebisingan
- Review independen untuk Indonesia dan global tools
- Dari konten SEO sampai klik affiliate, semuanya terhubung
- Built for trust, optimized for conversion

## 11. Tone of Voice

### Voice traits
- Clear
- Grounded
- Practical
- Confident (not loud)

### Do
- Jelaskan manfaat nyata
- Sertakan konteks pemakaian
- Gunakan bahasa keputusan
- Jaga consistency dengan disclosure

### Don't
- Overclaim tanpa dasar
- Clickbait tone
- Ambiguous copy
- Janji hasil finansial yang tidak realistis

## 12. Frontend Visual Identity (From Current Codebase)

### Typography System
- **Primary UI:** `Space Grotesk`
- **Display/Editorial:** `Fraunces`
- **Technical/Meta:** `JetBrains Mono`

### Public Color System
- `--background`: `#f5f6f1`
- `--foreground`: `#0f1d19`
- `--card`: `#ffffff`
- `--line`: `#d0dbd3`
- `--muted`: `#8a9e94`
- `--primary`: `#0b7c6f`
- `--primary-light`: `#0fa897`
- `--primary-strong`: `#075d53`
- `--accent`: `#d88c24`
- `--accent-light`: `#f0a93e`

### Admin Color System (Dark)
- `--admin-bg`: `#0c1017`
- `--admin-surface`: `#151b23`
- `--admin-surface-elevated`: `#1c232d`
- `--admin-border`: `#2d3748`
- `--admin-border-subtle`: `#232b38`
- `--admin-text`: `#e2e8f0`
- `--admin-text-muted`: `#8b9cb3`
- `--admin-text-dim`: `#5c6b7f`
- `--admin-success`: `#10b981`
- `--admin-warning`: `#f59e0b`
- `--admin-danger`: `#ef4444`
- `--admin-info`: `#3b82f6`

### Surface and style language
- Rounded-heavy radius system (`lg`, `xl`, `2xl`)
- Glass-card + soft shadows
- Emerald hero gradients with amber highlights
- Overall vibe: modern, premium-practical, trust-first

## 13. Logo Brainstorm Brief

### Context fit requirements
- Harus terlihat kuat di:
1. Light background (`#f5f6f1`)
2. Dark admin background (`#0c1017`)
- Harus kompatibel dengan pasangan warna inti:
1. Emerald `#0b7c6f`
2. Amber `#d88c24`
- Harus tetap terbaca pada ukuran kecil (favicon, top nav, admin sidebar).

### Symbol territories
- **Curation / Purge:** filter, funnel, refined signal
- **Trust / Verification:** check, shield hint
- **Discovery / Direction:** compass, pointer, spark

### Visual direction options
- **Option 1: Editorial Premium**
  - elegant wordmark with refined serif influence
- **Option 2: Tech-Trust Hybrid**
  - geometric `RP` monogram + clean wordmark
- **Option 3: Signal Mark**
  - abstract filtered-wave/signal icon + compact lockup

### Do / Don't
- **Do:** build full lockup + icon-only + monochrome system
- **Do:** prioritize contrast, especially in dark admin context
- **Don't:** over-detailed thin lines
- **Don't:** coupon/discount visual cliches
- **Don't:** playful mascot style that conflicts with trust/rigor positioning

## 14. Copy Examples (Brand-Ready)

### Homepage hero sample
- **Headline:** Kurasi Produk yang Bikin Keputusan Lebih Yakin
- **Subheadline:** ReviewPurge menggabungkan kurasi independen, konten SEO, dan jalur affiliate terstruktur untuk Indonesia dan global.
- **CTA:** Lihat Pilihan Indonesia / Explore Global Tools

### Product card sample
- **Label:** Pilihan Terverifikasi
- **Body:** Ringkas, relevan, dan fokus pada value.
- **CTA:** Lihat Offer

### Blog section sample
- **Headline:** Insight yang Membantu Kamu Memilih
- **Body:** Artikel long-form berbasis use case, bukan list generik.
- **CTA:** Baca Artikel Terbaru

## 15. Story Draft (Short Form)
- ReviewPurge dibangun untuk menjawab masalah klasik di ruang affiliate: terlalu banyak noise, terlalu sedikit kejelasan. Platform ini menggabungkan kurasi lintas region, transparansi affiliate, dan standar operasional yang rapi agar keputusan beli terasa lebih yakin dan lebih cepat.

## 16. Fast Branding Experiments (2 Weeks)

### Week 1
- Test 2 headline variants + 2 CTA pairs
- Test trust labels ("Independent Review", "Affiliate Disclosure")

### Week 2
- Test 3 tagline candidates di homepage dan `/indonesia`
- Measure:
1. CTR ke `/go/[slug]`
2. Scroll depth
3. Article-to-product click

## 17. Evaluation Checklist For Branding Concepts
- Apakah brand terasa trusted tanpa jadi membosankan?
- Apakah visual terlihat premium tapi tetap accessible?
- Apakah logo terbaca jelas pada ukuran kecil?
- Apakah tone copy konsisten antara public pages dan admin pages?
- Apakah konsep menghindari stereotype affiliate spam?

## 18. Prompt Template (Copy-Paste Ke Agent Branding/Logo)

Use this brief:

- Build a full brand concept for "ReviewPurge".
- Core personality: trustworthy, clear, premium-practical, operationally rigorous.
- Positioning baseline: trusted buyer guide with a conversion-intelligence edge.
- Audience: Indonesia commerce buyers + global software/tool buyers.
- Color anchors:
  - primary emerald `#0b7c6f`
  - accent amber `#d88c24`
  - light bg `#f5f6f1`
  - dark admin bg `#0c1017`
- Typography context:
  - Space Grotesk (UI)
  - Fraunces (display/editorial)
  - JetBrains Mono (technical/meta)
- Deliver:
1. 3 logo concepts (with rationale)
2. full lockup, icon-only, monochrome variants
3. tagline shortlist (15)
4. homepage hero copy set (5 variants)
5. mini style guide (palette, type hierarchy, spacing mood)
- Avoid coupon/spam aesthetics and generic growth-hack visual language.

## 19. Optional Naming Extensions
- ReviewPurge Picks
- ReviewPurge Signals
- ReviewPurge Labs
- ReviewPurge Verified
- ReviewPurge Index

## 20. Recommended Starter Combo
- **Primary tagline:** Trusted picks, zero noise.
- **Secondary line:** Review independen untuk keputusan beli yang lebih yakin.
- **Narrative angle:** trust-first affiliate platform with operational rigor.

## 21. Brainstorm Integration (From `brainstorm.md`)

### A. Journey Split By Intent (Indonesia vs Global)
- **Objective:** jangan campur intent belanja cepat dengan intent evaluasi software.
- **Execution direction:**
1. Homepage: gate/tab jelas sejak hero (`Indonesia Commerce` vs `Global Software`).
2. `/indonesia`: fokus komparasi harga, sinyal pembelian cepat, CTA kuat.
3. `/global`: fokus tabel fitur, ROI framing, use-case based comparisons.
- **Success signal:** peningkatan CTR dari homepage ke vertical page dan peningkatan `go/[slug]` click-through per segment.

### B. Public Review Changelog Metadata
- **Objective:** bukti konkret klaim trust/transparency.
- **Execution direction:**
1. Tambahkan metadata artikel: `Reviewed by`, `Last updated`, `Price checked at`.
2. Tampilkan metadata ini di artikel detail (di atas konten dan/atau footer artikel).
3. Siapkan sumber data di schema/article model untuk update berkala.
- **Success signal:** time-on-page naik, bounce rate turun, dan trust cue lebih kuat untuk user baru.

### C. RP Score (Transparent Curation Metric)
- **Objective:** visual proof dari proses "purge/filter" khas ReviewPurge.
- **Execution direction:**
1. Definisikan formula sederhana 0-100 (contoh dimensi: kualitas, reputasi vendor, harga/value).
2. Tampilkan breakdown skor singkat di product card/detail.
3. Pastikan skor punya keterangan metodologi singkat agar tidak terasa arbitrer.
- **Success signal:** increase engagement pada section scoring dan kenaikan conversion di produk dengan score tinggi.

### D. Smart `/go/[slug]` Redirect Architecture
- **Objective:** conversion-safe redirect dengan data capture yang rapi.
- **Execution direction:**
1. Redirect tetap super cepat (minimize processing before 302/307).
2. Capture click analytics yang ringan dan non-blocking.
3. Sisipkan UTM params dinamis (source/medium/campaign) dengan rules yang aman.
4. Monitoring latency endpoint sebagai KPI conversion protection.
- **Success signal:** redirect latency stabil rendah + kualitas data attribution meningkat.

## 22. Suggested Implementation Order (Pragmatic)

### Execution Rules
- Satu ticket harus punya owner utama dan acceptance criteria yang bisa diuji.
- Semua perubahan route/API wajib logging event minimal untuk observability.
- Validasi tiap sprint: `pnpm lint`, `pnpm test`, `pnpm build`.

### Sprint 1 (Fast Impact)

#### TKT-S1-01: Homepage Intent Gate
- **FE:** Tambah gate/tab intent di hero (`Indonesia Commerce` dan `Global Software`) + CTA jelas ke `/indonesia` dan `/global`.
- **BE:** Simpan pilihan intent terakhir (cookie/session ringan) untuk personalisasi entry berikutnya.
- **DB:** Tidak wajib; opsional tambah event logging table jika belum ada event collector.
- **Acceptance Criteria:**
1. User bisa memilih intent dalam 1 klik dari fold pertama.
2. CTA dan copy di homepage berubah sesuai intent aktif.
3. Event `intent_selected` tercatat dengan timestamp dan source page.

#### TKT-S1-02: Public Review Changelog Metadata
- **FE:** Render metadata artikel: `Reviewed by`, `Last updated`, `Price checked at` di detail artikel.
- **BE:** Extend loader/query artikel agar field metadata ikut dikirim ke UI.
- **DB:** Tambah kolom metadata di entitas artikel jika belum ada (`reviewed_by`, `reviewed_at`, `price_checked_at`).
- **Acceptance Criteria:**
1. Semua artikel published menampilkan minimal `Last updated`.
2. Artikel dengan status komersial menampilkan `Price checked at`.
3. Field metadata editable dari admin article form.

#### TKT-S1-03: Baseline Measurement Dashboard
- **FE:** Tambah panel metrik di admin untuk CTR intent dan latency `/go/[slug]`.
- **BE:** Buat endpoint agregasi metrik 24h/7d.
- **DB:** Simpan click event dan redirect latency (`redirect_ms`) jika belum tersedia.
- **Acceptance Criteria:**
1. Dashboard menampilkan CTR per segment (`indonesia`, `global`).
2. Ada p50/p95 redirect latency dengan filter window waktu.
3. Data refresh tanpa blocking halaman admin utama.

### Sprint 2 (Differentiation)

#### TKT-S2-01: RP Score Model v1
- **FE:** Form input komponen score di admin product editor.
- **BE:** Implement service kalkulasi RP Score 0-100 berbasis 3 dimensi (quality, seller reputation, value).
- **DB:** Tambah kolom komponen score atau tabel score terstruktur.
- **Acceptance Criteria:**
1. Score selalu terhitung konsisten setelah save product.
2. Nilai score tervalidasi dalam range 0-100.
3. Perubahan komponen score tercatat di activity log.

#### TKT-S2-02: RP Score Display + Methodology
- **FE:** Tampilkan RP Score dan breakdown singkat di product card/detail.
- **BE:** Expose score + breakdown ke endpoint/listing.
- **DB:** Tidak ada perubahan tambahan jika TKT-S2-01 selesai.
- **Acceptance Criteria:**
1. Score tampil konsisten di listing dan detail.
2. Ada tooltip/section "Cara penilaian" dengan metodologi ringkas.
3. Produk tanpa score tidak menampilkan angka dummy.

#### TKT-S2-03: Smart `/go/[slug]` UTM Logic
- **FE:** Tidak wajib; opsional halaman admin konfigurasi campaign defaults.
- **BE:** Tambah dynamic UTM injector dengan allowlist query params aman.
- **DB:** Opsional tabel rule UTM bila ingin rule per campaign/sumber trafik.
- **Acceptance Criteria:**
1. Redirect tetap cepat (target p95 tetap rendah dan terpantau).
2. UTM parameter terpasang sesuai source/medium/campaign rules.
3. Param sensitif/ilegal dibersihkan sebelum redirect.

### Sprint 3 (Optimization)

#### TKT-S3-01: Indonesia Comparison Module
- **FE:** Komponen komparasi fokus harga, promo, kecepatan beli, dan CTA marketplace.
- **BE:** Feed data offer terstruktur untuk komparasi cepat.
- **DB:** Normalisasi field offer agar bisa disortir/filter.
- **Acceptance Criteria:**
1. Halaman `/indonesia` punya komparasi yang bisa dipindai < 10 detik.
2. User bisa sort minimal by `price` dan `value`.
3. CTR ke `/go/[slug]` dari `/indonesia` naik vs baseline sprint 1.

#### TKT-S3-02: Global Comparison Module
- **FE:** Tabel fitur + ROI framing + use-case selector.
- **BE:** Agregasi atribut tool agar konsisten antar kategori.
- **DB:** Tambah/rapikan taxonomy fitur untuk global tools.
- **Acceptance Criteria:**
1. Halaman `/global` menampilkan komparasi fitur lintas tool.
2. Ada indikator use-case fit (misalnya startup, solo creator, SMB).
3. Engagement section comparison naik vs baseline sprint 1.

#### TKT-S3-03: A/B Trust Copy and Score Label Tests
- **FE:** Variasi copy trust cues dan label score (`Verified`, `RP Score`, dst).
- **BE:** Assignment variant + experiment result tracking.
- **DB:** Simpan assignment dan conversion result per variant.
- **Acceptance Criteria:**
1. Eksperimen berjalan tanpa flicker berlebihan.
2. Variant assignment deterministic per user/session.
3. Laporan winner/loser tersedia untuk keputusan roll-out.

### Definition of Done (Per Ticket)
1. Scope FE/BE/DB selesai sesuai acceptance criteria.
2. Tidak ada regression kritis di route publik/admin.
3. Lulus verifikasi: `pnpm lint`, `pnpm test`, `pnpm build`.

## 23. Jira/Trello Ready Ticket Cards

### Card Format Template
- **Title:** `[ID] Ringkas hasil yang diinginkan`
- **Type:** `Epic` | `Story` | `Task` | `Bug`
- **Priority:** `P0` | `P1` | `P2`
- **Estimate:** `S` | `M` | `L` (atau story points)
- **Sprint:** `Sprint 1` | `Sprint 2` | `Sprint 3`
- **Owner:** `FE` | `BE` | `Fullstack`
- **Labels:** `frontend`, `backend`, `analytics`, `seo`, `admin`, `conversion`, `trust`
- **Dependencies:** ID ticket yang harus selesai lebih dulu
- **Description:** hasil bisnis + konteks user
- **Technical Scope:** batasan implementasi yang wajib
- **Acceptance Criteria:**
1. Kriteria lolos #1
2. Kriteria lolos #2
3. Kriteria lolos #3
- **QA Checklist:**
1. `pnpm lint` lulus
2. `pnpm test` lulus
3. `pnpm build` lulus

### EPIC-01: Intent-Based Discovery Experience
- **Type:** `Epic`
- **Priority:** `P0`
- **Estimate:** `L`
- **Sprint:** `Sprint 1-3`
- **Owner:** `Fullstack`
- **Labels:** `frontend`, `conversion`, `analytics`
- **Dependencies:** none
- **Description:** Pisahkan journey user Indonesia vs Global agar intent lebih jelas dan CTR naik.
- **Success Metric:** CTR homepage ke vertical page naik, CTR ke `/go/[slug]` naik per segment.

### EPIC-02: Trust Transparency Layer
- **Type:** `Epic`
- **Priority:** `P0`
- **Estimate:** `L`
- **Sprint:** `Sprint 1-3`
- **Owner:** `Fullstack`
- **Labels:** `trust`, `seo`, `content`, `admin`
- **Dependencies:** none
- **Description:** Jadikan trust sebagai fitur produk melalui metadata review dan RP Score yang transparan.
- **Success Metric:** time-on-page naik, bounce turun, conversion dari halaman review naik.

### EPIC-03: Conversion-Safe Redirect Intelligence
- **Type:** `Epic`
- **Priority:** `P0`
- **Estimate:** `M`
- **Sprint:** `Sprint 1-3`
- **Owner:** `BE`
- **Labels:** `backend`, `conversion`, `analytics`, `performance`
- **Dependencies:** none
- **Description:** Buat `/go/[slug]` cepat, terukur, dan aman untuk attribution.
- **Success Metric:** p95 redirect latency rendah dan stabil, kualitas UTM attribution meningkat.

### TKT-S1-01: Homepage Intent Gate
- **Type:** `Story`
- **Priority:** `P0`
- **Estimate:** `M`
- **Sprint:** `Sprint 1`
- **Owner:** `FE`
- **Labels:** `frontend`, `conversion`, `analytics`
- **Dependencies:** none
- **Description:** Tambahkan gate intent di hero agar user memilih jalur yang relevan sejak awal.
- **Technical Scope:** tab/switch intent, state persistence ringan, CTA dinamis.
- **Acceptance Criteria:**
1. User dapat pilih intent dalam 1 klik dari fold pertama.
2. Copy dan CTA menyesuaikan intent aktif.
3. Event `intent_selected` tercatat.

### TKT-S1-02: Review Changelog Metadata
- **Type:** `Story`
- **Priority:** `P0`
- **Estimate:** `M`
- **Sprint:** `Sprint 1`
- **Owner:** `Fullstack`
- **Labels:** `frontend`, `backend`, `trust`, `content`
- **Dependencies:** none
- **Description:** Tampilkan metadata review sebagai bukti konten terawat.
- **Technical Scope:** field metadata di model artikel + render di article detail + admin edit form.
- **Acceptance Criteria:**
1. Artikel published menampilkan `Last updated`.
2. Artikel komersial menampilkan `Price checked at`.
3. Metadata editable dari admin dan tersimpan valid.

### TKT-S1-03: Baseline Metrics Panel
- **Type:** `Task`
- **Priority:** `P1`
- **Estimate:** `M`
- **Sprint:** `Sprint 1`
- **Owner:** `BE`
- **Labels:** `admin`, `analytics`, `performance`
- **Dependencies:** TKT-S1-01
- **Description:** Sediakan baseline metrik untuk mengukur dampak perubahan journey.
- **Technical Scope:** endpoint agregasi metrik + panel admin CTR segment + p50/p95 redirect latency.
- **Acceptance Criteria:**
1. CTR segment tampil untuk 24h dan 7d.
2. Latency `/go/[slug]` tampil minimal p50/p95.
3. Data dapat di-refresh tanpa blocking halaman.

### TKT-S2-01: RP Score Engine v1
- **Type:** `Story`
- **Priority:** `P0`
- **Estimate:** `M`
- **Sprint:** `Sprint 2`
- **Owner:** `BE`
- **Labels:** `backend`, `trust`, `scoring`
- **Dependencies:** TKT-S1-02
- **Description:** Bangun mesin skor kurasi sederhana dan konsisten.
- **Technical Scope:** formula 0-100 berbasis quality, reputation, value + validasi range + logging perubahan.
- **Acceptance Criteria:**
1. Score dihitung otomatis setelah save.
2. Tidak ada score di luar range 0-100.
3. Perubahan komponen score tercatat di activity log.

### TKT-S2-02: RP Score UI + Methodology
- **Type:** `Story`
- **Priority:** `P1`
- **Estimate:** `M`
- **Sprint:** `Sprint 2`
- **Owner:** `FE`
- **Labels:** `frontend`, `trust`, `conversion`
- **Dependencies:** TKT-S2-01
- **Description:** Tampilkan score dan alasan agar user paham logika kurasi.
- **Technical Scope:** badge score, breakdown, dan block metodologi singkat pada listing/detail.
- **Acceptance Criteria:**
1. Score konsisten di card dan detail.
2. Metodologi tampil jelas dan ringkas.
3. Produk tanpa score tidak menampilkan placeholder menyesatkan.

### TKT-S2-03: Smart UTM Redirect Rules
- **Type:** `Task`
- **Priority:** `P0`
- **Estimate:** `M`
- **Sprint:** `Sprint 2`
- **Owner:** `BE`
- **Labels:** `backend`, `conversion`, `security`, `analytics`
- **Dependencies:** TKT-S1-03
- **Description:** Tambahkan UTM dinamis aman tanpa mengorbankan kecepatan redirect.
- **Technical Scope:** UTM rule injector, param allowlist, sanitasi param, monitoring latency.
- **Acceptance Criteria:**
1. UTM dipasang sesuai rule source/medium/campaign.
2. Param tidak valid dibersihkan.
3. p95 latency tidak regresi dari baseline sprint 1.

### TKT-S3-01: Indonesia Comparison Blocks
- **Type:** `Story`
- **Priority:** `P1`
- **Estimate:** `M`
- **Sprint:** `Sprint 3`
- **Owner:** `FE`
- **Labels:** `frontend`, `conversion`, `indonesia`
- **Dependencies:** TKT-S1-01, TKT-S1-03
- **Description:** Tingkatkan kejelasan komparasi beli cepat untuk pasar Indonesia.
- **Technical Scope:** modul komparasi harga/promo/value + sort dasar + CTA marketplace.
- **Acceptance Criteria:**
1. Komparasi bisa dipindai cepat untuk keputusan beli.
2. Sort minimal by `price` dan `value` tersedia.
3. CTR `/go/[slug]` dari `/indonesia` naik vs baseline.

### TKT-S3-02: Global Feature/ROI Comparison
- **Type:** `Story`
- **Priority:** `P1`
- **Estimate:** `M`
- **Sprint:** `Sprint 3`
- **Owner:** `Fullstack`
- **Labels:** `frontend`, `backend`, `global`, `conversion`
- **Dependencies:** TKT-S1-01, TKT-S1-03
- **Description:** Sajikan perbandingan tool global yang lebih research-friendly.
- **Technical Scope:** table fitur, ROI hints, use-case selector, data mapping atribut lintas tool.
- **Acceptance Criteria:**
1. Komparasi fitur lintas tool tampil konsisten.
2. User bisa melihat rekomendasi berbasis use case.
3. Engagement section komparasi naik vs baseline.

### TKT-S3-03: Trust Copy and Score A/B Test
- **Type:** `Task`
- **Priority:** `P2`
- **Estimate:** `M`
- **Sprint:** `Sprint 3`
- **Owner:** `BE`
- **Labels:** `experiment`, `analytics`, `conversion`, `trust`
- **Dependencies:** TKT-S2-02
- **Description:** Uji copy trust cue dan label score untuk cari varian terbaik.
- **Technical Scope:** assignment variant deterministic + event tracking + report winner.
- **Acceptance Criteria:**
1. Assignment variant stabil per session/user.
2. Tracking conversion per variant tersedia.
3. Winner report tersedia untuk keputusan roll-out.

### Trello Lists Recommendation
- **List 1:** `Backlog`
- **List 2:** `Ready Sprint 1`
- **List 3:** `In Progress`
- **List 4:** `QA/Review`
- **List 5:** `Done`

### Jira Workflow Recommendation
- **Status:** `Backlog` -> `Selected for Development` -> `In Progress` -> `In Review` -> `QA Passed` -> `Done`
- **WIP Rule:** maksimal 2 ticket aktif per engineer untuk menjaga flow.
