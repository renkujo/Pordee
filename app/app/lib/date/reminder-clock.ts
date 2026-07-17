export const getLocalReminderClock = (now: Date, timeZone: string) => {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value])
    );
    if (
      !values.year ||
      !values.month ||
      !values.day ||
      !values.hour ||
      !values.minute
    ) {
      return null;
    }
    return {
      localDate: `${values.year}-${values.month}-${values.day}`,
      localTime: `${values.hour}:${values.minute}`,
    };
  } catch {
    return null;
  }
};
