import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { drizzleRepo } from "~/lib/db/drizzle";
import { db, pool } from "~/lib/db/client";
import { ensureFinanceDatabase } from "~/lib/db/migrate.server";
import {
  categories,
  dailyReminderPreferences,
  dailyReminderRuns,
  goalContributions,
  goals,
  pushSubscriptions,
  transactions,
} from "~/lib/db/schema";
import { processDailyReminders } from "~/lib/notifications/reminder-scheduler.server";

const USER_A = "itest-user-a";
const USER_B = "itest-user-b";

beforeEach(async () => {
  await ensureFinanceDatabase();
  await db.delete(dailyReminderRuns);
  await db.delete(pushSubscriptions);
  await db.delete(dailyReminderPreferences);
  await db.delete(goalContributions);
  await db.delete(goals);
  await db.delete(transactions);
  await db.delete(categories);
});

afterAll(async () => {
  await pool.end();
});

describe("drizzleRepo categories", () => {
  it("seeds default categories per user on first access", async () => {
    const cats = await drizzleRepo.listCategories(USER_A);
    expect(cats).toHaveLength(5);
    expect(cats.every((c) => c.userId === USER_A)).toBe(true);
    // No re-seed on second call.
    expect(await drizzleRepo.listCategories(USER_A)).toHaveLength(5);
  });

  it("blocks deleting a category in use", async () => {
    const cat = await drizzleRepo.createCategory(USER_A, {
      name: "อาหาร",
      kind: "expense",
    });
    await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "กาแฟ",
      amount: 55,
      categoryId: cat.id,
      note: null,
      occurredAt: "2026-05-01T03:00:00.000Z",
    });
    expect(await drizzleRepo.countTransactionsByCategory(USER_A, cat.id)).toBe(
      1
    );
    expect(await drizzleRepo.deleteCategory(USER_A, cat.id)).toBe(false);
  });
});

describe("drizzleRepo transactions", () => {
  it("lists newest first and round-trips numeric amount as number", async () => {
    const earlier = await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "เก่า",
      amount: 12.5,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-01T00:00:00.000Z",
    });
    const later = await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ใหม่",
      amount: 120,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    const all = await drizzleRepo.listTransactions(USER_A);
    expect(all.map((t) => t.id)).toEqual([later.id, earlier.id]);
    // numeric(12,2) "12.50" reads back as number 12.5, not "12.50".
    const reread = await drizzleRepo.getTransaction(USER_A, earlier.id);
    expect(reread?.amount).toBe(12.5);
    expect(typeof reread?.amount).toBe("number");
  });

  it("filters by kind and category", async () => {
    const bills = await drizzleRepo.createCategory(USER_A, {
      name: "บิล",
      kind: "expense",
    });
    await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "บิลน้ำ",
      amount: 200,
      categoryId: bills.id,
      note: null,
      occurredAt: "2026-05-05T00:00:00.000Z",
    });
    await drizzleRepo.createTransaction(USER_A, {
      kind: "income",
      title: "เงินเดือน",
      amount: 30000,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-25T00:00:00.000Z",
    });
    expect(
      await drizzleRepo.listTransactions(USER_A, { kind: "income" })
    ).toHaveLength(1);
    expect(
      await drizzleRepo.listTransactions(USER_A, { categoryId: bills.id })
    ).toHaveLength(1);
  });

  it("rejects another user's category on create and update", async () => {
    const category = await drizzleRepo.createCategory(USER_A, {
      name: "ส่วนตัว A",
      kind: "expense",
    });
    await expect(
      drizzleRepo.createTransaction(USER_B, {
        kind: "expense",
        title: "แอบใช้หมวด",
        amount: 10,
        categoryId: category.id,
        note: null,
        occurredAt: "2026-05-10T00:00:00.000Z",
      })
    ).rejects.toThrow("category not found for user");

    const tx = await drizzleRepo.createTransaction(USER_B, {
      kind: "expense",
      title: "ของ B",
      amount: 100,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    await expect(
      drizzleRepo.updateTransaction(USER_B, tx.id, {
        kind: "expense",
        title: "ของ B",
        amount: 100,
        categoryId: category.id,
        note: null,
        occurredAt: tx.occurredAt,
      })
    ).rejects.toThrow("category not found for user");
    expect(
      (await drizzleRepo.getTransaction(USER_B, tx.id))?.categoryId
    ).toBeNull();
  });
});

describe("drizzleRepo goals", () => {
  it("computes saved as the sum of contributions", async () => {
    const goal = await drizzleRepo.createGoal(USER_A, {
      name: "ทริป",
      target: 8000,
    });
    expect(goal.saved).toBe(0);
    await drizzleRepo.addContribution(USER_A, {
      goalId: goal.id,
      amount: 1500,
      note: null,
      occurredAt: "2026-05-15T00:00:00.000Z",
    });
    await drizzleRepo.addContribution(USER_A, {
      goalId: goal.id,
      amount: 500.25,
      note: "เพิ่ม",
      occurredAt: "2026-05-20T00:00:00.000Z",
    });
    const goals = await drizzleRepo.listGoals(USER_A);
    expect(goals).toHaveLength(1);
    expect(goals[0].saved).toBe(2000.25);
  });

  it("rejects a contribution to another user's goal", async () => {
    const goal = await drizzleRepo.createGoal(USER_A, {
      name: "ของ A",
      target: 1000,
    });
    await expect(
      drizzleRepo.addContribution(USER_B, {
        goalId: goal.id,
        amount: 100,
        note: null,
        occurredAt: "2026-05-20T00:00:00.000Z",
      })
    ).rejects.toThrow();
    expect((await drizzleRepo.listGoals(USER_A))[0].saved).toBe(0);
  });
});

describe("drizzleRepo user isolation", () => {
  it("scopes reads and writes by user", async () => {
    const tx = await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ของ A",
      amount: 99,
      categoryId: null,
      note: null,
      occurredAt: "2026-05-10T00:00:00.000Z",
    });
    expect(await drizzleRepo.listTransactions(USER_B)).toHaveLength(0);
    expect(await drizzleRepo.getTransaction(USER_B, tx.id)).toBeNull();
    expect(
      await drizzleRepo.updateTransaction(USER_B, tx.id, {
        kind: "expense",
        title: "hijack",
        amount: 1,
        categoryId: null,
        note: null,
        occurredAt: tx.occurredAt,
      })
    ).toBeNull();
    expect(await drizzleRepo.deleteTransaction(USER_B, tx.id)).toBe(false);
    expect((await drizzleRepo.getTransaction(USER_A, tx.id))?.title).toBe(
      "ของ A"
    );
  });
});

describe("daily reminder persistence and scheduler", () => {
  const subscribe = async (userId = USER_A) => {
    await drizzleRepo.upsertPushSubscription(userId, {
      endpoint: `https://push.example.test/${userId}`,
      p256dh: `key-${userId}`,
      auth: `auth-${userId}`,
      expirationTime: null,
      userAgent: "integration-test",
    });
    await drizzleRepo.updateDailyReminderPreference(userId, {
      enabled: true,
      localTime: "20:00",
      timeZone: "Asia/Bangkok",
    });
  };

  it("persists defaults, updates, and user-scoped subscriptions", async () => {
    const initial = await drizzleRepo.getDailyReminderPreference(USER_A);
    expect(initial).toMatchObject({
      enabled: false,
      localTime: "20:00",
      timeZone: "Asia/Bangkok",
    });

    await subscribe();
    expect(await drizzleRepo.countActivePushSubscriptions(USER_A)).toBe(1);
    expect(await drizzleRepo.countActivePushSubscriptions(USER_B)).toBe(0);
    expect(
      await drizzleRepo.revokePushSubscription(
        USER_B,
        `https://push.example.test/${USER_A}`
      )
    ).toBe(false);
  });

  it("enables with a subscription atomically and revokes all devices on disable", async () => {
    const enabled = await drizzleRepo.enableDailyReminder(
      USER_A,
      { localTime: "20:00", timeZone: "Asia/Bangkok" },
      {
        endpoint: "https://push.example.test/first",
        p256dh: "first-key",
        auth: "first-auth",
        expirationTime: null,
        userAgent: null,
      }
    );
    await drizzleRepo.upsertPushSubscription(USER_A, {
      endpoint: "https://push.example.test/second",
      p256dh: "second-key",
      auth: "second-auth",
      expirationTime: null,
      userAgent: null,
    });
    expect(enabled).toMatchObject({
      activeDeviceCount: 1,
      preference: { enabled: true },
    });
    expect(await drizzleRepo.countActivePushSubscriptions(USER_A)).toBe(2);

    const disabled = await drizzleRepo.disableDailyReminder(USER_A, {
      localTime: "20:00",
      timeZone: "Asia/Bangkok",
    });
    expect(disabled).toMatchObject({
      activeDeviceCount: 0,
      preference: { enabled: false },
    });
    expect(await drizzleRepo.countActivePushSubscriptions(USER_A)).toBe(0);
  });

  it("rolls back a sixth active device", async () => {
    for (let index = 1; index <= 5; index += 1) {
      await drizzleRepo.enableDailyReminder(
        USER_A,
        { localTime: "20:00", timeZone: "Asia/Bangkok" },
        {
          endpoint: `https://push.example.test/device-${index}`,
          p256dh: `key-${index}`,
          auth: `auth-${index}`,
          expirationTime: null,
          userAgent: null,
        }
      );
    }

    await expect(
      drizzleRepo.enableDailyReminder(
        USER_A,
        { localTime: "19:00", timeZone: "Asia/Bangkok" },
        {
          endpoint: "https://push.example.test/device-6",
          p256dh: "key-6",
          auth: "auth-6",
          expirationTime: null,
          userAgent: null,
        }
      )
    ).rejects.toThrow("push subscription limit reached");
    expect(await drizzleRepo.countActivePushSubscriptions(USER_A)).toBe(5);
    expect(await drizzleRepo.getDailyReminderPreference(USER_A)).toMatchObject({
      enabled: true,
      localTime: "20:00",
    });
  });

  it("waits until 20:00 Bangkok and sends at most once per local day", async () => {
    await subscribe();
    let sendCount = 0;
    const send = async () => {
      sendCount += 1;
      return { ok: true, statusCode: 201 };
    };

    const early = await processDailyReminders({
      now: new Date("2026-06-02T12:59:00.000Z"),
      send,
    });
    expect(early.claimed).toBe(0);

    const [first, overlapping] = await Promise.all([
      processDailyReminders({
        now: new Date("2026-06-02T13:00:00.000Z"),
        send,
      }),
      processDailyReminders({
        now: new Date("2026-06-02T13:00:00.000Z"),
        send,
      }),
    ]);
    expect(first.claimed + overlapping.claimed).toBe(1);
    expect(sendCount).toBe(1);

    const repeated = await processDailyReminders({
      now: new Date("2026-06-02T15:00:00.000Z"),
      send,
    });
    expect(repeated.claimed).toBe(0);
    expect(sendCount).toBe(1);
  });

  it("skips a reminder when that Bangkok date already has a transaction", async () => {
    await subscribe();
    await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "กาแฟวันนี้",
      amount: 65,
      categoryId: null,
      note: null,
      occurredAt: "2026-06-02T01:00:00.000Z",
    });
    let sendCount = 0;
    const result = await processDailyReminders({
      now: new Date("2026-06-02T13:00:00.000Z"),
      send: async () => {
        sendCount += 1;
        return { ok: true, statusCode: 201 };
      },
    });

    expect(result).toMatchObject({ claimed: 1, skipped: 1, sent: 0 });
    expect(sendCount).toBe(0);
  });

  it("does not let the previous Bangkok date suppress today's reminder", async () => {
    await subscribe();
    await drizzleRepo.createTransaction(USER_A, {
      kind: "expense",
      title: "ก่อนเที่ยงคืน",
      amount: 50,
      categoryId: null,
      note: null,
      occurredAt: "2026-06-01T16:59:59.000Z",
    });
    const result = await processDailyReminders({
      now: new Date("2026-06-02T13:00:00.000Z"),
      send: async () => ({ ok: true, statusCode: 201 }),
    });

    expect(result).toMatchObject({ claimed: 1, skipped: 0, sent: 1 });
  });

  it("revokes a stale push endpoint without retrying the daily run", async () => {
    await subscribe();
    const result = await processDailyReminders({
      now: new Date("2026-06-02T13:00:00.000Z"),
      send: async () => ({ ok: false, statusCode: 410 }),
    });

    expect(result).toMatchObject({
      claimed: 1,
      attempted: 1,
      failed: 1,
      gone: 1,
    });
    expect(await drizzleRepo.countActivePushSubscriptions(USER_A)).toBe(0);
  });

  it("reclaims a stale run only when delivery never started", async () => {
    await subscribe();
    await db.insert(dailyReminderRuns).values({
      id: "stale-before-delivery",
      userId: USER_A,
      localDate: "2026-06-02",
      timeZone: "Asia/Bangkok",
      scheduledLocalTime: "20:00",
      status: "claimed",
      subscriptionCount: 1,
      sentCount: 0,
      failedCount: 0,
      claimedAt: new Date("2026-06-02T12:00:00.000Z"),
      deliveryStartedAt: null,
      completedAt: null,
    });

    const recovered = await processDailyReminders({
      now: new Date("2026-06-02T13:00:00.000Z"),
      send: async () => ({ ok: true, statusCode: 201 }),
    });
    expect(recovered).toMatchObject({ claimed: 1, sent: 1 });
  });

  it("does not retry a stale run after delivery may have started", async () => {
    await subscribe();
    await db.insert(dailyReminderRuns).values({
      id: "stale-after-delivery",
      userId: USER_A,
      localDate: "2026-06-02",
      timeZone: "Asia/Bangkok",
      scheduledLocalTime: "20:00",
      status: "claimed",
      subscriptionCount: 1,
      sentCount: 0,
      failedCount: 0,
      claimedAt: new Date("2026-06-02T12:00:00.000Z"),
      deliveryStartedAt: new Date("2026-06-02T12:00:01.000Z"),
      completedAt: null,
    });
    let sendCount = 0;

    const result = await processDailyReminders({
      now: new Date("2026-06-02T13:00:00.000Z"),
      send: async () => {
        sendCount += 1;
        return { ok: true, statusCode: 201 };
      },
    });
    expect(result.claimed).toBe(0);
    expect(sendCount).toBe(0);
    const rows = await db
      .select({ status: dailyReminderRuns.status })
      .from(dailyReminderRuns);
    expect(rows).toEqual([{ status: "failed" }]);
  });
});
