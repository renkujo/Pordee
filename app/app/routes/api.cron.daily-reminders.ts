import type { Route } from "./+types/api.cron.daily-reminders";
import { hasValidBearerSecret } from "~/lib/security/bearer-secret.server";
import { isWebPushConfigurationValid } from "~/lib/notifications/web-push.server";

export const loader = () => {
  return Response.json({ error: "method not allowed" }, { status: 405 });
};

export const action = async ({ request }: Route.ActionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }
  if (!process.env.REMINDER_CRON_SECRET?.trim()) {
    return Response.json(
      { error: "scheduler is not configured" },
      {
        status: 503,
      }
    );
  }
  if (!hasValidBearerSecret(request, process.env.REMINDER_CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isWebPushConfigurationValid()) {
    return Response.json(
      { error: "web push is not configured" },
      {
        status: 503,
      }
    );
  }

  const { processDailyReminders } =
    await import("~/lib/notifications/reminder-scheduler.server");
  const result = await processDailyReminders();
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
};
