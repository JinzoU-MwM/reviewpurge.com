import { and, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityLogs } from "@/lib/db/schema";

type LogInput = {
  actorEmail: string | null;
  entityType: "product" | "article" | "system";
  entityId?: number | null;
  action: string;
  message: string;
  reason?: string | null;
  permission?: string | null;
  returnTo?: string | null;
  retryAfterMs?: number | null;
  attemptCount?: number | null;
  webhookStatusCode?: number | null;
  webhookLatencyMs?: number | null;
};

export async function createActivityLog(input: LogInput) {
  const db = getDb();
  if (!db) return;

  try {
    await db.insert(activityLogs).values({
      actorEmail: input.actorEmail,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      action: input.action,
      message: input.message,
      reason: input.reason ?? null,
      permission: input.permission ?? null,
      returnTo: input.returnTo ?? null,
      retryAfterMs: input.retryAfterMs ?? null,
      attemptCount: input.attemptCount ?? null,
      webhookStatusCode: input.webhookStatusCode ?? null,
      webhookLatencyMs: input.webhookLatencyMs ?? null,
    });
  } catch {
    // Ignore logging failures to avoid blocking admin workflows.
  }
}

export async function listRecentActivityLogs(limit = 20) {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.query.activityLogs.findMany({
      columns: {
        id: true,
        actorEmail: true,
        entityType: true,
        entityId: true,
        action: true,
        message: true,
        reason: true,
        permission: true,
        returnTo: true,
        retryAfterMs: true,
        attemptCount: true,
        webhookStatusCode: true,
        webhookLatencyMs: true,
        createdAt: true,
      },
      orderBy: desc(activityLogs.createdAt),
      limit: Math.max(1, limit),
    });
  } catch {
    return [];
  }
}

export async function getLatestActivityLogByAction(action: string) {
  const db = getDb();
  if (!db) return null;

  try {
    return await db.query.activityLogs.findFirst({
      where: eq(activityLogs.action, action),
      columns: {
        id: true,
        createdAt: true,
        message: true,
      },
      orderBy: desc(activityLogs.createdAt),
    });
  } catch {
    return null;
  }
}

export async function getLatestActivityLogByActionAndReason(
  action: string,
  reason: string,
) {
  const db = getDb();
  if (!db) return null;

  try {
    return await db.query.activityLogs.findFirst({
      where: and(eq(activityLogs.action, action), eq(activityLogs.reason, reason)),
      columns: {
        id: true,
        reason: true,
        createdAt: true,
        message: true,
      },
      orderBy: desc(activityLogs.createdAt),
    });
  } catch {
    return null;
  }
}

export async function getLatestSecurityAlertStatus() {
  const db = getDb();
  if (!db) return { lastOutcome: null, lastSent: null };

  try {
    const rows = await db.query.activityLogs.findMany({
      where: inArray(activityLogs.action, [
        "security_alert_sent",
        "security_alert_failed",
        "security_alert_skipped",
      ]),
      columns: {
        id: true,
        action: true,
        reason: true,
        message: true,
        attemptCount: true,
        webhookStatusCode: true,
        webhookLatencyMs: true,
        createdAt: true,
      },
      orderBy: desc(activityLogs.createdAt),
      limit: 20,
    });

    const lastOutcome = rows[0] ?? null;
    const lastSent = rows.find((row) => row.action === "security_alert_sent") ?? null;
    return { lastOutcome, lastSent };
  } catch {
    return { lastOutcome: null, lastSent: null };
  }
}

export async function getRecentSecurityAlertSentReasons(limit: number) {
  const db = getDb();
  if (!db) return [] as string[];

  const safeLimit = Math.max(1, Math.min(20, Math.trunc(limit)));
  try {
    const rows = await db.query.activityLogs.findMany({
      where: eq(activityLogs.action, "security_alert_sent"),
      columns: {
        reason: true,
      },
      orderBy: desc(activityLogs.createdAt),
      limit: safeLimit,
    });
    return rows.map((row) => row.reason ?? "");
  } catch {
    return [] as string[];
  }
}

export async function listActivityLogsPaginated(input: {
  page: number;
  pageSize: number;
  q?: string;
  entityType?: "all" | "product" | "article" | "system";
  action?: string;
  reason?: string;
  minAttemptCount?: number;
  minWebhookLatencyMs?: number;
  webhookStatusCode?: number;
}) {
  const db = getDb();
  if (!db) {
    return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
  }

  const query = input.q?.trim() ?? "";
  const searchClause = query
    ? or(
        ilike(activityLogs.message, `%${query}%`),
        ilike(activityLogs.actorEmail, `%${query}%`),
        ilike(activityLogs.reason, `%${query}%`),
        ilike(activityLogs.permission, `%${query}%`),
        ilike(activityLogs.returnTo, `%${query}%`),
      )
    : undefined;

  const entityType = input.entityType ?? "all";
  const entityClause =
    entityType !== "all" ? eq(activityLogs.entityType, entityType) : undefined;

  const action = input.action?.trim() ?? "";
  const actionClause = action ? eq(activityLogs.action, action) : undefined;
  const reason = input.reason?.trim() ?? "";
  const reasonClause = reason ? eq(activityLogs.reason, reason) : undefined;
  const minAttemptCount =
    Number.isFinite(input.minAttemptCount) && (input.minAttemptCount ?? 0) > 0
      ? Math.trunc(input.minAttemptCount as number)
      : 0;
  const minAttemptClause =
    minAttemptCount > 0 ? gte(activityLogs.attemptCount, minAttemptCount) : undefined;
  const minWebhookLatencyMs =
    Number.isFinite(input.minWebhookLatencyMs) && (input.minWebhookLatencyMs ?? 0) > 0
      ? Math.trunc(input.minWebhookLatencyMs as number)
      : 0;
  const minLatencyClause =
    minWebhookLatencyMs > 0
      ? gte(activityLogs.webhookLatencyMs, minWebhookLatencyMs)
      : undefined;
  const webhookStatusCode =
    Number.isFinite(input.webhookStatusCode) && (input.webhookStatusCode ?? 0) > 0
      ? Math.trunc(input.webhookStatusCode as number)
      : 0;
  const statusCodeClause =
    webhookStatusCode > 0 ? eq(activityLogs.webhookStatusCode, webhookStatusCode) : undefined;

  const clauses = [
    searchClause,
    entityClause,
    actionClause,
    reasonClause,
    minAttemptClause,
    minLatencyClause,
    statusCodeClause,
  ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause));
  const whereClause = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);

  const safePage = Math.max(1, input.page);
  const safePageSize = Math.max(1, input.pageSize);
  const offset = (safePage - 1) * safePageSize;

  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(whereClause);
    const total = Number(countRows[0]?.count ?? 0);

    const items = await db.query.activityLogs.findMany({
      where: whereClause,
      columns: {
        id: true,
        actorEmail: true,
        entityType: true,
        entityId: true,
        action: true,
        message: true,
        reason: true,
        permission: true,
        returnTo: true,
        retryAfterMs: true,
        attemptCount: true,
        webhookStatusCode: true,
        webhookLatencyMs: true,
        createdAt: true,
      },
      orderBy: desc(activityLogs.createdAt),
      limit: safePageSize,
      offset,
    });

    return { items, total, page: safePage, pageSize: safePageSize };
  } catch {
    return { items: [], total: 0, page: safePage, pageSize: safePageSize };
  }
}

export async function getActivityLogSecurityStats() {
  const db = getDb();
  const empty = {
    denied24h: 0,
    denied7d: 0,
    rateLimited24h: 0,
    rateLimited7d: 0,
    blockedUrl24h: 0,
    blockedUrl7d: 0,
  };
  if (!db) return empty;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const rows = await db
      .select({
        denied24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'admin_action_denied' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
        denied7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'admin_action_denied' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
        rateLimited24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'admin_action_rate_limited' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
        rateLimited7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'admin_action_rate_limited' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
        blockedUrl24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'admin_action_blocked_url' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
        blockedUrl7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'admin_action_blocked_url' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
      })
      .from(activityLogs);

    const row = rows[0];
    if (!row) return empty;
    return {
      denied24h: Number(row.denied24h ?? 0),
      denied7d: Number(row.denied7d ?? 0),
      rateLimited24h: Number(row.rateLimited24h ?? 0),
      rateLimited7d: Number(row.rateLimited7d ?? 0),
      blockedUrl24h: Number(row.blockedUrl24h ?? 0),
      blockedUrl7d: Number(row.blockedUrl7d ?? 0),
    };
  } catch {
    return empty;
  }
}

export async function getActivityLogSecurityTrend(days = 7) {
  const db = getDb();
  if (!db) return [];

  const safeDays = Math.max(1, Math.min(30, Math.trunc(days)));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  try {
    const rows = await db.execute(sql`
      select
        date_trunc('day', ${activityLogs.createdAt})::date as day,
        coalesce(sum(case when ${activityLogs.action} = 'admin_action_denied' then 1 else 0 end), 0) as denied,
        coalesce(sum(case when ${activityLogs.action} = 'admin_action_rate_limited' then 1 else 0 end), 0) as rate_limited,
        coalesce(sum(case when ${activityLogs.action} = 'admin_action_blocked_url' then 1 else 0 end), 0) as blocked_url
      from ${activityLogs}
      where ${activityLogs.createdAt} >= ${since}
      group by 1
      order by 1 desc
    `);

    return rows.map((row) => ({
      day: String((row as { day: unknown }).day),
      denied: Number((row as { denied: unknown }).denied ?? 0),
      rateLimited: Number((row as { rate_limited: unknown }).rate_limited ?? 0),
      blockedUrl: Number((row as { blocked_url: unknown }).blocked_url ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getSecurityAlertDeliveryStats() {
  const db = getDb();
  const empty = {
    sent24h: 0,
    sent7d: 0,
    failed24h: 0,
    failed7d: 0,
    skipped24h: 0,
    skipped7d: 0,
  };
  if (!db) return empty;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const rows = await db
      .select({
        sent24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
        sent7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
        failed24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_failed' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
        failed7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_failed' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
        skipped24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_skipped' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
        skipped7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_skipped' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
      })
      .from(activityLogs);

    const row = rows[0];
    if (!row) return empty;
    return {
      sent24h: Number(row.sent24h ?? 0),
      sent7d: Number(row.sent7d ?? 0),
      failed24h: Number(row.failed24h ?? 0),
      failed7d: Number(row.failed7d ?? 0),
      skipped24h: Number(row.skipped24h ?? 0),
      skipped7d: Number(row.skipped7d ?? 0),
    };
  } catch {
    return empty;
  }
}

export async function getSecurityAlertDeliveryTrend(days = 7) {
  const db = getDb();
  if (!db) return [];

  const safeDays = Math.max(1, Math.min(30, Math.trunc(days)));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  try {
    const rows = await db.execute(sql`
      select
        date_trunc('day', ${activityLogs.createdAt})::date as day,
        coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' then 1 else 0 end), 0) as sent,
        coalesce(sum(case when ${activityLogs.action} = 'security_alert_failed' then 1 else 0 end), 0) as failed,
        coalesce(sum(case when ${activityLogs.action} = 'security_alert_skipped' then 1 else 0 end), 0) as skipped
      from ${activityLogs}
      where ${activityLogs.createdAt} >= ${since}
      group by 1
      order by 1 desc
    `);

    return rows.map((row) => ({
      day: String((row as { day: unknown }).day),
      sent: Number((row as { sent: unknown }).sent ?? 0),
      failed: Number((row as { failed: unknown }).failed ?? 0),
      skipped: Number((row as { skipped: unknown }).skipped ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getSecurityAlertLatencyPercentiles() {
  const db = getDb();
  const empty = {
    p50_24h: null as number | null,
    p95_24h: null as number | null,
    p99_24h: null as number | null,
    p50_7d: null as number | null,
    p95_7d: null as number | null,
    p99_7d: null as number | null,
  };
  if (!db) return empty;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const rows = await db.execute(sql`
      select
        percentile_cont(0.50) within group (order by webhook_latency_ms) filter (
          where action in ('security_alert_sent', 'security_alert_failed')
            and webhook_latency_ms is not null
            and created_at >= ${since24h}
        ) as p50_24h,
        percentile_cont(0.95) within group (order by webhook_latency_ms) filter (
          where action in ('security_alert_sent', 'security_alert_failed')
            and webhook_latency_ms is not null
            and created_at >= ${since24h}
        ) as p95_24h,
        percentile_cont(0.99) within group (order by webhook_latency_ms) filter (
          where action in ('security_alert_sent', 'security_alert_failed')
            and webhook_latency_ms is not null
            and created_at >= ${since24h}
        ) as p99_24h,
        percentile_cont(0.50) within group (order by webhook_latency_ms) filter (
          where action in ('security_alert_sent', 'security_alert_failed')
            and webhook_latency_ms is not null
            and created_at >= ${since7d}
        ) as p50_7d,
        percentile_cont(0.95) within group (order by webhook_latency_ms) filter (
          where action in ('security_alert_sent', 'security_alert_failed')
            and webhook_latency_ms is not null
            and created_at >= ${since7d}
        ) as p95_7d,
        percentile_cont(0.99) within group (order by webhook_latency_ms) filter (
          where action in ('security_alert_sent', 'security_alert_failed')
            and webhook_latency_ms is not null
            and created_at >= ${since7d}
        ) as p99_7d
      from activity_logs
    `);

    const row = rows[0] as
      | {
          p50_24h: number | null;
          p95_24h: number | null;
          p99_24h: number | null;
          p50_7d: number | null;
          p95_7d: number | null;
          p99_7d: number | null;
        }
      | undefined;
    if (!row) return empty;

    return {
      p50_24h: row.p50_24h == null ? null : Number(row.p50_24h),
      p95_24h: row.p95_24h == null ? null : Number(row.p95_24h),
      p99_24h: row.p99_24h == null ? null : Number(row.p99_24h),
      p50_7d: row.p50_7d == null ? null : Number(row.p50_7d),
      p95_7d: row.p95_7d == null ? null : Number(row.p95_7d),
      p99_7d: row.p99_7d == null ? null : Number(row.p99_7d),
    };
  } catch {
    return empty;
  }
}
