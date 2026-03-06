import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

type SegmentMetric = {
  intent24h: number;
  intent7d: number;
  clicks24h: number;
  clicks7d: number;
  ctr24h: number;
  ctr7d: number;
};

type RedirectLatencyMetric = {
  p50_24h: number | null;
  p95_24h: number | null;
  p50_7d: number | null;
  p95_7d: number | null;
};

type FunnelMetrics = {
  indonesia: SegmentMetric;
  global: SegmentMetric;
  redirectLatency: RedirectLatencyMetric;
};

const empty: FunnelMetrics = {
  indonesia: {
    intent24h: 0,
    intent7d: 0,
    clicks24h: 0,
    clicks7d: 0,
    ctr24h: 0,
    ctr7d: 0,
  },
  global: {
    intent24h: 0,
    intent7d: 0,
    clicks24h: 0,
    clicks7d: 0,
    ctr24h: 0,
    ctr7d: 0,
  },
  redirectLatency: {
    p50_24h: null,
    p95_24h: null,
    p50_7d: null,
    p95_7d: null,
  },
};

function parseNullableNumber(value: unknown) {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toPercent(clicks: number, intents: number) {
  if (intents <= 0) return 0;
  const value = (clicks / intents) * 100;
  return Number.isFinite(value) ? value : 0;
}

export async function getAffiliateFunnelMetrics(): Promise<FunnelMetrics> {
  const db = getDb();
  if (!db) return empty;

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  try {
    const [intentRows, clickRows, latencyRows] = await Promise.all([
      db.execute(sql`
        select
          coalesce(sum(case when reason = 'indonesia' and created_at >= ${since24h} then 1 else 0 end), 0) as indonesia_24h,
          coalesce(sum(case when reason = 'indonesia' and created_at >= ${since7d} then 1 else 0 end), 0) as indonesia_7d,
          coalesce(sum(case when reason = 'global' and created_at >= ${since24h} then 1 else 0 end), 0) as global_24h,
          coalesce(sum(case when reason = 'global' and created_at >= ${since7d} then 1 else 0 end), 0) as global_7d
        from activity_logs
        where action = 'intent_selected'
      `),
      db.execute(sql`
        select
          coalesce(sum(case when cat.region = 'indonesia' and c.created_at >= ${since24h} then 1 else 0 end), 0) as indonesia_24h,
          coalesce(sum(case when cat.region = 'indonesia' and c.created_at >= ${since7d} then 1 else 0 end), 0) as indonesia_7d,
          coalesce(sum(case when cat.region = 'global' and c.created_at >= ${since24h} then 1 else 0 end), 0) as global_24h,
          coalesce(sum(case when cat.region = 'global' and c.created_at >= ${since7d} then 1 else 0 end), 0) as global_7d
        from clicks c
        inner join products p on c.product_id = p.id
        left join categories cat on p.category_id = cat.id
      `),
      db.execute(sql`
        select
          percentile_cont(0.50) within group (order by webhook_latency_ms) filter (
            where action = 'affiliate_redirect'
              and webhook_latency_ms is not null
              and created_at >= ${since24h}
          ) as p50_24h,
          percentile_cont(0.95) within group (order by webhook_latency_ms) filter (
            where action = 'affiliate_redirect'
              and webhook_latency_ms is not null
              and created_at >= ${since24h}
          ) as p95_24h,
          percentile_cont(0.50) within group (order by webhook_latency_ms) filter (
            where action = 'affiliate_redirect'
              and webhook_latency_ms is not null
              and created_at >= ${since7d}
          ) as p50_7d,
          percentile_cont(0.95) within group (order by webhook_latency_ms) filter (
            where action = 'affiliate_redirect'
              and webhook_latency_ms is not null
              and created_at >= ${since7d}
          ) as p95_7d
        from activity_logs
      `),
    ]);

    const intentRow = (intentRows[0] ?? {}) as Record<string, unknown>;
    const clickRow = (clickRows[0] ?? {}) as Record<string, unknown>;
    const latencyRow = (latencyRows[0] ?? {}) as Record<string, unknown>;

    const indonesiaIntent24h = Number(intentRow.indonesia_24h ?? 0);
    const indonesiaIntent7d = Number(intentRow.indonesia_7d ?? 0);
    const globalIntent24h = Number(intentRow.global_24h ?? 0);
    const globalIntent7d = Number(intentRow.global_7d ?? 0);

    const indonesiaClicks24h = Number(clickRow.indonesia_24h ?? 0);
    const indonesiaClicks7d = Number(clickRow.indonesia_7d ?? 0);
    const globalClicks24h = Number(clickRow.global_24h ?? 0);
    const globalClicks7d = Number(clickRow.global_7d ?? 0);

    return {
      indonesia: {
        intent24h: indonesiaIntent24h,
        intent7d: indonesiaIntent7d,
        clicks24h: indonesiaClicks24h,
        clicks7d: indonesiaClicks7d,
        ctr24h: toPercent(indonesiaClicks24h, indonesiaIntent24h),
        ctr7d: toPercent(indonesiaClicks7d, indonesiaIntent7d),
      },
      global: {
        intent24h: globalIntent24h,
        intent7d: globalIntent7d,
        clicks24h: globalClicks24h,
        clicks7d: globalClicks7d,
        ctr24h: toPercent(globalClicks24h, globalIntent24h),
        ctr7d: toPercent(globalClicks7d, globalIntent7d),
      },
      redirectLatency: {
        p50_24h: parseNullableNumber(latencyRow.p50_24h),
        p95_24h: parseNullableNumber(latencyRow.p95_24h),
        p50_7d: parseNullableNumber(latencyRow.p50_7d),
        p95_7d: parseNullableNumber(latencyRow.p95_7d),
      },
    };
  } catch {
    return empty;
  }
}
