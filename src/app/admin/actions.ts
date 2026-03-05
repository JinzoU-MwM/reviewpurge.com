"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  setAdminUserActive,
  upsertAdminUser,
} from "@/lib/db/queries/admin-users";
import {
  createAffiliateProgram,
  setAffiliateProgramHealth,
  setPrimaryAffiliateProgram,
} from "@/lib/db/queries/affiliate-programs";
import {
  createProduct,
  deleteProducts,
  deleteProduct,
  setProductsPublished,
  updateProduct,
} from "@/lib/db/queries/products";
import {
  createArticle,
  deleteArticles,
  deleteArticle,
  setArticlesPublished,
  updateArticle,
} from "@/lib/db/queries/articles";
import { createActivityLog } from "@/lib/db/queries/activity-logs";
import { isAffiliateUrlAllowed } from "@/lib/security/affiliate-url";
import { getCurrentAdminIdentity } from "@/lib/security/admin-auth";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  hasAdminPermission,
  type AdminPermission,
  type AdminRole,
} from "@/lib/security/roles";

const getString = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

function withStatus(returnTo: string, status: string) {
  return `${returnTo}${returnTo.includes("?") ? "&" : "?"}status=${status}`;
}

function parseDatetime(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getActorIdentity() {
  return getCurrentAdminIdentity();
}

async function logDeniedAction(input: {
  actorEmail: string | null;
  returnTo: string;
  reason: "unauthorized" | "rate_limited";
  permission?: AdminPermission;
  retryAfterMs?: number;
}) {
  await createActivityLog({
    actorEmail: input.actorEmail,
    entityType: "system",
    action: input.reason === "unauthorized" ? "admin_action_denied" : "admin_action_rate_limited",
    message:
      input.reason === "unauthorized"
        ? `Denied admin action for "${input.permission ?? "unknown"}" on ${input.returnTo}`
        : `Rate-limited admin action on ${input.returnTo} (retry_after_ms=${input.retryAfterMs ?? 0})`,
    reason: input.reason,
    permission: input.permission ?? null,
    returnTo: input.returnTo,
    retryAfterMs: input.retryAfterMs ?? null,
  });
}

async function logBlockedAffiliateUrl(input: {
  actorEmail: string | null;
  returnTo: string;
  affiliateUrl: string;
}) {
  await createActivityLog({
    actorEmail: input.actorEmail,
    entityType: "system",
    action: "admin_action_blocked_url",
    message: `Blocked affiliate URL by allowlist policy: ${input.affiliateUrl}`,
    reason: "affiliate_url_blocked",
    returnTo: input.returnTo,
  });
}

async function assertPermission(
  actorEmail: string | null,
  role: AdminRole,
  permission: AdminPermission,
  returnTo: string,
) {
  if (!hasAdminPermission(role, permission)) {
    await logDeniedAction({
      actorEmail,
      returnTo,
      reason: "unauthorized",
      permission,
    });
    redirect(withStatus(returnTo, "unauthorized"));
  }
}

async function assertActionRateLimit(actorEmail: string | null, returnTo: string) {
  const max = Number(process.env.ADMIN_ACTION_RATE_LIMIT_MAX ?? "120");
  const windowMs = Number(process.env.ADMIN_ACTION_RATE_LIMIT_WINDOW_MS ?? "60000");
  const result = await checkRateLimit({
    key: `admin_action:${actorEmail ?? "anonymous"}`,
    max: Number.isFinite(max) ? max : 120,
    windowMs: Number.isFinite(windowMs) ? windowMs : 60000,
  });
  if (!result.allowed) {
    await logDeniedAction({
      actorEmail,
      returnTo,
      reason: "rate_limited",
      retryAfterMs: result.retryAfterMs,
    });
    redirect(withStatus(returnTo, "rate_limited"));
  }
}

export async function createProductAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "products:write", returnTo);
  const affiliateUrl = getString(formData, "affiliateUrl");
  if (!isAffiliateUrlAllowed(affiliateUrl)) {
    await logBlockedAffiliateUrl({ actorEmail: actor.email, returnTo, affiliateUrl });
    redirect(withStatus(returnTo, "affiliate_url_blocked"));
  }
  const result = await createProduct({
    name: getString(formData, "name"),
    slug: getString(formData, "slug"),
    description: getString(formData, "description"),
    affiliateUrl,
    categorySlug: getString(formData, "categorySlug"),
    isPublished: getString(formData, "isPublished") === "on",
  });

  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "product",
      action: "create",
      message: `Created product "${getString(formData, "name")}"`,
    });
    revalidatePath("/admin");
    revalidatePath("/indonesia");
    revalidatePath("/global");
    redirect(withStatus(returnTo, "product_created"));
  }

  redirect(withStatus(returnTo, "product_error"));
}

export async function updateProductAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "products:write", returnTo);
  const productId = Number(formData.get("id") ?? 0);
  if (!productId) redirect(withStatus(returnTo, "product_error"));
  const affiliateUrl = getString(formData, "affiliateUrl");
  if (!isAffiliateUrlAllowed(affiliateUrl)) {
    await logBlockedAffiliateUrl({ actorEmail: actor.email, returnTo, affiliateUrl });
    redirect(withStatus(returnTo, "affiliate_url_blocked"));
  }

  const result = await updateProduct({
    id: productId,
    name: getString(formData, "name"),
    slug: getString(formData, "slug"),
    description: getString(formData, "description"),
    affiliateUrl,
    categorySlug: getString(formData, "categorySlug"),
    isPublished: getString(formData, "isPublished") === "on",
  });

  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "product",
      entityId: productId,
      action: "update",
      message: `Updated product "${getString(formData, "name")}"`,
    });
    revalidatePath("/admin");
    revalidatePath("/indonesia");
    revalidatePath("/global");
    redirect(withStatus(returnTo, "product_updated"));
  }

  redirect(withStatus(returnTo, "product_error"));
}

export async function deleteProductAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "products:delete", returnTo);
  const productId = Number(formData.get("id") ?? 0);
  if (!productId) redirect(withStatus(returnTo, "product_error"));

  const result = await deleteProduct(productId);
  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "product",
      entityId: productId,
      action: "delete",
      message: `Deleted product id ${productId}`,
    });
    revalidatePath("/admin");
    revalidatePath("/indonesia");
    revalidatePath("/global");
    redirect(withStatus(returnTo, "product_deleted"));
  }

  redirect(withStatus(returnTo, "product_error"));
}

export async function bulkProductAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "products:bulk", returnTo);
  const actionType = getString(formData, "bulkAction");
  const ids = formData
    .getAll("ids")
    .map((value) => Number(String(value)))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (ids.length === 0) {
    redirect(withStatus(returnTo, "product_bulk_empty"));
  }

  const result =
    actionType === "publish"
      ? await setProductsPublished(ids, true)
      : actionType === "unpublish"
        ? await setProductsPublished(ids, false)
        : actionType === "delete"
          ? await deleteProducts(ids)
          : { ok: false as const };

  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "product",
      action: `bulk_${actionType}`,
      message: `Bulk ${actionType} for ${ids.length} products`,
    });
    revalidatePath("/admin");
    revalidatePath("/indonesia");
    revalidatePath("/global");
    redirect(withStatus(returnTo, "product_bulk_done"));
  }

  redirect(withStatus(returnTo, "product_error"));
}

export async function createArticleAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin/articles";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "articles:write", returnTo);
  const result = await createArticle({
    title: getString(formData, "title"),
    slug: getString(formData, "slug"),
    excerpt: getString(formData, "excerpt"),
    content: getString(formData, "content"),
    metaTitle: getString(formData, "metaTitle") || undefined,
    metaDescription: getString(formData, "metaDescription") || undefined,
    ogImageUrl: getString(formData, "ogImageUrl") || undefined,
    publishAt: parseDatetime(getString(formData, "publishAt")),
    isPublished: getString(formData, "isPublished") === "on",
  });

  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "article",
      action: "create",
      message: `Created article "${getString(formData, "title")}"`,
    });
    revalidatePath("/admin/articles");
    revalidatePath("/blog");
    redirect(withStatus(returnTo, "article_created"));
  }

  redirect(withStatus(returnTo, "article_error"));
}

export async function updateArticleAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin/articles";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "articles:write", returnTo);
  const articleId = Number(formData.get("id") ?? 0);
  if (!articleId) redirect(withStatus(returnTo, "article_error"));

  const result = await updateArticle({
    id: articleId,
    title: getString(formData, "title"),
    slug: getString(formData, "slug"),
    excerpt: getString(formData, "excerpt"),
    content: getString(formData, "content"),
    metaTitle: getString(formData, "metaTitle") || undefined,
    metaDescription: getString(formData, "metaDescription") || undefined,
    ogImageUrl: getString(formData, "ogImageUrl") || undefined,
    publishAt: parseDatetime(getString(formData, "publishAt")),
    isPublished: getString(formData, "isPublished") === "on",
  });

  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "article",
      entityId: articleId,
      action: "update",
      message: `Updated article "${getString(formData, "title")}"`,
    });
    revalidatePath("/admin/articles");
    revalidatePath("/blog");
    revalidatePath(`/blog/${getString(formData, "slug")}`);
    redirect(withStatus(returnTo, "article_updated"));
  }

  redirect(withStatus(returnTo, "article_error"));
}

export async function deleteArticleAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin/articles";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "articles:delete", returnTo);
  const articleId = Number(formData.get("id") ?? 0);
  if (!articleId) redirect(withStatus(returnTo, "article_error"));

  const result = await deleteArticle(articleId);
  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "article",
      entityId: articleId,
      action: "delete",
      message: `Deleted article id ${articleId}`,
    });
    revalidatePath("/admin/articles");
    revalidatePath("/blog");
    redirect(withStatus(returnTo, "article_deleted"));
  }

  redirect(withStatus(returnTo, "article_error"));
}

export async function bulkArticleAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin/articles";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "articles:bulk", returnTo);
  const actionType = getString(formData, "bulkAction");
  const ids = formData
    .getAll("ids")
    .map((value) => Number(String(value)))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (ids.length === 0) {
    redirect(withStatus(returnTo, "article_bulk_empty"));
  }

  const result =
    actionType === "publish"
      ? await setArticlesPublished(ids, true)
      : actionType === "unpublish"
        ? await setArticlesPublished(ids, false)
        : actionType === "delete"
          ? await deleteArticles(ids)
          : { ok: false as const };

  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "article",
      action: `bulk_${actionType}`,
      message: `Bulk ${actionType} for ${ids.length} articles`,
    });
    revalidatePath("/admin/articles");
    revalidatePath("/blog");
    redirect(withStatus(returnTo, "article_bulk_done"));
  }

  redirect(withStatus(returnTo, "article_error"));
}

export async function createAffiliateProgramAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "programs:write", returnTo);
  const productId = Number(formData.get("productId") ?? 0);
  if (!productId) redirect(withStatus(returnTo, "program_error"));

  const affiliateUrl = getString(formData, "affiliateUrl");
  if (!isAffiliateUrlAllowed(affiliateUrl)) {
    await logBlockedAffiliateUrl({ actorEmail: actor.email, returnTo, affiliateUrl });
    redirect(withStatus(returnTo, "affiliate_url_blocked"));
  }

  const result = await createAffiliateProgram({
    productId,
    programName: getString(formData, "programName"),
    region: getString(formData, "region") === "indonesia" ? "indonesia" : "global",
    affiliateUrl,
    isPrimary: getString(formData, "isPrimary") === "on",
    isActive: getString(formData, "isActive") !== "off",
  });

  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "product",
      entityId: productId,
      action: "program_create",
      message: `Added affiliate program for product id ${productId}`,
    });
    revalidatePath("/admin");
    redirect(withStatus(returnTo, "program_created"));
  }

  if (result.error === "DUPLICATE_PROGRAM") {
    redirect(withStatus(returnTo, "program_duplicate"));
  }

  redirect(withStatus(returnTo, "program_error"));
}

export async function setPrimaryAffiliateProgramAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "programs:write", returnTo);
  const productId = Number(formData.get("productId") ?? 0);
  const programId = Number(formData.get("programId") ?? 0);
  if (!productId || !programId) redirect(withStatus(returnTo, "program_error"));

  const result = await setPrimaryAffiliateProgram({ productId, programId });
  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "product",
      entityId: productId,
      action: "program_set_primary",
      message: `Set primary affiliate program ${programId} for product ${productId}`,
    });
    revalidatePath("/admin");
    redirect(withStatus(returnTo, "program_updated"));
  }

  if (result.error === "PRIMARY_CONFLICT") {
    redirect(withStatus(returnTo, "program_conflict"));
  }

  redirect(withStatus(returnTo, "program_error"));
}

export async function checkAffiliateProgramHealthAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "programs:write", returnTo);
  const programId = Number(formData.get("programId") ?? 0);
  const affiliateUrl = getString(formData, "affiliateUrl");
  if (!programId || !affiliateUrl) redirect(withStatus(returnTo, "program_error"));

  let status = "unreachable";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(affiliateUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    status = response.ok ? "healthy" : `http_${response.status}`;
  } catch {
    status = "unreachable";
  }

  const result = await setAffiliateProgramHealth({ id: programId, status });
  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "product",
      action: "program_health_check",
      message: `Checked program ${programId}: ${status}`,
    });
    revalidatePath("/admin");
    redirect(withStatus(returnTo, "program_checked"));
  }

  redirect(withStatus(returnTo, "program_error"));
}

export async function upsertAdminUserAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin/users";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "users:manage", returnTo);

  const role = getString(formData, "role") === "editor" ? "editor" : "owner";
  const result = await upsertAdminUser({
    email: getString(formData, "email"),
    role,
    isActive: getString(formData, "isActive") !== "off",
  });

  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "system",
      action: "admin_user_upsert",
      message: `Upserted admin user ${getString(formData, "email")} as ${role}`,
    });
    revalidatePath("/admin/users");
    redirect(withStatus(returnTo, "user_updated"));
  }

  if (result.error === "LAST_ACTIVE_OWNER") {
    redirect(withStatus(returnTo, "user_last_owner"));
  }

  redirect(withStatus(returnTo, "user_error"));
}

export async function setAdminUserActiveAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/admin/users";
  const actor = await getActorIdentity();
  await assertActionRateLimit(actor.email, returnTo);
  await assertPermission(actor.email, actor.role, "users:manage", returnTo);

  const id = Number(formData.get("id") ?? 0);
  if (!id) redirect(withStatus(returnTo, "user_error"));

  const isActive = getString(formData, "isActive") === "true";
  const result = await setAdminUserActive({ id, isActive });
  if (result.ok) {
    await createActivityLog({
      actorEmail: actor.email,
      entityType: "system",
      entityId: id,
      action: isActive ? "admin_user_activate" : "admin_user_deactivate",
      message: `${isActive ? "Activated" : "Deactivated"} admin user id ${id}`,
    });
    revalidatePath("/admin/users");
    redirect(withStatus(returnTo, "user_updated"));
  }

  if (result.error === "LAST_ACTIVE_OWNER") {
    redirect(withStatus(returnTo, "user_last_owner"));
  }

  redirect(withStatus(returnTo, "user_error"));
}

