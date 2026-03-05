"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/lib/db/queries/products";
import {
  createArticle,
  deleteArticle,
  updateArticle,
} from "@/lib/db/queries/articles";

const getString = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function createProductAction(formData: FormData) {
  const result = await createProduct({
    name: getString(formData, "name"),
    slug: getString(formData, "slug"),
    description: getString(formData, "description"),
    affiliateUrl: getString(formData, "affiliateUrl"),
    categorySlug: getString(formData, "categorySlug"),
    isPublished: getString(formData, "isPublished") === "on",
  });

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/indonesia");
    revalidatePath("/global");
  }
}

export async function updateProductAction(formData: FormData) {
  const productId = Number(formData.get("id") ?? 0);
  if (!productId) return;

  const result = await updateProduct({
    id: productId,
    name: getString(formData, "name"),
    slug: getString(formData, "slug"),
    description: getString(formData, "description"),
    affiliateUrl: getString(formData, "affiliateUrl"),
    categorySlug: getString(formData, "categorySlug"),
    isPublished: getString(formData, "isPublished") === "on",
  });

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/indonesia");
    revalidatePath("/global");
  }
}

export async function deleteProductAction(formData: FormData) {
  const productId = Number(formData.get("id") ?? 0);
  if (!productId) return;

  const result = await deleteProduct(productId);
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/indonesia");
    revalidatePath("/global");
  }
}

export async function createArticleAction(formData: FormData) {
  const result = await createArticle({
    title: getString(formData, "title"),
    slug: getString(formData, "slug"),
    excerpt: getString(formData, "excerpt"),
    content: getString(formData, "content"),
    isPublished: getString(formData, "isPublished") === "on",
  });

  if (result.ok) {
    revalidatePath("/admin/articles");
    revalidatePath("/blog");
  }
}

export async function updateArticleAction(formData: FormData) {
  const articleId = Number(formData.get("id") ?? 0);
  if (!articleId) return;

  const result = await updateArticle({
    id: articleId,
    title: getString(formData, "title"),
    slug: getString(formData, "slug"),
    excerpt: getString(formData, "excerpt"),
    content: getString(formData, "content"),
    isPublished: getString(formData, "isPublished") === "on",
  });

  if (result.ok) {
    revalidatePath("/admin/articles");
    revalidatePath("/blog");
    revalidatePath(`/blog/${getString(formData, "slug")}`);
  }
}

export async function deleteArticleAction(formData: FormData) {
  const articleId = Number(formData.get("id") ?? 0);
  if (!articleId) return;

  const result = await deleteArticle(articleId);
  if (result.ok) {
    revalidatePath("/admin/articles");
    revalidatePath("/blog");
  }
}
