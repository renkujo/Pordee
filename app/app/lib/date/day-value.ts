/**
 * Helpers for the `YYYY-MM-DD` day strings used by the date picker, and for
 * converting between them and the ISO datetimes stored on records.
 *
 * Day values are interpreted in the local time zone. When converting to ISO we
 * anchor to local noon so the saved day matches the picked day regardless of
 * the viewer's time zone.
 */

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dayLabelFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Today as a local `YYYY-MM-DD` string. */
export const todayDayValue = (now: Date = new Date()): string => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Parse a local `YYYY-MM-DD` string into a Date, or `null` when invalid. */
export const parseDayValue = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = DAY_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Convert a local `YYYY-MM-DD` string to an ISO datetime, or `null` when invalid. */
export const dayValueToIso = (value?: string | null): string | null => {
  const match = value ? DAY_PATTERN.exec(value.trim()) : null;
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Convert a local `YYYY-MM-DD` string to the first instant of that day. */
export const dayValueToStartIso = (value?: string | null): string | null => {
  const match = value ? DAY_PATTERN.exec(value.trim()) : null;
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Convert a local `YYYY-MM-DD` string to the last instant of that day. */
export const dayValueToEndIso = (value?: string | null): string | null => {
  const match = value ? DAY_PATTERN.exec(value.trim()) : null;
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    23,
    59,
    59,
    999
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Convert an ISO datetime to a local `YYYY-MM-DD` string, or `""` when invalid. */
export const isoToDayValue = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : todayDayValue(date);
};

/** Format a local `YYYY-MM-DD` string as a Thai date, falling back to "วันนี้". */
export const formatDayLabel = (value: string): string => {
  const date = parseDayValue(value);
  return date ? dayLabelFormatter.format(date) : "วันนี้";
};
