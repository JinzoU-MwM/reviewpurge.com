import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import {
  bootstrapOwnersIfEmpty,
  findActiveAdminRoleByEmail,
} from "@/lib/db/queries/admin-users";
import { resolveAdminRoleFromEnv, type AdminRole } from "@/lib/security/roles";

let bootstrapAttempted = false;

function parseOwnerEmailsFromEnv() {
  return (process.env.ADMIN_OWNER_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function ensureAdminBootstrap() {
  if (bootstrapAttempted) return;
  bootstrapAttempted = true;
  try {
    await bootstrapOwnersIfEmpty(parseOwnerEmailsFromEnv());
  } catch {
    // Ignore bootstrap errors to avoid blocking auth flow.
  }
}

export async function getAuthenticatedUserEmail() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email?.trim().toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export async function resolveAdminRoleWithFallback(email?: string | null) {
  await ensureAdminBootstrap();
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return "none" as AdminRole;

  const dbRole = await findActiveAdminRoleByEmail(normalized);
  if (dbRole) return dbRole;

  return resolveAdminRoleFromEnv(normalized);
}

export async function getCurrentAdminIdentity() {
  const email = await getAuthenticatedUserEmail();
  const role = await resolveAdminRoleWithFallback(email);
  return { email, role };
}
