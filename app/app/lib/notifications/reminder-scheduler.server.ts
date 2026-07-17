import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "~/lib/db/client";
import { ensureFinanceDatabase } from "~/lib/db/migrate.server";
import {
  dailyReminderPreferences,
  dailyReminderRuns,
  pushSubscriptions,
  transactions,
} from "~/lib/db/schema";
import type { DailyReminderRunStatus, PushSubscriptionRecord } from "~/lib/db";
import { getLocalReminderClock } from "~/lib/date/reminder-clock";
import {
  isWebPushConfigurationValid,
  sendDailyCheckInPush,
  type WebPushSendResult,
} from "./web-push.server";

interface ProcessDailyRemindersOptions {
  limit?: number;
  now?: Date;
  send?: (subscription: PushSubscriptionRecord) => Promise<WebPushSendResult>;
}

export interface DailyReminderProcessResult {
  claimed: number;
  skipped: number;
  attempted: number;
  sent: number;
  failed: number;
  gone: number;
}

export const processDailyReminders = async ({
  limit = 10,
  now = new Date(),
  send,
}: ProcessDailyRemindersOptions = {}): Promise<DailyReminderProcessResult> => {
  const result: DailyReminderProcessResult = {
    claimed: 0,
    skipped: 0,
    attempted: 0,
    sent: 0,
    failed: 0,
    gone: 0,
  };
  if (!send && !isWebPushConfigurationValid()) return result;
  const sender = send ?? sendDailyCheckInPush;

  await ensureFinanceDatabase();
  const staleClaimCutoff = new Date(now.getTime() - 30 * 60_000);
  await db
    .delete(dailyReminderRuns)
    .where(
      and(
        eq(dailyReminderRuns.status, "claimed"),
        isNull(dailyReminderRuns.deliveryStartedAt),
        lt(dailyReminderRuns.claimedAt, staleClaimCutoff)
      )
    );
  await db
    .update(dailyReminderRuns)
    .set({ status: "failed", completedAt: now })
    .where(
      and(
        eq(dailyReminderRuns.status, "claimed"),
        isNotNull(dailyReminderRuns.deliveryStartedAt),
        lt(dailyReminderRuns.claimedAt, staleClaimCutoff)
      )
    );
  const preferences = await db
    .select()
    .from(dailyReminderPreferences)
    .where(eq(dailyReminderPreferences.enabled, true));

  for (const preference of preferences) {
    if (result.claimed >= Math.max(1, Math.min(limit, 100))) break;
    const localClock = getLocalReminderClock(now, preference.timeZone);
    if (!localClock || localClock.localTime < preference.localTime) continue;

    const subscriptionRows = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, preference.userId),
          isNull(pushSubscriptions.revokedAt)
        )
      );
    if (subscriptionRows.length === 0) continue;

    const runId = randomUUID();
    const claimed = await db
      .insert(dailyReminderRuns)
      .values({
        id: runId,
        userId: preference.userId,
        localDate: localClock.localDate,
        timeZone: preference.timeZone,
        scheduledLocalTime: preference.localTime,
        status: "claimed",
        subscriptionCount: subscriptionRows.length,
        sentCount: 0,
        failedCount: 0,
        claimedAt: now,
        deliveryStartedAt: null,
        completedAt: null,
      })
      .onConflictDoNothing({
        target: [dailyReminderRuns.userId, dailyReminderRuns.localDate],
      })
      .returning({ id: dailyReminderRuns.id });
    if (claimed.length === 0) continue;
    result.claimed += 1;

    if (
      await hasTransactionOnLocalDate(
        preference.userId,
        localClock.localDate,
        preference.timeZone
      )
    ) {
      result.skipped += 1;
      await completeRun({
        runId,
        status: "skipped_transaction",
        sentCount: 0,
        failedCount: 0,
        now,
      });
      continue;
    }

    const currentPreferenceRows = await db
      .select()
      .from(dailyReminderPreferences)
      .where(eq(dailyReminderPreferences.userId, preference.userId))
      .limit(1);
    const currentPreference = currentPreferenceRows[0];
    if (!currentPreference?.enabled) {
      result.skipped += 1;
      await completeRun({
        runId,
        status: "skipped_disabled",
        sentCount: 0,
        failedCount: 0,
        now,
      });
      continue;
    }
    if (
      currentPreference.localTime !== preference.localTime ||
      currentPreference.timeZone !== preference.timeZone
    ) {
      await db.delete(dailyReminderRuns).where(eq(dailyReminderRuns.id, runId));
      result.claimed -= 1;
      continue;
    }

    const freshSubscriptionRows = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, preference.userId),
          isNull(pushSubscriptions.revokedAt)
        )
      )
      .limit(5);

    let runSent = 0;
    let runFailed = 0;
    let deliveryStarted = false;
    let interruptedStatus: DailyReminderRunStatus | null = null;
    for (const row of freshSubscriptionRows) {
      const stillEnabled = await db
        .select({ enabled: dailyReminderPreferences.enabled })
        .from(dailyReminderPreferences)
        .where(eq(dailyReminderPreferences.userId, preference.userId))
        .limit(1);
      if (!stillEnabled[0]?.enabled) {
        interruptedStatus = "skipped_disabled";
        break;
      }
      if (
        await hasTransactionOnLocalDate(
          preference.userId,
          localClock.localDate,
          preference.timeZone
        )
      ) {
        interruptedStatus = "skipped_transaction";
        break;
      }
      const currentSubscription = await db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.id, row.id),
            eq(pushSubscriptions.userId, preference.userId),
            isNull(pushSubscriptions.revokedAt)
          )
        )
        .limit(1);
      if (currentSubscription.length === 0) continue;
      const currentRow = currentSubscription[0];

      if (currentRow.expirationTime && currentRow.expirationTime <= now) {
        runFailed += 1;
        result.failed += 1;
        result.gone += 1;
        await revokeSubscription(row.id, now);
        continue;
      }

      result.attempted += 1;
      if (!deliveryStarted) {
        const deliveryClaim = await db
          .update(dailyReminderRuns)
          .set({ deliveryStartedAt: now })
          .where(
            and(
              eq(dailyReminderRuns.id, runId),
              eq(dailyReminderRuns.status, "claimed"),
              isNull(dailyReminderRuns.deliveryStartedAt)
            )
          )
          .returning({ id: dailyReminderRuns.id });
        if (deliveryClaim.length === 0) {
          interruptedStatus = "failed";
          break;
        }
        deliveryStarted = true;
      }
      const delivery = await sender(rowToPushSubscription(currentRow));
      if (delivery.ok) {
        runSent += 1;
        result.sent += 1;
        continue;
      }

      runFailed += 1;
      result.failed += 1;
      if (delivery.statusCode === 404 || delivery.statusCode === 410) {
        result.gone += 1;
        await revokeSubscription(row.id, now);
      }
    }

    if (interruptedStatus && runSent === 0) result.skipped += 1;

    await completeRun({
      runId,
      status:
        interruptedStatus && runSent === 0
          ? interruptedStatus
          : getCompletedRunStatus(runSent, runFailed),
      sentCount: runSent,
      failedCount: runFailed,
      now,
    });
  }

  return result;
};

const hasTransactionOnLocalDate = async (
  userId: string,
  localDate: string,
  timeZone: string
) => {
  const query = await db.execute<{ has_transaction: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM ${transactions}
      WHERE ${transactions.userId} = ${userId}
        AND ${transactions.occurredAt} >= (${localDate}::date::timestamp AT TIME ZONE ${timeZone})
        AND ${transactions.occurredAt} < (((${localDate}::date + 1)::timestamp) AT TIME ZONE ${timeZone})
    ) AS has_transaction
  `);
  return query.rows[0]?.has_transaction ?? false;
};

const completeRun = async ({
  runId,
  status,
  sentCount,
  failedCount,
  now,
}: {
  runId: string;
  status: DailyReminderRunStatus;
  sentCount: number;
  failedCount: number;
  now: Date;
}) => {
  await db
    .update(dailyReminderRuns)
    .set({ status, sentCount, failedCount, completedAt: now })
    .where(eq(dailyReminderRuns.id, runId));
};

const revokeSubscription = async (id: string, now: Date) => {
  await db
    .update(pushSubscriptions)
    .set({ revokedAt: now, updatedAt: now })
    .where(eq(pushSubscriptions.id, id));
};

const getCompletedRunStatus = (
  sentCount: number,
  failedCount: number
): DailyReminderRunStatus => {
  if (sentCount > 0 && failedCount === 0) return "sent";
  if (sentCount > 0) return "partial";
  return "failed";
};

const rowToPushSubscription = (
  row: typeof pushSubscriptions.$inferSelect
): PushSubscriptionRecord => {
  return {
    id: row.id,
    userId: row.userId,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    expirationTime: row.expirationTime?.toISOString() ?? null,
    userAgent: row.userAgent,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};
