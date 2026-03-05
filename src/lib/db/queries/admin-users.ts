import { count, desc } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { adminUsers } from "@/lib/db/schema";
import type { AdminRole } from "@/lib/security/roles";

export async function findActiveAdminRoleByEmail(email: string) {
  const db = getDb();
  if (!db) return null;

  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const row = await db.query.adminUsers.findFirst({
      where: and(eq(adminUsers.email, normalized), eq(adminUsers.isActive, true)),
      columns: { role: true },
    });
    return (row?.role ?? null) as AdminRole | null;
  } catch {
    return null;
  }
}

export async function upsertAdminUser(input: {
  email: string;
  role: "owner" | "editor";
  isActive?: boolean;
}) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  const normalized = input.email.trim().toLowerCase();
  if (!normalized) return { ok: false as const, error: "Email is empty." };
  const nextIsActive = input.isActive ?? true;

  try {
    const existing = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.email, normalized),
      columns: { id: true, role: true, isActive: true },
    });

    if (
      existing?.role === "owner" &&
      existing.isActive &&
      (input.role !== "owner" || !nextIsActive)
    ) {
      const ownerRows = await db
        .select({ value: count() })
        .from(adminUsers)
        .where(and(eq(adminUsers.role, "owner"), eq(adminUsers.isActive, true)));
      const activeOwners = Number(ownerRows[0]?.value ?? 0);
      if (activeOwners <= 1) {
        return { ok: false as const, error: "LAST_ACTIVE_OWNER" };
      }
    }

    await db
      .insert(adminUsers)
      .values({
        email: normalized,
        role: input.role,
        isActive: nextIsActive,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adminUsers.email,
        set: {
          role: input.role,
          isActive: nextIsActive,
          updatedAt: new Date(),
        },
      });

    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to upsert admin user." };
  }
}

export async function countActiveAdminUsers() {
  const db = getDb();
  if (!db) return 0;

  try {
    const rows = await db
      .select({ value: count() })
      .from(adminUsers)
      .where(eq(adminUsers.isActive, true));
    return Number(rows[0]?.value ?? 0);
  } catch {
    return 0;
  }
}

export async function bootstrapOwnersIfEmpty(ownerEmails: string[]) {
  const db = getDb();
  if (!db) return { ok: false as const, inserted: 0 };

  const normalized = ownerEmails.map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return { ok: false as const, inserted: 0 };

  const activeCount = await countActiveAdminUsers();
  if (activeCount > 0) return { ok: true as const, inserted: 0 };

  let inserted = 0;
  for (const email of normalized) {
    const result = await upsertAdminUser({ email, role: "owner", isActive: true });
    if (result.ok) inserted += 1;
  }

  return { ok: true as const, inserted };
}

export async function listAdminUsers() {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.query.adminUsers.findMany({
      columns: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: desc(adminUsers.createdAt),
    });
  } catch {
    return [];
  }
}

export async function setAdminUserActive(input: { id: number; isActive: boolean }) {
  const db = getDb();
  if (!db) return { ok: false as const, error: "DATABASE_URL is not set." };

  try {
    if (!input.isActive) {
      const current = await db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, input.id),
        columns: { role: true, isActive: true },
      });

      if (current?.role === "owner" && current.isActive) {
        const ownerRows = await db
          .select({ value: count() })
          .from(adminUsers)
          .where(and(eq(adminUsers.role, "owner"), eq(adminUsers.isActive, true)));
        const activeOwners = Number(ownerRows[0]?.value ?? 0);
        if (activeOwners <= 1) {
          return { ok: false as const, error: "LAST_ACTIVE_OWNER" };
        }
      }
    }

    await db
      .update(adminUsers)
      .set({ isActive: input.isActive, updatedAt: new Date() })
      .where(eq(adminUsers.id, input.id));
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Failed to update admin user." };
  }
}
