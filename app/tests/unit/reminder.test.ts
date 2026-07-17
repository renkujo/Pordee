import { afterEach, describe, expect, it } from "vitest";
import { getLocalReminderClock } from "~/lib/date/reminder-clock";
import { hasValidBearerSecret } from "~/lib/security/bearer-secret.server";
import { hasTrustedRequestOrigin } from "~/lib/security/same-origin.server";
import {
  isPublicIpAddress,
  isSafePushEndpointUrl,
} from "~/lib/notifications/push-endpoint.server";
import {
  dailyReminderPreferenceSchema,
  pushSubscriptionRequestSchema,
} from "~/lib/validators/reminder";
import {
  action as reminderCronAction,
  loader as reminderCronLoader,
} from "~/routes/api.cron.daily-reminders";

const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
const originalCronSecret = process.env.REMINDER_CRON_SECRET;

afterEach(() => {
  if (originalBetterAuthUrl === undefined) {
    delete process.env.BETTER_AUTH_URL;
  } else {
    process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
  }
  if (originalCronSecret === undefined) {
    delete process.env.REMINDER_CRON_SECRET;
  } else {
    process.env.REMINDER_CRON_SECRET = originalCronSecret;
  }
});

describe("daily reminder validation", () => {
  it("accepts the 20:00 Bangkok default and valid Web Push payload", () => {
    expect(
      dailyReminderPreferenceSchema.parse({
        enabled: true,
        localTime: "20:00",
        timeZone: "Asia/Bangkok",
      })
    ).toMatchObject({ localTime: "20:00" });

    expect(
      pushSubscriptionRequestSchema.parse({
        operation: "subscribe",
        schedule: {
          localTime: "20:00",
          timeZone: "Asia/Bangkok",
        },
        subscription: {
          endpoint: "https://push.example.test/device",
          expirationTime: null,
          keys: { auth: "auth", p256dh: "key" },
        },
      }).operation
    ).toBe("subscribe");
  });

  it("rejects private, local, credentialed, and nonstandard push targets", () => {
    expect(isSafePushEndpointUrl(new URL("https://127.0.0.1/push"))).toBe(
      false
    );
    expect(isSafePushEndpointUrl(new URL("https://192.168.1.20/push"))).toBe(
      false
    );
    expect(
      isSafePushEndpointUrl(new URL("https://service.internal/push"))
    ).toBe(false);
    expect(
      isSafePushEndpointUrl(new URL("https://user:pass@push.example.com/push"))
    ).toBe(false);
    expect(
      isSafePushEndpointUrl(new URL("https://push.example.com:8443/push"))
    ).toBe(false);
    expect(
      isSafePushEndpointUrl(new URL("https://fcm.googleapis.com/fcm/send/test"))
    ).toBe(true);
    expect(isPublicIpAddress("64:ff9b::a00:1", 6)).toBe(false);
    expect(isPublicIpAddress("2002:0a00:0001::", 6)).toBe(false);
    expect(isPublicIpAddress("2606:4700:4700::1111", 6)).toBe(true);
  });

  it("rejects malformed times, time zones, and non-HTTPS endpoints", () => {
    expect(() =>
      dailyReminderPreferenceSchema.parse({
        enabled: true,
        localTime: "24:00",
        timeZone: "Asia/Bangkok",
      })
    ).toThrow();
    expect(() =>
      dailyReminderPreferenceSchema.parse({
        enabled: true,
        localTime: "20:00",
        timeZone: "Not/AZone",
      })
    ).toThrow();
    expect(() =>
      pushSubscriptionRequestSchema.parse({
        operation: "test",
        endpoint: "http://push.example.test/device",
      })
    ).toThrow();
  });
});

describe("daily reminder time zones", () => {
  it("maps 13:00 UTC to the 20:00 Bangkok reminder boundary", () => {
    expect(
      getLocalReminderClock(
        new Date("2026-06-02T13:00:00.000Z"),
        "Asia/Bangkok"
      )
    ).toEqual({ localDate: "2026-06-02", localTime: "20:00" });
  });

  it("returns null instead of guessing for an invalid zone", () => {
    expect(
      getLocalReminderClock(new Date("2026-06-02T13:00:00.000Z"), "Bad/Zone")
    ).toBeNull();
  });
});

describe("reminder request security", () => {
  it("requires an exact bearer secret without leaking length information", () => {
    const request = new Request("https://pordee.test/api/cron", {
      headers: { Authorization: "Bearer correct-secret" },
    });
    expect(hasValidBearerSecret(request, "correct-secret")).toBe(true);
    expect(hasValidBearerSecret(request, "wrong")).toBe(false);
    expect(hasValidBearerSecret(request, undefined)).toBe(false);
  });

  it("fails the cron route closed before loading scheduler data", async () => {
    delete process.env.REMINDER_CRON_SECRET;
    expect(reminderCronLoader().status).toBe(405);

    const missingConfig = await reminderCronAction({
      request: new Request("https://pordee.test/api/cron/daily-reminders", {
        method: "POST",
      }),
    } as never);
    expect(missingConfig.status).toBe(503);

    process.env.REMINDER_CRON_SECRET = "expected-secret";
    const unauthorized = await reminderCronAction({
      request: new Request("https://pordee.test/api/cron/daily-reminders", {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    } as never);
    expect(unauthorized.status).toBe(401);

    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    const missingPushConfig = await reminderCronAction({
      request: new Request("https://pordee.test/api/cron/daily-reminders", {
        method: "POST",
        headers: { Authorization: "Bearer expected-secret" },
      }),
    } as never);
    expect(missingPushConfig.status).toBe(503);
  });

  it("accepts only the configured application origin", () => {
    process.env.BETTER_AUTH_URL = "https://pordee.test";
    expect(
      hasTrustedRequestOrigin(
        new Request("https://internal.test/api/push", {
          headers: { Origin: "https://pordee.test" },
        })
      )
    ).toBe(true);
    expect(
      hasTrustedRequestOrigin(
        new Request("https://internal.test/api/push", {
          headers: { Origin: "https://evil.test" },
        })
      )
    ).toBe(false);
  });
});
