import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const regionEnum = pgEnum("region", ["indonesia", "global"]);
export const adminRoleEnum = pgEnum("admin_role", ["owner", "editor"]);

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  region: regionEnum("region").notNull().default("global"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  rating: integer("rating"),
  imageUrl: text("image_url"),
  isPublished: boolean("is_published").notNull().default(false),
  categoryId: integer("category_id").references(() => categories.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const authors = pgTable("authors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const articles = pgTable("articles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  metaTitle: varchar("meta_title", { length: 200 }),
  metaDescription: varchar("meta_description", { length: 320 }),
  ogImageUrl: text("og_image_url"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  authorId: integer("author_id").references(() => authors.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const clicks = pgTable("clicks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const affiliatePrograms = pgTable(
  "affiliate_programs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id")
      .references(() => products.id)
      .notNull(),
    programName: varchar("program_name", { length: 100 }).notNull(),
    region: regionEnum("region").notNull().default("global"),
    affiliateUrl: text("affiliate_url").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastHealthStatus: varchar("last_health_status", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("affiliate_program_unique_per_product_region_name").on(
      table.productId,
      table.region,
      table.programName,
    ),
    uniqueIndex("affiliate_program_single_primary_per_product")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
  ],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    actorEmail: varchar("actor_email", { length: 200 }),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: integer("entity_id"),
    action: varchar("action", { length: 80 }).notNull(),
    message: text("message").notNull(),
    reason: varchar("reason", { length: 50 }),
    permission: varchar("permission", { length: 80 }),
    returnTo: varchar("return_to", { length: 300 }),
    retryAfterMs: integer("retry_after_ms"),
    attemptCount: integer("attempt_count"),
    webhookStatusCode: integer("webhook_status_code"),
    webhookLatencyMs: integer("webhook_latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_logs_created_at_idx").on(table.createdAt),
    index("activity_logs_action_created_at_idx").on(table.action, table.createdAt),
  ],
);

export const adminUsers = pgTable("admin_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  role: adminRoleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  clicks: many(clicks),
  affiliatePrograms: many(affiliatePrograms),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  author: one(authors, {
    fields: [articles.authorId],
    references: [authors.id],
  }),
}));

export const clicksRelations = relations(clicks, ({ one }) => ({
  product: one(products, {
    fields: [clicks.productId],
    references: [products.id],
  }),
}));

export const affiliateProgramsRelations = relations(
  affiliatePrograms,
  ({ one }) => ({
    product: one(products, {
      fields: [affiliatePrograms.productId],
      references: [products.id],
    }),
  }),
);
