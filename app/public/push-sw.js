self.addEventListener("push", (event) => {
  let type = "daily-check-in";
  try {
    const payload = event.data?.json();
    if (payload?.type === "test") type = "test";
  } catch {
    // A malformed payload still produces a safe generic reminder.
  }

  const notification =
    type === "test"
      ? {
          title: "การแจ้งเตือนพร้อมแล้ว",
          body: "เครื่องนี้รับการเตือนจากพอดีได้ตามปกติ",
          route: "/settings?tab=notifications",
          tag: "pordee-reminder-test",
        }
      : {
          title: "แวะเช็กอินวันนี้",
          body: "ถ้ามีรายรับหรือรายจ่ายวันนี้ บันทึกไว้สั้น ๆ ได้เลย",
          route: "/add?from=daily-check-in",
          tag: "pordee-daily-check-in",
        };

  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      data: { route: notification.route },
      icon: "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      tag: notification.tag,
      renotify: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route =
    event.notification.data?.route === "/settings?tab=notifications"
      ? "/settings?tab=notifications"
      : "/add?from=daily-check-in";
  const targetUrl = new URL(route, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        const client = windowClients.find(
          (item) => new URL(item.url).origin === self.location.origin
        );
        if (client) {
          if ("navigate" in client) await client.navigate(targetUrl);
          return client.focus();
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
