import { useEffect, useState } from "react";
import { Bell, BellRing, CheckCircle2, Clock3, Smartphone } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { DailyReminderPreference } from "~/lib/db";
import { cn } from "~/lib/cn";
import { usePordeeTranslation } from "~/lib/i18n/provider";

type DeviceState =
  | "checking"
  | "unsupported"
  | "install-required"
  | "permission-default"
  | "permission-denied"
  | "subscribed"
  | "unsubscribed"
  | "error";

interface DailyCheckInNotificationsProps {
  activeDeviceCount: number;
  preference: DailyReminderPreference;
  pushConfigured: boolean;
  vapidPublicKey: string | null;
}

export const DailyCheckInNotifications = ({
  activeDeviceCount,
  preference,
  pushConfigured,
  vapidPublicKey,
}: DailyCheckInNotificationsProps) => {
  const t = usePordeeTranslation();
  const [deviceState, setDeviceState] = useState<DeviceState>("checking");
  const [enabled, setEnabled] = useState(preference.enabled);
  const [localTime, setLocalTime] = useState(preference.localTime);
  const [savedLocalTime, setSavedLocalTime] = useState(preference.localTime);
  const [deviceCount, setDeviceCount] = useState(activeDeviceCount);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const inspectDevice = async () => {
      if (!pushConfigured || !vapidPublicKey || !supportsWebPush()) {
        if (active) setDeviceState("unsupported");
        return;
      }
      if (isIosBrowserWithoutStandaloneMode()) {
        if (active) setDeviceState("install-required");
        return;
      }
      if (Notification.permission === "denied") {
        if (active) setDeviceState("permission-denied");
        return;
      }
      if (Notification.permission === "default") {
        if (active) setDeviceState("permission-default");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (active) {
          setDeviceState(subscription ? "subscribed" : "unsubscribed");
        }
      } catch {
        if (active) setDeviceState("error");
      }
    };

    void inspectDevice();
    return () => {
      active = false;
    };
  }, [pushConfigured, vapidPublicKey]);

  const enableReminder = async () => {
    if (!vapidPublicKey || !supportsWebPush()) return;
    setIsBusy(true);
    setFeedback(null);
    let createdSubscription: PushSubscription | null = null;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDeviceState(
          permission === "denied" ? "permission-denied" : "permission-default"
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));
      if (!existing) createdSubscription = subscription;

      const result = await requestPushApi({
        operation: "subscribe",
        schedule: {
          localTime,
          timeZone: preference.timeZone,
        },
        subscription: subscription.toJSON(),
      });
      setEnabled(true);
      setSavedLocalTime(localTime);
      setDeviceState("subscribed");
      setDeviceCount(result.activeDeviceCount ?? 1);
      setFeedback(t("settings.notifications.feedback.enabled"));
    } catch {
      if (createdSubscription) await createdSubscription.unsubscribe();
      setDeviceState("error");
      setFeedback(t("settings.notifications.feedback.error"));
    } finally {
      setIsBusy(false);
    }
  };

  const disableReminder = async () => {
    setIsBusy(true);
    setFeedback(null);
    try {
      const result = await requestPushApi({
        operation: "disable",
        schedule: {
          localTime,
          timeZone: preference.timeZone,
        },
      });
      if (supportsWebPush() && Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }
      setEnabled(false);
      setDeviceCount(result.activeDeviceCount ?? 0);
      setDeviceState("unsubscribed");
      setFeedback(t("settings.notifications.feedback.disabled"));
    } catch {
      setFeedback(t("settings.notifications.feedback.error"));
    } finally {
      setIsBusy(false);
    }
  };

  const saveTime = async () => {
    setIsBusy(true);
    setFeedback(null);
    try {
      await requestPushApi({
        operation: "update-schedule",
        schedule: {
          localTime,
          timeZone: preference.timeZone,
        },
      });
      setSavedLocalTime(localTime);
      setFeedback(t("settings.notifications.feedback.timeSaved"));
    } catch {
      setFeedback(t("settings.notifications.feedback.error"));
    } finally {
      setIsBusy(false);
    }
  };

  const sendTest = async () => {
    setIsBusy(true);
    setFeedback(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) throw new Error("missing subscription");
      await requestPushApi({
        operation: "test",
        endpoint: subscription.endpoint,
      });
      setFeedback(t("settings.notifications.feedback.testSent"));
    } catch {
      setFeedback(t("settings.notifications.feedback.testFailed"));
    } finally {
      setIsBusy(false);
    }
  };

  const deviceDescription = getDeviceDescription(deviceState, t);
  const canEnable =
    pushConfigured &&
    (!enabled || deviceState !== "subscribed") &&
    (deviceState === "permission-default" ||
      deviceState === "unsubscribed" ||
      deviceState === "subscribed" ||
      deviceState === "error");

  return (
    <Card className="overflow-hidden rounded-[18px]">
      <CardHeader className="border-line bg-sky/20 gap-2 border-b">
        <div className="flex items-start gap-3">
          <div className="bg-sky text-teal flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>{t("settings.notifications.daily.title")}</CardTitle>
            <p className="text-muted mt-2 text-sm leading-6">
              {t("settings.notifications.daily.description")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 sm:p-5">
        <div className="border-line bg-surface grid gap-4 rounded-[14px] border p-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Clock3 className="text-teal h-4 w-4" />
              <Label htmlFor="daily-reminder-time">
                {t("settings.notifications.time.label")}
              </Label>
            </div>
            <p className="text-muted mt-2 text-sm leading-6">
              {t("settings.notifications.time.description", {
                timeZone: preference.timeZone,
              })}
            </p>
          </div>
          <Input
            id="daily-reminder-time"
            type="time"
            value={localTime}
            onChange={(event) => setLocalTime(event.currentTarget.value)}
            disabled={isBusy}
          />
        </div>

        <div className="border-line grid gap-4 rounded-[14px] border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Smartphone className="text-teal h-4 w-4" />
              <p className="text-ink text-sm font-semibold">
                {t("settings.notifications.device.title")}
              </p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  enabled ? "bg-teal/10 text-teal" : "bg-sky text-muted"
                )}
              >
                {enabled
                  ? t("settings.notifications.status.enabled")
                  : t("settings.notifications.status.disabled")}
              </span>
            </div>
            <p className="text-muted mt-2 text-sm leading-6">
              {deviceDescription}
            </p>
            <p className="text-muted mt-1 text-xs">
              {t("settings.notifications.device.count", {
                count: deviceCount,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {canEnable ? (
              <Button type="button" onClick={enableReminder} disabled={isBusy}>
                <Bell className="h-4 w-4" />
                {t("settings.notifications.enable")}
              </Button>
            ) : null}
            {enabled ? (
              <Button
                type="button"
                variant="secondary"
                onClick={disableReminder}
                disabled={isBusy}
              >
                {t("settings.notifications.disable")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted flex items-center gap-2 text-sm">
            <CheckCircle2 className="text-teal h-4 w-4 shrink-0" />
            {t("settings.notifications.skipLogged")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={saveTime}
              disabled={isBusy || localTime === savedLocalTime}
            >
              {t("settings.notifications.saveTime")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={sendTest}
              disabled={
                isBusy || deviceState !== "subscribed" || !pushConfigured
              }
            >
              {t("settings.notifications.test")}
            </Button>
          </div>
        </div>

        {feedback ? (
          <p
            className="border-line bg-sky/40 text-ink rounded-[12px] border px-3 py-2 text-sm"
            role="status"
          >
            {feedback}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

const supportsWebPush = () => {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

const isIosBrowserWithoutStandaloneMode = () => {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = (navigator as Navigator & { standalone?: boolean })
    .standalone;
  return isIos && standalone !== true;
};

const requestPushApi = async (body: unknown) => {
  const response = await fetch("/api/push-subscriptions", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("push request failed");
  return (await response.json()) as { activeDeviceCount?: number };
};

const urlBase64ToUint8Array = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

const getDeviceDescription = (
  state: DeviceState,
  t: ReturnType<typeof usePordeeTranslation>
) => {
  if (state === "checking") return t("settings.notifications.device.checking");
  if (state === "unsupported")
    return t("settings.notifications.device.unsupported");
  if (state === "install-required")
    return t("settings.notifications.device.installRequired");
  if (state === "permission-denied")
    return t("settings.notifications.device.denied");
  if (state === "subscribed")
    return t("settings.notifications.device.connected");
  if (state === "unsubscribed")
    return t("settings.notifications.device.notConnected");
  if (state === "error") return t("settings.notifications.device.error");
  return t("settings.notifications.device.ready");
};
