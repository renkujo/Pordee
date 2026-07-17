import type { Route } from "./+types/api.push-subscriptions";
import { repo } from "~/lib/db";
import { getAuthUser } from "~/lib/auth.server";
import {
  isWebPushConfigurationValid,
  sendTestPush,
} from "~/lib/notifications/web-push.server";
import { isSafePushEndpointUrl } from "~/lib/notifications/push-endpoint.server";
import { hasTrustedRequestOrigin } from "~/lib/security/same-origin.server";
import { pushSubscriptionRequestSchema } from "~/lib/validators/reminder";

const MAX_REQUEST_BYTES = 8 * 1024;
const TEST_PUSH_COOLDOWN_MS = 30_000;
const SUBSCRIBE_WINDOW_MS = 60_000;
const MAX_SUBSCRIBE_ATTEMPTS_PER_WINDOW = 10;
const lastTestPushAtByUserId = new Map<string, number>();
const subscribeAttemptsByUserId = new Map<string, number[]>();

export const loader = () => {
  return json({ error: "method not allowed" }, 405);
};

export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }
  if (!hasTrustedRequestOrigin(request)) {
    return json({ error: "invalid origin" }, 403);
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "content type must be application/json" }, 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json({ error: "request too large" }, 413);
  }

  const user = await getAuthUser(request);
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = await readJsonBody(request);
  if (body.tooLarge) return json({ error: "request too large" }, 413);
  const parsed = pushSubscriptionRequestSchema.safeParse(body.value);
  if (!parsed.success) return json({ error: "invalid request" }, 400);
  const requestedEndpoint =
    parsed.data.operation === "subscribe"
      ? parsed.data.subscription.endpoint
      : parsed.data.operation === "test"
        ? parsed.data.endpoint
        : null;
  if (requestedEndpoint && !isSafePushEndpointUrl(new URL(requestedEndpoint))) {
    return json({ error: "invalid push endpoint" }, 400);
  }

  if (parsed.data.operation === "subscribe") {
    if (!isWebPushConfigurationValid()) {
      return json({ error: "web push is not configured" }, 503);
    }
    const { schedule, subscription } = parsed.data;
    if (!takeSubscribeAttempt(user.id)) {
      return json({ error: "subscription rate limited" }, 429);
    }
    try {
      const result = await repo.enableDailyReminder(user.id, schedule, {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime).toISOString()
          : null,
        userAgent: request.headers.get("user-agent")?.slice(0, 512) ?? null,
      });
      return json({ ok: true, ...result });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "push subscription limit reached"
      ) {
        return json({ error: "device limit reached" }, 429);
      }
      throw error;
    }
  }

  if (parsed.data.operation === "update-schedule") {
    const current = await repo.getDailyReminderPreference(user.id);
    const preference = await repo.updateDailyReminderPreference(user.id, {
      enabled: current.enabled,
      ...parsed.data.schedule,
    });
    return json({ ok: true, preference });
  }

  if (parsed.data.operation === "disable") {
    const result = await repo.disableDailyReminder(
      user.id,
      parsed.data.schedule
    );
    return json({ ok: true, ...result });
  }

  if (parsed.data.operation !== "test") {
    return json({ error: "invalid operation" }, 400);
  }
  const endpoint = parsed.data.endpoint;

  if (!isWebPushConfigurationValid()) {
    return json({ error: "web push is not configured" }, 503);
  }
  const now = Date.now();
  const lastTestPushAt = lastTestPushAtByUserId.get(user.id) ?? 0;
  if (now - lastTestPushAt < TEST_PUSH_COOLDOWN_MS) {
    return json({ error: "test notification rate limited" }, 429);
  }
  lastTestPushAtByUserId.set(user.id, now);
  const subscriptions = await repo.listActivePushSubscriptions(user.id);
  const subscription = subscriptions.find((item) => item.endpoint === endpoint);
  if (!subscription) return json({ error: "subscription not found" }, 404);

  const delivery = await sendTestPush(subscription);
  if (!delivery.ok) {
    if (delivery.statusCode === 404 || delivery.statusCode === 410) {
      await repo.revokePushSubscription(user.id, subscription.endpoint);
    }
    return json({ error: "test notification failed" }, 502);
  }
  return json({ ok: true });
};

const readJsonBody = async (request: Request) => {
  try {
    const text = await request.text();
    if (text.length > MAX_REQUEST_BYTES) {
      return { tooLarge: true as const, value: null };
    }
    return { tooLarge: false as const, value: JSON.parse(text) as unknown };
  } catch {
    return { tooLarge: false as const, value: null };
  }
};

const json = (body: unknown, status = 200) => {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
};

const takeSubscribeAttempt = (userId: string) => {
  const now = Date.now();
  const attempts = (subscribeAttemptsByUserId.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < SUBSCRIBE_WINDOW_MS
  );
  if (attempts.length >= MAX_SUBSCRIBE_ATTEMPTS_PER_WINDOW) return false;
  attempts.push(now);
  subscribeAttemptsByUserId.set(userId, attempts);
  return true;
};
