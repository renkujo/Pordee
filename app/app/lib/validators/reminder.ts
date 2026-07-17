import { z } from "zod";

const reminderTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "invalid reminder time");

const timeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isSupportedTimeZone, "invalid time zone");

const reminderScheduleSchema = z.object({
  localTime: reminderTimeSchema,
  timeZone: timeZoneSchema,
});

const preferenceSchema = reminderScheduleSchema.extend({
  enabled: z.boolean(),
});

const endpointSchema = z
  .url()
  .max(2048)
  .refine(isSafeEndpointShape, "invalid push endpoint");

const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  expirationTime: z
    .number()
    .finite()
    .positive()
    .max(8_640_000_000_000_000)
    .nullable(),
  keys: z.object({
    auth: z.string().min(1).max(512),
    p256dh: z.string().min(1).max(512),
  }),
});

export const pushSubscriptionRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("subscribe"),
    schedule: reminderScheduleSchema,
    subscription: subscriptionSchema,
  }),
  z.object({
    operation: z.literal("update-schedule"),
    schedule: reminderScheduleSchema,
  }),
  z.object({
    operation: z.literal("disable"),
    schedule: reminderScheduleSchema,
  }),
  z.object({
    operation: z.literal("test"),
    endpoint: endpointSchema,
  }),
]);

export const dailyReminderPreferenceSchema = preferenceSchema;

function isSupportedTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function isSafeEndpointShape(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      hostname !== "localhost" &&
      !hostname.endsWith(".localhost") &&
      !hostname.endsWith(".local") &&
      !hostname.endsWith(".internal")
    );
  } catch {
    return false;
  }
}
