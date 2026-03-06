import { and, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { activityLogs, products } from "@/lib/db/schema";

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
  entityId?: number;
  action?: string;
  reason?: string;
  permission?: string;
  returnTo?: string;
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
  const entityId =
    Number.isFinite(input.entityId) && (input.entityId ?? 0) > 0
      ? Math.trunc(input.entityId as number)
      : 0;
  const entityIdClause = entityId > 0 ? eq(activityLogs.entityId, entityId) : undefined;
  const reason = input.reason?.trim() ?? "";
  const reasonClause = reason ? eq(activityLogs.reason, reason) : undefined;
  const permission = input.permission?.trim() ?? "";
  const permissionClause = permission ? eq(activityLogs.permission, permission) : undefined;
  const returnTo = input.returnTo?.trim() ?? "";
  const returnToClause = returnTo ? eq(activityLogs.returnTo, returnTo) : undefined;
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
    entityIdClause,
    reasonClause,
    permissionClause,
    returnToClause,
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

type SecurityAlertSeveritySummary = {
  warnSent24h: number;
  warnSent7d: number;
  criticalSent24h: number;
  criticalSent7d: number;
  lastWarnSentAt: Date | null;
  lastCriticalSentAt: Date | null;
};

export async function getSecurityAlertSeveritySummary(): Promise<SecurityAlertSeveritySummary> {
  const db = getDb();
  const empty: SecurityAlertSeveritySummary = {
    warnSent24h: 0,
    warnSent7d: 0,
    criticalSent24h: 0,
    criticalSent7d: 0,
    lastWarnSentAt: null,
    lastCriticalSentAt: null,
  };
  if (!db) return empty;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const [countRows, lastWarn, lastCritical] = await Promise.all([
      db
        .select({
          warnSent24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' and ${activityLogs.reason} = 'threshold_breach_warn' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
          warnSent7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' and ${activityLogs.reason} = 'threshold_breach_warn' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
          criticalSent24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' and ${activityLogs.reason} = 'threshold_breach_critical' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
          criticalSent7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' and ${activityLogs.reason} = 'threshold_breach_critical' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
        })
        .from(activityLogs),
      db.query.activityLogs.findFirst({
        where: and(
          eq(activityLogs.action, "security_alert_sent"),
          eq(activityLogs.reason, "threshold_breach_warn"),
        ),
        columns: {
          createdAt: true,
        },
        orderBy: desc(activityLogs.createdAt),
      }),
      db.query.activityLogs.findFirst({
        where: and(
          eq(activityLogs.action, "security_alert_sent"),
          eq(activityLogs.reason, "threshold_breach_critical"),
        ),
        columns: {
          createdAt: true,
        },
        orderBy: desc(activityLogs.createdAt),
      }),
    ]);

    const row = countRows[0];
    if (!row) return empty;

    return {
      warnSent24h: Number(row.warnSent24h ?? 0),
      warnSent7d: Number(row.warnSent7d ?? 0),
      criticalSent24h: Number(row.criticalSent24h ?? 0),
      criticalSent7d: Number(row.criticalSent7d ?? 0),
      lastWarnSentAt: lastWarn?.createdAt ?? null,
      lastCriticalSentAt: lastCritical?.createdAt ?? null,
    };
  } catch {
    return empty;
  }
}

export async function listActivityLogsForExport(input: {
  q?: string;
  entityType?: "all" | "product" | "article" | "system";
  entityId?: number;
  action?: string;
  reason?: string;
  permission?: string;
  returnTo?: string;
  minAttemptCount?: number;
  minWebhookLatencyMs?: number;
  webhookStatusCode?: number;
  limit?: number;
}) {
  const db = getDb();
  if (!db) return [];

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
  const entityId =
    Number.isFinite(input.entityId) && (input.entityId ?? 0) > 0
      ? Math.trunc(input.entityId as number)
      : 0;
  const entityIdClause = entityId > 0 ? eq(activityLogs.entityId, entityId) : undefined;
  const reason = input.reason?.trim() ?? "";
  const reasonClause = reason ? eq(activityLogs.reason, reason) : undefined;
  const permission = input.permission?.trim() ?? "";
  const permissionClause = permission ? eq(activityLogs.permission, permission) : undefined;
  const returnTo = input.returnTo?.trim() ?? "";
  const returnToClause = returnTo ? eq(activityLogs.returnTo, returnTo) : undefined;
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
    entityIdClause,
    reasonClause,
    permissionClause,
    returnToClause,
    minAttemptClause,
    minLatencyClause,
    statusCodeClause,
  ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause));
  const whereClause =
    clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);

  const safeLimit = Math.max(1, Math.min(10_000, Math.trunc(input.limit ?? 2_000)));
  try {
    return await db.query.activityLogs.findMany({
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
      limit: safeLimit,
    });
  } catch {
    return [];
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

export async function getSecurityAlertSeverityTrend(days = 7) {
  const db = getDb();
  if (!db) return [];

  const safeDays = Math.max(1, Math.min(30, Math.trunc(days)));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  try {
    const rows = await db.execute(sql`
      select
        date_trunc('day', ${activityLogs.createdAt})::date as day,
        coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' and ${activityLogs.reason} = 'threshold_breach_warn' then 1 else 0 end), 0) as warn_sent,
        coalesce(sum(case when ${activityLogs.action} = 'security_alert_sent' and ${activityLogs.reason} = 'threshold_breach_critical' then 1 else 0 end), 0) as critical_sent
      from ${activityLogs}
      where ${activityLogs.createdAt} >= ${since}
      group by 1
      order by 1 desc
    `);

    return rows.map((row) => ({
      day: String((row as { day: unknown }).day),
      warnSent: Number((row as { warn_sent: unknown }).warn_sent ?? 0),
      criticalSent: Number((row as { critical_sent: unknown }).critical_sent ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function getLatestActivityLogByActionAndEntityId(
  action: string,
  entityId: number,
) {
  const db = getDb();
  if (!db) return null;

  try {
    return await db.query.activityLogs.findFirst({
      where: and(eq(activityLogs.action, action), eq(activityLogs.entityId, entityId)),
      columns: {
        id: true,
        entityId: true,
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

type AffiliateHealthCronSnapshot = {
  checked: number;
  healthy: number;
  unhealthy: number;
  recovered: number;
  degraded: number;
};

type AffiliateHealthMonitoringSummary = {
  runs24h: number;
  runs7d: number;
  checks24h: number;
  healthy24h: number;
  unhealthy24h: number;
  recovered24h: number;
  recovered7d: number;
  degraded24h: number;
  degraded7d: number;
  successRate24h: number;
  lastRunAt: Date | null;
  lastRunMode: "dry_run" | "live" | null;
  lastRun: AffiliateHealthCronSnapshot | null;
};

const emptyAffiliateHealthMonitoringSummary: AffiliateHealthMonitoringSummary = {
  runs24h: 0,
  runs7d: 0,
  checks24h: 0,
  healthy24h: 0,
  unhealthy24h: 0,
  recovered24h: 0,
  recovered7d: 0,
  degraded24h: 0,
  degraded7d: 0,
  successRate24h: 0,
  lastRunAt: null,
  lastRunMode: null,
  lastRun: null,
};

function parseAffiliateHealthCronMessage(message: string): AffiliateHealthCronSnapshot | null {
  const match = message.match(
    /checked=(\d+), healthy=(\d+), unhealthy=(\d+), recovered=(\d+), degraded=(\d+)/i,
  );
  if (!match) return null;

  const checked = Number(match[1] ?? 0);
  const healthy = Number(match[2] ?? 0);
  const unhealthy = Number(match[3] ?? 0);
  const recovered = Number(match[4] ?? 0);
  const degraded = Number(match[5] ?? 0);

  if (![checked, healthy, unhealthy, recovered, degraded].every(Number.isFinite)) {
    return null;
  }

  return { checked, healthy, unhealthy, recovered, degraded };
}

export async function getAffiliateHealthMonitoringSummary(): Promise<AffiliateHealthMonitoringSummary> {
  const db = getDb();
  if (!db) return emptyAffiliateHealthMonitoringSummary;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const [cronRows, transitionRows] = await Promise.all([
      db.query.activityLogs.findMany({
        where: and(
          eq(activityLogs.action, "affiliate_link_health_cron"),
          gte(activityLogs.createdAt, since7d),
        ),
        columns: {
          id: true,
          reason: true,
          message: true,
          createdAt: true,
        },
        orderBy: desc(activityLogs.createdAt),
        limit: 300,
      }),
      db
        .select({
          recovered24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'affiliate_link_recovered' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
          recovered7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'affiliate_link_recovered' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
          degraded24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'affiliate_link_unhealthy' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
          degraded7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'affiliate_link_unhealthy' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
        })
        .from(activityLogs),
    ]);

    let runs24h = 0;
    let checks24h = 0;
    let healthy24h = 0;
    let unhealthy24h = 0;

    for (const row of cronRows) {
      const snapshot = parseAffiliateHealthCronMessage(row.message);
      if (!snapshot) continue;
      if (row.createdAt >= since24h) {
        runs24h += 1;
        checks24h += snapshot.checked;
        healthy24h += snapshot.healthy;
        unhealthy24h += snapshot.unhealthy;
      }
    }

    const latest = cronRows[0];
    const latestSnapshot = latest
      ? parseAffiliateHealthCronMessage(latest.message)
      : null;
    const transition = transitionRows[0] as
      | {
          recovered24h: unknown;
          recovered7d: unknown;
          degraded24h: unknown;
          degraded7d: unknown;
        }
      | undefined;

    const recovered24h = Number(transition?.recovered24h ?? 0);
    const recovered7d = Number(transition?.recovered7d ?? 0);
    const degraded24h = Number(transition?.degraded24h ?? 0);
    const degraded7d = Number(transition?.degraded7d ?? 0);

    return {
      runs24h,
      runs7d: cronRows.length,
      checks24h,
      healthy24h,
      unhealthy24h,
      recovered24h,
      recovered7d,
      degraded24h,
      degraded7d,
      successRate24h: checks24h > 0 ? (healthy24h / checks24h) * 100 : 0,
      lastRunAt: latest?.createdAt ?? null,
      lastRunMode:
        latest?.reason === "dry_run"
          ? "dry_run"
          : latest?.reason === "live"
            ? "live"
            : null,
      lastRun: latestSnapshot,
    };
  } catch {
    return emptyAffiliateHealthMonitoringSummary;
  }
}

type AffiliateRedirectProgramStat = {
  programKey: string;
  redirects24h: number;
  redirects7d: number;
  avgLatency24h: number | null;
};

type AffiliateRedirectSelectionSummary = {
  total24h: number;
  preferred24h: number;
  rotated24h: number;
  primary24h: number;
  fallback24h: number;
  rotatedShare24h: number;
};

type AffiliateRedirectProgramStats = {
  programs: AffiliateRedirectProgramStat[];
  selection: AffiliateRedirectSelectionSummary;
};

type AffiliateRedirectRotationSkewAlert = {
  productId: number;
  productSlug: string | null;
  totalRotated24h: number;
  dominantProgramKey: string;
  dominantCount: number;
  dominantSharePct: number;
  distribution: Array<{
    programKey: string;
    count: number;
    sharePct: number;
  }>;
};

type AffiliateRedirectRotationSkewSummary = {
  totalRotated24h: number;
  thresholdSharePct: number;
  minEventsPerProduct: number;
  flaggedProducts: AffiliateRedirectRotationSkewAlert[];
};

type AffiliateRotationGuardSummary = {
  recommendations24h: number;
  recommendations7d: number;
  guardRuns24h: number;
  guardRuns7d: number;
  lastGuardRunAt: Date | null;
  lastGuardRunMode: "dry_run" | "live" | null;
  lastGuardMessage: string | null;
  lastRecommendationAt: Date | null;
};

export async function getAffiliateRedirectProgramStats(
  limit = 8,
): Promise<AffiliateRedirectProgramStats> {
  const db = getDb();
  const empty: AffiliateRedirectProgramStats = {
    programs: [],
    selection: {
      total24h: 0,
      preferred24h: 0,
      rotated24h: 0,
      primary24h: 0,
      fallback24h: 0,
      rotatedShare24h: 0,
    },
  };
  if (!db) return empty;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const safeLimit = Math.max(1, Math.min(20, Math.trunc(limit)));

  try {
    const [programRows, selectionRows] = await Promise.all([
      db.execute(sql`
        select
          coalesce(nullif(permission, ''), 'default') as program_key,
          coalesce(sum(case when created_at >= ${since24h} then 1 else 0 end), 0) as redirects_24h,
          coalesce(sum(case when created_at >= ${since7d} then 1 else 0 end), 0) as redirects_7d,
          avg(case when created_at >= ${since24h} then webhook_latency_ms end) as avg_latency_24h
        from activity_logs
        where action = 'affiliate_redirect'
        group by 1
        order by redirects_24h desc, redirects_7d desc
        limit ${safeLimit}
      `),
      db.execute(sql`
        select
          coalesce(sum(case when created_at >= ${since24h} then 1 else 0 end), 0) as total_24h,
          coalesce(sum(case when return_to = 'preferred' and created_at >= ${since24h} then 1 else 0 end), 0) as preferred_24h,
          coalesce(sum(case when return_to = 'rotated' and created_at >= ${since24h} then 1 else 0 end), 0) as rotated_24h,
          coalesce(sum(case when return_to = 'primary' and created_at >= ${since24h} then 1 else 0 end), 0) as primary_24h,
          coalesce(sum(case when return_to = 'fallback' and created_at >= ${since24h} then 1 else 0 end), 0) as fallback_24h
        from activity_logs
        where action = 'affiliate_redirect'
      `),
    ]);

    const programs = (programRows as Array<Record<string, unknown>>).map((row) => ({
      programKey: String(row.program_key ?? "default"),
      redirects24h: Number(row.redirects_24h ?? 0),
      redirects7d: Number(row.redirects_7d ?? 0),
      avgLatency24h:
        row.avg_latency_24h == null ? null : Number(row.avg_latency_24h ?? null),
    }));

    const selection = (selectionRows[0] ?? {}) as Record<string, unknown>;
    const total24h = Number(selection.total_24h ?? 0);
    const rotated24h = Number(selection.rotated_24h ?? 0);

    return {
      programs,
      selection: {
        total24h,
        preferred24h: Number(selection.preferred_24h ?? 0),
        rotated24h,
        primary24h: Number(selection.primary_24h ?? 0),
        fallback24h: Number(selection.fallback_24h ?? 0),
        rotatedShare24h: total24h > 0 ? (rotated24h / total24h) * 100 : 0,
      },
    };
  } catch {
    return empty;
  }
}

export async function getAffiliateRedirectRotationSkewSummary(input?: {
  thresholdSharePct?: number;
  minEventsPerProduct?: number;
  maxFlaggedProducts?: number;
}): Promise<AffiliateRedirectRotationSkewSummary> {
  const db = getDb();
  const thresholdSharePct =
    Number.isFinite(input?.thresholdSharePct) && (input?.thresholdSharePct ?? 0) > 0
      ? Number(input?.thresholdSharePct)
      : 65;
  const minEventsPerProduct =
    Number.isFinite(input?.minEventsPerProduct) && (input?.minEventsPerProduct ?? 0) > 0
      ? Math.trunc(Number(input?.minEventsPerProduct))
      : 20;
  const maxFlaggedProducts =
    Number.isFinite(input?.maxFlaggedProducts) && (input?.maxFlaggedProducts ?? 0) > 0
      ? Math.trunc(Number(input?.maxFlaggedProducts))
      : 8;
  const empty: AffiliateRedirectRotationSkewSummary = {
    totalRotated24h: 0,
    thresholdSharePct,
    minEventsPerProduct,
    flaggedProducts: [],
  };
  if (!db) return empty;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const rows = await db.execute(sql`
      select
        ${activityLogs.entityId} as product_id,
        ${products.slug} as product_slug,
        coalesce(nullif(${activityLogs.permission}, ''), 'unknown') as program_key,
        count(*) as redirect_count
      from ${activityLogs}
      left join ${products} on ${activityLogs.entityId} = ${products.id}
      where ${activityLogs.action} = 'affiliate_redirect'
        and ${activityLogs.returnTo} = 'rotated'
        and ${activityLogs.createdAt} >= ${since24h}
        and ${activityLogs.entityId} is not null
      group by ${activityLogs.entityId}, ${products.slug}, program_key
      order by ${activityLogs.entityId} asc, redirect_count desc
    `);

    const grouped = new Map<
      number,
      {
        productSlug: string | null;
        items: Array<{ programKey: string; count: number }>;
      }
    >();
    let totalRotated24h = 0;
    for (const row of rows as Array<Record<string, unknown>>) {
      const productId = Number(row.product_id ?? 0);
      if (!Number.isFinite(productId) || productId <= 0) continue;
      const productSlug =
        row.product_slug == null ? null : String(row.product_slug);
      const programKey = String(row.program_key ?? "unknown");
      const count = Number(row.redirect_count ?? 0);
      if (!Number.isFinite(count) || count <= 0) continue;
      totalRotated24h += count;

      const bucket = grouped.get(productId) ?? { productSlug, items: [] };
      bucket.items.push({ programKey, count });
      grouped.set(productId, bucket);
    }

    const flaggedProducts: AffiliateRedirectRotationSkewAlert[] = [];
    for (const [productId, bucket] of grouped) {
      const total = bucket.items.reduce((sum, item) => sum + item.count, 0);
      if (total < minEventsPerProduct) continue;
      const dominant = [...bucket.items].sort((a, b) => b.count - a.count)[0];
      if (!dominant) continue;
      const dominantSharePct = (dominant.count / total) * 100;
      if (dominantSharePct < thresholdSharePct) continue;

      flaggedProducts.push({
        productId,
        productSlug: bucket.productSlug,
        totalRotated24h: total,
        dominantProgramKey: dominant.programKey,
        dominantCount: dominant.count,
        dominantSharePct,
        distribution: bucket.items
          .sort((a, b) => b.count - a.count)
          .map((item) => ({
            programKey: item.programKey,
            count: item.count,
            sharePct: (item.count / total) * 100,
          })),
      });
    }

    flaggedProducts.sort((a, b) => {
      if (b.dominantSharePct !== a.dominantSharePct) {
        return b.dominantSharePct - a.dominantSharePct;
      }
      return b.totalRotated24h - a.totalRotated24h;
    });

    return {
      totalRotated24h,
      thresholdSharePct,
      minEventsPerProduct,
      flaggedProducts: flaggedProducts.slice(0, Math.max(1, maxFlaggedProducts)),
    };
  } catch {
    return empty;
  }
}

export async function getAffiliateRotationGuardSummary(): Promise<AffiliateRotationGuardSummary> {
  const db = getDb();
  const empty: AffiliateRotationGuardSummary = {
    recommendations24h: 0,
    recommendations7d: 0,
    guardRuns24h: 0,
    guardRuns7d: 0,
    lastGuardRunAt: null,
    lastGuardRunMode: null,
    lastGuardMessage: null,
    lastRecommendationAt: null,
  };
  if (!db) return empty;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const [countRows, lastGuardRun, lastRecommendation] = await Promise.all([
      db
        .select({
          recommendations24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'affiliate_rotation_rebalance_recommended' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
          recommendations7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'affiliate_rotation_rebalance_recommended' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
          guardRuns24h: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'affiliate_rotation_guard_cron' and ${activityLogs.createdAt} >= ${since24h} then 1 else 0 end), 0)`,
          guardRuns7d: sql<number>`coalesce(sum(case when ${activityLogs.action} = 'affiliate_rotation_guard_cron' and ${activityLogs.createdAt} >= ${since7d} then 1 else 0 end), 0)`,
        })
        .from(activityLogs),
      db.query.activityLogs.findFirst({
        where: eq(activityLogs.action, "affiliate_rotation_guard_cron"),
        columns: {
          createdAt: true,
          reason: true,
          message: true,
        },
        orderBy: desc(activityLogs.createdAt),
      }),
      db.query.activityLogs.findFirst({
        where: eq(activityLogs.action, "affiliate_rotation_rebalance_recommended"),
        columns: {
          createdAt: true,
        },
        orderBy: desc(activityLogs.createdAt),
      }),
    ]);

    const row = countRows[0];
    if (!row) return empty;

    return {
      recommendations24h: Number(row.recommendations24h ?? 0),
      recommendations7d: Number(row.recommendations7d ?? 0),
      guardRuns24h: Number(row.guardRuns24h ?? 0),
      guardRuns7d: Number(row.guardRuns7d ?? 0),
      lastGuardRunAt: lastGuardRun?.createdAt ?? null,
      lastGuardRunMode:
        lastGuardRun?.reason === "dry_run"
          ? "dry_run"
          : lastGuardRun?.reason === "live"
            ? "live"
            : null,
      lastGuardMessage: lastGuardRun?.message ?? null,
      lastRecommendationAt: lastRecommendation?.createdAt ?? null,
    };
  } catch {
    return empty;
  }
}

type TrustCopyVariantKey = "control" | "verified";

type TrustCopyVariantStats = {
  exposure24h: number;
  exposure7d: number;
  ctaClick24h: number;
  ctaClick7d: number;
  scoreLabelView24h: number;
  scoreLabelView7d: number;
  ctr24h: number;
  ctr7d: number;
};

type TrustCopyExperimentStats = {
  control: TrustCopyVariantStats;
  verified: TrustCopyVariantStats;
  winner24h: TrustCopyVariantKey | "tie" | "insufficient_data";
};

function emptyTrustVariantStats(): TrustCopyVariantStats {
  return {
    exposure24h: 0,
    exposure7d: 0,
    ctaClick24h: 0,
    ctaClick7d: 0,
    scoreLabelView24h: 0,
    scoreLabelView7d: 0,
    ctr24h: 0,
    ctr7d: 0,
  };
}

function computeCtr(clicks: number, exposures: number) {
  if (exposures <= 0) return 0;
  const value = (clicks / exposures) * 100;
  return Number.isFinite(value) ? value : 0;
}

export async function getTrustCopyExperimentStats(): Promise<TrustCopyExperimentStats> {
  const db = getDb();
  const base: TrustCopyExperimentStats = {
    control: emptyTrustVariantStats(),
    verified: emptyTrustVariantStats(),
    winner24h: "insufficient_data",
  };
  if (!db) return base;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const rows = await db.execute(sql`
      select
        reason as variant,
        coalesce(sum(case when permission = 'exposure' and created_at >= ${since24h} then 1 else 0 end), 0) as exposure_24h,
        coalesce(sum(case when permission = 'exposure' and created_at >= ${since7d} then 1 else 0 end), 0) as exposure_7d,
        coalesce(sum(case when permission = 'cta_click' and created_at >= ${since24h} then 1 else 0 end), 0) as cta_click_24h,
        coalesce(sum(case when permission = 'cta_click' and created_at >= ${since7d} then 1 else 0 end), 0) as cta_click_7d,
        coalesce(sum(case when permission = 'score_label_view' and created_at >= ${since24h} then 1 else 0 end), 0) as score_label_view_24h,
        coalesce(sum(case when permission = 'score_label_view' and created_at >= ${since7d} then 1 else 0 end), 0) as score_label_view_7d
      from activity_logs
      where action = 'experiment_event'
        and reason in ('control', 'verified')
        and message like 'Experiment trust_copy_v1%'
      group by reason
    `);

    for (const row of rows as Array<Record<string, unknown>>) {
      const variant = String(row.variant ?? "");
      if (variant !== "control" && variant !== "verified") continue;
      const exposure24h = Number(row.exposure_24h ?? 0);
      const exposure7d = Number(row.exposure_7d ?? 0);
      const ctaClick24h = Number(row.cta_click_24h ?? 0);
      const ctaClick7d = Number(row.cta_click_7d ?? 0);
      const scoreLabelView24h = Number(row.score_label_view_24h ?? 0);
      const scoreLabelView7d = Number(row.score_label_view_7d ?? 0);

      base[variant] = {
        exposure24h,
        exposure7d,
        ctaClick24h,
        ctaClick7d,
        scoreLabelView24h,
        scoreLabelView7d,
        ctr24h: computeCtr(ctaClick24h, exposure24h),
        ctr7d: computeCtr(ctaClick7d, exposure7d),
      };
    }

    const control = base.control;
    const verified = base.verified;
    if (control.exposure24h < 10 && verified.exposure24h < 10) {
      base.winner24h = "insufficient_data";
    } else if (Math.abs(control.ctr24h - verified.ctr24h) < 0.1) {
      base.winner24h = "tie";
    } else {
      base.winner24h = control.ctr24h > verified.ctr24h ? "control" : "verified";
    }

    return base;
  } catch {
    return base;
  }
}
