import webPush from "web-push";
import type { PushSubscriptionRecord } from "~/lib/db";
import { createPublicPushAgent } from "./push-endpoint.server";

export interface WebPushSendResult {
  ok: boolean;
  statusCode: number | null;
}

type NotificationKind = "daily-check-in" | "test";

export const getWebPushPublicConfig = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  return {
    configured: isWebPushConfigurationValid(),
    publicKey: publicKey || null,
  };
};

export const isWebPushConfigurationValid = () => {
  const config = getPrivateWebPushConfig();
  if (!config) return false;
  try {
    webPush.setVapidDetails(
      config.subject,
      config.publicKey,
      config.privateKey
    );
    return true;
  } catch {
    return false;
  }
};

export const sendDailyCheckInPush = (subscription: PushSubscriptionRecord) => {
  return sendPush(subscription, "daily-check-in");
};

export const sendTestPush = (subscription: PushSubscriptionRecord) => {
  return sendPush(subscription, "test");
};

const sendPush = async (
  subscription: PushSubscriptionRecord,
  kind: NotificationKind
): Promise<WebPushSendResult> => {
  const config = getPrivateWebPushConfig();
  if (!config) return { ok: false, statusCode: null };

  try {
    const agent = await createPublicPushAgent(subscription.endpoint);
    if (!agent) return { ok: false, statusCode: null };
    webPush.setVapidDetails(
      config.subject,
      config.publicKey,
      config.privateKey
    );
    const response = await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime).getTime()
          : null,
        keys: {
          auth: subscription.auth,
          p256dh: subscription.p256dh,
        },
      },
      JSON.stringify({ type: kind }),
      { TTL: 60 * 60, urgency: "normal", agent, timeout: 5_000 }
    );
    return { ok: true, statusCode: response.statusCode };
  } catch (error) {
    return {
      ok: false,
      statusCode: getWebPushStatusCode(error),
    };
  }
};

const getPrivateWebPushConfig = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
};

const getWebPushStatusCode = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return null;
};
