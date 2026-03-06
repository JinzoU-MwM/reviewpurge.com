import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/queries/activity-logs", () => ({
  createActivityLog: vi.fn(),
  getActivityLogSecurityStats: vi.fn(),
  getActivityLogSecurityTrend: vi.fn(),
  getLatestActivityLogByActionAndReason: vi.fn(),
  getRecentSecurityAlertSentReasons: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/security/alerts", () => ({
  resolveSecurityAlertThresholds: vi.fn(),
  evaluateSecurityAlerts: vi.fn(),
}));

import {
  createActivityLog,
  getActivityLogSecurityStats,
  getActivityLogSecurityTrend,
  getLatestActivityLogByActionAndReason,
  getRecentSecurityAlertSentReasons,
} from "@/lib/db/queries/activity-logs";
import {
  evaluateSecurityAlerts,
  resolveSecurityAlertThresholds,
} from "@/lib/security/alerts";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { POST } from "../route";

function makeRequest(url = "http://localhost/api/cron/security-alerts?token=secret") {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "x-forwarded-for": "1.1.1.1",
    },
  });
}

describe("security alert cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

    process.env.CRON_SECRET = "secret";
    process.env.CRON_ALLOWED_IPS = "";
    process.env.SECURITY_ALERT_WEBHOOK_URL = "https://webhook.example.com";
    process.env.SECURITY_ALERT_WEBHOOK_URL_WARN = "";
    process.env.SECURITY_ALERT_WEBHOOK_URL_CRITICAL = "";
    process.env.SECURITY_ALERT_CRITICAL_CONSECUTIVE_MIN = "1";
    process.env.SECURITY_ALERT_COOLDOWN_MS = "1800000";
    delete process.env.SECURITY_ALERT_COOLDOWN_MS_WARN;
    delete process.env.SECURITY_ALERT_COOLDOWN_MS_CRITICAL;
    delete process.env.SECURITY_ALERT_SUSTAINED_WINDOW_DAYS;
    delete process.env.SECURITY_ALERT_SUSTAINED_MIN_BREACH_DAYS;
    process.env.SECURITY_ALERT_SKIP_LOG_WINDOW_MS = "600000";
    process.env.SECURITY_ALERT_WEBHOOK_MAX_ATTEMPTS = "3";
    process.env.SECURITY_ALERT_WEBHOOK_BACKOFF_MS = "1";
    process.env.SECURITY_ALERT_WEBHOOK_TIMEOUT_MS = "500";
    delete process.env.SECURITY_ALERT_WEBHOOK_SIGNING_SECRET;

    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      retryAfterMs: 0,
    });
    vi.mocked(getActivityLogSecurityStats).mockResolvedValue({
      denied24h: 10,
      denied7d: 10,
      rateLimited24h: 5,
      rateLimited7d: 5,
      blockedUrl24h: 1,
      blockedUrl7d: 1,
    });
    vi.mocked(getActivityLogSecurityTrend).mockResolvedValue([]);
    vi.mocked(getLatestActivityLogByActionAndReason).mockResolvedValue(null);
    vi.mocked(getRecentSecurityAlertSentReasons).mockResolvedValue([]);
    vi.mocked(resolveSecurityAlertThresholds).mockReturnValue({
      denied24h: 20,
      rateLimited24h: 40,
      blockedUrl24h: 10,
    });
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([]);
  });

  it("returns unauthorized when cron token is invalid", async () => {
    const response = await POST(
      makeRequest("http://localhost/api/cron/security-alerts?token=wrong"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns no_threshold_breach without calling webhook", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sent: false,
      reason: "no_threshold_breach",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_skipped",
        reason: "no_threshold_breach",
      }),
    );
  });

  it("returns cooldown_active when warn alert was sent recently", async () => {
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 30,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);
    process.env.SECURITY_ALERT_COOLDOWN_MS_WARN = "1800000";
    vi.mocked(getLatestActivityLogByActionAndReason).mockImplementation(
      async (action, reason) => {
        if (action === "security_alert_sent" && reason === "threshold_breach_warn") {
          return {
            id: 1,
            reason: "threshold_breach_warn",
            message: "sent",
            createdAt: new Date(Date.now() - 60_000),
          };
        }
        return null;
      },
    );

    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("cooldown_active");
    expect(body.severity).toBe("warn");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_skipped",
        reason: "cooldown_active",
      }),
    );
  });

  it("returns cooldown_active for critical severity when critical cooldown is active", async () => {
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 50,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);
    process.env.SECURITY_ALERT_COOLDOWN_MS_CRITICAL = "1800000";
    vi.mocked(getLatestActivityLogByActionAndReason).mockImplementation(
      async (action, reason) => {
        if (action === "security_alert_sent" && reason === "threshold_breach_critical") {
          return {
            id: 2,
            reason: "threshold_breach_critical",
            message: "sent",
            createdAt: new Date(Date.now() - 60_000),
          };
        }
        return null;
      },
    );

    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("cooldown_active");
    expect(body.severity).toBe("critical");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not apply warn cooldown to critical severity", async () => {
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 50,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);
    process.env.SECURITY_ALERT_COOLDOWN_MS_WARN = "1800000";
    process.env.SECURITY_ALERT_COOLDOWN_MS_CRITICAL = "60000";
    vi.mocked(getLatestActivityLogByActionAndReason).mockImplementation(
      async (action, reason) => {
        if (action === "security_alert_sent" && reason === "threshold_breach_warn") {
          return {
            id: 3,
            reason: "threshold_breach_warn",
            message: "warn sent",
            createdAt: new Date(Date.now() - 60_000),
          };
        }
        return null;
      },
    );

    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(true);
    expect(body.severity).toBe("critical");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getLatestActivityLogByActionAndReason).toHaveBeenCalledWith(
      "security_alert_sent",
      "threshold_breach_critical",
    );
  });

  it("does not duplicate skipped log inside dedupe window", async () => {
    vi.mocked(getLatestActivityLogByActionAndReason).mockResolvedValue({
      id: 99,
      reason: "no_threshold_breach",
      message: "recent",
      createdAt: new Date(Date.now() - 60_000),
    });

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(createActivityLog).not.toHaveBeenCalled();
  });

  it("sends webhook and logs success when breach exists", async () => {
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 30,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);
    process.env.SECURITY_ALERT_WEBHOOK_SIGNING_SECRET = "signing-secret";

    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers["x-security-alert-signature"]).toMatch(/^v1=/);
    expect(headers["x-security-alert-timestamp"]).toMatch(/^\d+$/);
    expect(headers["x-security-alert-severity"]).toBe("warn");
    const payload = JSON.parse(String(init.body));
    expect(payload.schemaVersion).toBe("1.0");
    expect(payload.event).toBe("security_alert_threshold_breach");
    expect(payload.severity).toBe("warn");
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_sent",
      }),
    );
  });

  it("returns payload preview and does not call webhook on dry-run", async () => {
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 30,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);

    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      makeRequest("http://localhost/api/cron/security-alerts?token=secret&dry_run=1"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("dry_run");
    expect(body.preview.schemaVersion).toBe("1.0");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_skipped",
        reason: "dry_run",
        attemptCount: 0,
      }),
    );
  });

  it("logs failure when webhook returns non-2xx", async () => {
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 30,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);

    const fetchMock = vi.fn(async () => new Response("bad", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_failed",
        attemptCount: 3,
        webhookStatusCode: 500,
        webhookLatencyMs: expect.any(Number),
      }),
    );
  });

  it("retries and succeeds on subsequent attempt", async () => {
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 30,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => new Response("bad", { status: 500 }))
      .mockImplementationOnce(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_sent",
        reason: "threshold_breach_warn",
        attemptCount: 2,
        webhookStatusCode: 200,
        webhookLatencyMs: expect.any(Number),
        message: expect.stringContaining("2 attempt"),
      }),
    );
  });

  it("routes critical severity to critical webhook url", async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = "https://default.example.com";
    process.env.SECURITY_ALERT_WEBHOOK_URL_WARN = "https://warn.example.com";
    process.env.SECURITY_ALERT_WEBHOOK_URL_CRITICAL = "https://critical.example.com";
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 50,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);

    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://critical.example.com");
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers["x-security-alert-severity"]).toBe("critical");
    const payload = JSON.parse(String(init.body));
    expect(payload.severity).toBe("critical");
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_sent",
        reason: "threshold_breach_critical",
      }),
    );
  });

  it("keeps severity warn when critical streak requirement is not met", async () => {
    process.env.SECURITY_ALERT_CRITICAL_CONSECUTIVE_MIN = "2";
    process.env.SECURITY_ALERT_WEBHOOK_URL = "https://default.example.com";
    process.env.SECURITY_ALERT_WEBHOOK_URL_WARN = "https://warn.example.com";
    process.env.SECURITY_ALERT_WEBHOOK_URL_CRITICAL = "https://critical.example.com";
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 50,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);
    vi.mocked(getRecentSecurityAlertSentReasons).mockResolvedValue(["threshold_breach_warn"]);

    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://warn.example.com");
    const payload = JSON.parse(String(init.body));
    expect(payload.severity).toBe("warn");
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_sent",
        reason: "threshold_breach_warn",
      }),
    );
  });

  it("supports severity-specific webhook without default URL and logs actual success status", async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = "";
    process.env.SECURITY_ALERT_WEBHOOK_URL_WARN = "https://warn-only.example.com";
    process.env.SECURITY_ALERT_WEBHOOK_URL_CRITICAL = "";
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 30,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);

    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://warn-only.example.com");
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_sent",
        webhookStatusCode: 204,
      }),
    );
  });

  it("escalates to critical on sustained multi-day breach even without 2x threshold", async () => {
    process.env.SECURITY_ALERT_CRITICAL_CONSECUTIVE_MIN = "5";
    process.env.SECURITY_ALERT_SUSTAINED_WINDOW_DAYS = "3";
    process.env.SECURITY_ALERT_SUSTAINED_MIN_BREACH_DAYS = "2";
    process.env.SECURITY_ALERT_WEBHOOK_URL = "https://default.example.com";
    process.env.SECURITY_ALERT_WEBHOOK_URL_WARN = "https://warn.example.com";
    process.env.SECURITY_ALERT_WEBHOOK_URL_CRITICAL = "https://critical.example.com";
    vi.mocked(evaluateSecurityAlerts).mockReturnValue([
      {
        key: "denied",
        label: "Denied actions",
        value: 30,
        threshold: 20,
        action: "admin_action_denied",
      },
    ]);
    vi.mocked(getActivityLogSecurityTrend).mockResolvedValue([
      { day: "2026-03-06", denied: 25, rateLimited: 5, blockedUrl: 0 },
      { day: "2026-03-05", denied: 22, rateLimited: 8, blockedUrl: 1 },
      { day: "2026-03-04", denied: 10, rateLimited: 4, blockedUrl: 0 },
    ]);
    vi.mocked(getRecentSecurityAlertSentReasons).mockResolvedValue([
      "threshold_breach_warn",
      "threshold_breach_warn",
      "threshold_breach_warn",
      "threshold_breach_warn",
    ]);

    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://critical.example.com");
    const payload = JSON.parse(String(init.body));
    expect(payload.severity).toBe("critical");
    expect(payload.sustainedBreach).toEqual(
      expect.objectContaining({
        triggered: true,
        windowDays: 3,
        minBreachDays: 2,
        breachedDays: 2,
      }),
    );
    expect(createActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_alert_sent",
        reason: "threshold_breach_critical",
      }),
    );
  });
});
