import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

type WorkerHandler = (event: {
  data?: { json: () => unknown };
  notification?: { close: () => void; data?: unknown };
  waitUntil: (promise: Promise<unknown>) => void;
}) => void;

const workerSource = readFileSync(resolve("public/push-sw.js"), "utf8");

const createWorker = () => {
  const handlers = new Map<string, WorkerHandler>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const worker = {
    addEventListener: (type: string, handler: WorkerHandler) => {
      handlers.set(type, handler);
    },
    clients: {
      matchAll: vi.fn().mockResolvedValue([]),
      openWindow,
    },
    location: { origin: "https://pordee.test" },
    registration: { showNotification },
  };

  vm.runInNewContext(workerSource, { self: worker, URL });
  return { handlers, openWindow, showNotification };
};

describe("Pordee push service worker", () => {
  it("shows a generic daily reminder with the allowlisted add route", async () => {
    const { handlers, showNotification } = createWorker();
    let completion: Promise<unknown> | undefined;

    handlers.get("push")?.({
      data: { json: () => ({ type: "daily-check-in", route: "/evil" }) },
      waitUntil: (promise) => {
        completion = promise;
      },
    });
    await completion;

    expect(showNotification).toHaveBeenCalledWith(
      "แวะเช็กอินวันนี้",
      expect.objectContaining({
        data: { route: "/add?from=daily-check-in" },
        tag: "pordee-daily-check-in",
      })
    );
  });

  it("opens /add for any untrusted notification route", async () => {
    const { handlers, openWindow } = createWorker();
    let completion: Promise<unknown> | undefined;
    const close = vi.fn();

    handlers.get("notificationclick")?.({
      notification: { close, data: { route: "https://evil.test" } },
      waitUntil: (promise) => {
        completion = promise;
      },
    });
    await completion;

    expect(close).toHaveBeenCalledOnce();
    expect(openWindow).toHaveBeenCalledWith(
      "https://pordee.test/add?from=daily-check-in"
    );
  });
});
