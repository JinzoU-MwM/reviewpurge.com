import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import {
  adminUsers,
  affiliatePrograms,
  articles,
  categories,
  products,
} from "../src/lib/db/schema";

function loadEnvFromLocalFile() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFromLocalFile();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is missing.");

  const sql = postgres(databaseUrl, { prepare: false });
  const db = drizzle(sql, { schema });

  const ownerEmails = (process.env.ADMIN_OWNER_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const editorEmails = (process.env.ADMIN_EDITOR_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  for (const email of ownerEmails) {
    await db
      .insert(adminUsers)
      .values({ email, role: "owner", isActive: true, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: adminUsers.email,
        set: { role: "owner", isActive: true, updatedAt: new Date() },
      });
  }
  for (const email of editorEmails) {
    await db
      .insert(adminUsers)
      .values({ email, role: "editor", isActive: true, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: adminUsers.email,
        set: { role: "editor", isActive: true, updatedAt: new Date() },
      });
  }

  const categorySeeds = [
    { name: "Produk TikTok", slug: "id-produk-tiktok", region: "indonesia" as const },
    { name: "Produk Shopee", slug: "id-produk-shopee", region: "indonesia" as const },
    { name: "AI Tools", slug: "global-ai-tools", region: "global" as const },
    { name: "Marketing Tools", slug: "global-marketing-tools", region: "global" as const },
  ];

  for (const category of categorySeeds) {
    await db
      .insert(categories)
      .values(category)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: category.name, region: category.region },
      });
  }

  const idTikTok = await db.query.categories.findFirst({
    where: eq(categories.slug, "id-produk-tiktok"),
    columns: { id: true },
  });
  const idGlobalAi = await db.query.categories.findFirst({
    where: eq(categories.slug, "global-ai-tools"),
    columns: { id: true },
  });

  if (!idTikTok?.id || !idGlobalAi?.id) {
    throw new Error("Failed to resolve category ids for seed.");
  }

  const productSeeds = [
    {
      name: "Ring Light Creator Kit",
      slug: "ring-light-creator-kit",
      description: "Ring light dengan tripod fleksibel untuk konten TikTok.",
      affiliateUrl: "https://example.com/affiliate/ring-light",
      categoryId: idTikTok.id,
      isPublished: true,
    },
    {
      name: "Notion AI",
      slug: "notion-ai",
      description: "AI workspace untuk produktivitas dan kolaborasi tim.",
      affiliateUrl: "https://example.com/affiliate/notion-ai",
      categoryId: idGlobalAi.id,
      isPublished: true,
    },
    {
      name: "Grammarly Premium",
      slug: "grammarly-premium",
      description: "Asisten writing berbasis AI untuk email dan dokumen.",
      affiliateUrl: "https://example.com/affiliate/grammarly",
      categoryId: idGlobalAi.id,
      isPublished: true,
    },
  ];

  for (const product of productSeeds) {
    await db
      .insert(products)
      .values(product)
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: product.name,
          description: product.description,
          affiliateUrl: product.affiliateUrl,
          categoryId: product.categoryId,
          isPublished: product.isPublished,
        },
      });
  }

  const notionProduct = await db.query.products.findFirst({
    where: eq(products.slug, "notion-ai"),
    columns: { id: true },
  });
  const ringLightProduct = await db.query.products.findFirst({
    where: eq(products.slug, "ring-light-creator-kit"),
    columns: { id: true },
  });

  if (notionProduct?.id) {
    const exists = await db.query.affiliatePrograms.findFirst({
      where: and(
        eq(affiliatePrograms.productId, notionProduct.id),
        eq(affiliatePrograms.programName, "Notion Partner"),
      ),
      columns: { id: true },
    });
    if (!exists) {
      await db.insert(affiliatePrograms).values({
        productId: notionProduct.id,
        programName: "Notion Partner",
        region: "global",
        affiliateUrl: "https://example.com/affiliate/notion-ai",
        isPrimary: true,
        isActive: true,
      });
    }
  }

  if (ringLightProduct?.id) {
    const exists = await db.query.affiliatePrograms.findFirst({
      where: and(
        eq(affiliatePrograms.productId, ringLightProduct.id),
        eq(affiliatePrograms.programName, "Shopee Affiliate"),
      ),
      columns: { id: true },
    });
    if (!exists) {
      await db.insert(affiliatePrograms).values({
        productId: ringLightProduct.id,
        programName: "Shopee Affiliate",
        region: "indonesia",
        affiliateUrl: "https://example.com/affiliate/ring-light-shopee",
        isPrimary: true,
        isActive: true,
      });
    }
  }

  const articleSeeds = [
    {
      title: "10 Produk Viral TikTok 2026",
      slug: "10-produk-viral-tiktok-2026",
      excerpt: "Rekomendasi produk viral yang paling banyak dicari tahun ini.",
      metaTitle: "10 Produk Viral TikTok 2026 - ReviewPurge",
      metaDescription:
        "Daftar produk TikTok viral 2026 beserta tips memilih produk terbaik.",
      content:
        "Daftar produk viral TikTok 2026 lengkap dengan pertimbangan harga, kualitas, dan link pembelian.",
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      title: "Best AI Tools for Business",
      slug: "best-ai-tools-for-business",
      excerpt: "Kurasi tools AI yang paling relevan untuk bisnis kecil dan menengah.",
      metaTitle: "Best AI Tools for Business (2026)",
      metaDescription:
        "Pilihan AI tools untuk writing, automation, dan operations bisnis.",
      content:
        "Artikel ini membahas AI tools untuk writing, customer support, automation, dan analytics.",
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      title: "Best Email Marketing Tools",
      slug: "best-email-marketing-tools",
      excerpt: "Perbandingan platform email marketing populer berdasarkan fitur dan pricing.",
      metaTitle: "Best Email Marketing Tools Comparison",
      metaDescription:
        "Bandingkan tools email marketing terbaik untuk UMKM dan startup.",
      content:
        "Kami bandingkan deliverability, automation flow, dan kemudahan setup untuk tiap platform.",
      isPublished: true,
      publishedAt: new Date(),
    },
  ];

  for (const article of articleSeeds) {
    await db
      .insert(articles)
      .values(article)
      .onConflictDoUpdate({
        target: articles.slug,
        set: {
          title: article.title,
          excerpt: article.excerpt,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          content: article.content,
          isPublished: article.isPublished,
          publishedAt: article.publishedAt,
          updatedAt: new Date(),
        },
      });
  }

  await sql.end();
  console.log("Seed completed: categories, products, and articles are upserted.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
