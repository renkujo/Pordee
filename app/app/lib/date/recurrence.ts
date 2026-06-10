import { parseDayValue, todayDayValue } from "./day-value";
import type {
  RecurringFrequency,
  RecurringTemplate,
  RecurringTemplateStatus,
} from "~/lib/db/types";

export interface RecurrenceRuleInput {
  frequency: RecurringFrequency;
  weeklyDay: number | null;
  monthlyDay: number | null;
  yearlyMonth: number | null;
  yearlyDay: number | null;
  startDate: string;
  endDate: string | null;
}

type RecurrenceTemplateLike = Pick<
  RecurringTemplate,
  | "frequency"
  | "weeklyDay"
  | "monthlyDay"
  | "yearlyMonth"
  | "yearlyDay"
  | "startDate"
  | "endDate"
  | "status"
>;

export const getInitialNextRunOn = (
  input: RecurrenceRuleInput,
  fromDay = input.startDate
): string | null => {
  const start = maxDay(input.startDate, fromDay);
  const next = getFirstRunOnOrAfter(input, start);
  if (!next || (input.endDate && next > input.endDate)) return null;
  return next;
};

export const getNextRunOnAfter = (
  input: RecurrenceRuleInput,
  previousRunOn: string
): string | null => {
  const previousDate = parseDayValue(previousRunOn);
  if (!previousDate) return null;

  let next: string | null = null;

  if (input.frequency === "daily") {
    next = addDays(previousRunOn, 1);
  }

  if (input.frequency === "weekly") {
    next = addDays(previousRunOn, 7);
  }

  if (input.frequency === "monthly") {
    const day = input.monthlyDay ?? previousDate.getDate();
    next = monthDay(
      previousDate.getFullYear(),
      previousDate.getMonth() + 2,
      day
    );
  }

  if (input.frequency === "yearly") {
    const month = input.yearlyMonth ?? previousDate.getMonth() + 1;
    const day = input.yearlyDay ?? previousDate.getDate();
    next = monthDay(previousDate.getFullYear() + 1, month, day);
  }

  if (!next || (input.endDate && next > input.endDate)) return null;
  return next;
};

export const getResumeNextRunOn = (
  template: RecurrenceTemplateLike,
  now = new Date()
): string | null => {
  if (template.status === "completed") return null;
  return getInitialNextRunOn(template, todayDayValue(now));
};

export const describeRecurringFrequency = (
  input: Pick<
    RecurrenceRuleInput,
    "frequency" | "weeklyDay" | "monthlyDay" | "yearlyMonth" | "yearlyDay"
  >
) => {
  if (input.frequency === "daily") return "ทุกวัน";
  if (input.frequency === "weekly") {
    return `ทุก${WEEKDAY_LABELS[input.weeklyDay ?? 1]}`;
  }
  if (input.frequency === "monthly") {
    return `ทุกวันที่ ${input.monthlyDay ?? 1} ของเดือน`;
  }
  return `ทุกวันที่ ${input.yearlyDay ?? 1}/${input.yearlyMonth ?? 1} ของปี`;
};

export const normalizeRecurringStatus = (
  nextRunOn: string | null,
  fallback: RecurringTemplateStatus = "active"
): RecurringTemplateStatus => {
  return nextRunOn ? fallback : "completed";
};

const WEEKDAY_LABELS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const getFirstRunOnOrAfter = (
  input: RecurrenceRuleInput,
  fromDay: string
): string | null => {
  const fromDate = parseDayValue(fromDay);
  if (!fromDate) return null;

  if (input.frequency === "daily") return fromDay;

  if (input.frequency === "weekly") {
    const weeklyDay = input.weeklyDay ?? fromDate.getDay();
    const diff = (weeklyDay - fromDate.getDay() + 7) % 7;
    return addDays(fromDay, diff);
  }

  if (input.frequency === "monthly") {
    const day = input.monthlyDay ?? fromDate.getDate();
    const thisMonth = monthDay(
      fromDate.getFullYear(),
      fromDate.getMonth() + 1,
      day
    );
    if (thisMonth >= fromDay) return thisMonth;
    return monthDay(fromDate.getFullYear(), fromDate.getMonth() + 2, day);
  }

  const month = input.yearlyMonth ?? fromDate.getMonth() + 1;
  const day = input.yearlyDay ?? fromDate.getDate();
  const thisYear = monthDay(fromDate.getFullYear(), month, day);
  if (thisYear >= fromDay) return thisYear;
  return monthDay(fromDate.getFullYear() + 1, month, day);
};

const monthDay = (year: number, oneBasedMonth: number, day: number): string => {
  const normalizedMonth = oneBasedMonth - 1;
  const last = new Date(year, normalizedMonth + 1, 0).getDate();
  return todayDayValue(new Date(year, normalizedMonth, Math.min(day, last)));
};

const addDays = (dayValue: string, days: number): string | null => {
  const date = parseDayValue(dayValue);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return todayDayValue(date);
};

const maxDay = (a: string, b: string) => {
  return a > b ? a : b;
};
