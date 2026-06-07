import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/cn";
import { usePordeeLocale, usePordeeTranslation } from "~/lib/i18n/provider";
import type { PordeeLocale } from "~/lib/i18n/messages";

type PastDatePreset =
  | { labelId: string; daysFromToday: number; monthStart?: never }
  | { labelId: string; monthStart: true; daysFromToday?: never };

const pastDatePresets: PastDatePreset[] = [
  { labelId: "datePreset.today", daysFromToday: 0 },
  { labelId: "datePreset.yesterday", daysFromToday: -1 },
  { labelId: "datePreset.threeDaysAgo", daysFromToday: -3 },
  { labelId: "datePreset.sevenDaysAgo", daysFromToday: -7 },
  { labelId: "datePreset.monthStart", monthStart: true },
];

interface DatePickerProps {
  /** Selected value as a local `YYYY-MM-DD` string, or empty when unset. */
  value: string;
  /** Called with the new `YYYY-MM-DD` string when a day is picked. */
  onChange: (value: string) => void;
  /** Earliest selectable day as `YYYY-MM-DD`. Earlier days are disabled. */
  min?: string;
  /** Latest selectable day as `YYYY-MM-DD`. Later days are disabled. */
  max?: string;
  id?: string;
  placeholder?: string;
  showPresets?: boolean;
  "aria-describedby"?: string;
}

interface MonthPickerProps {
  /** Selected value as a local `YYYY-MM` string, or empty when unset. */
  value: string;
  /** Called with the new `YYYY-MM` string when a month is picked. */
  onChange: (value: string) => void;
  /** Earliest selectable month as `YYYY-MM`. Earlier months are disabled. */
  min?: string;
  /** Latest selectable month as `YYYY-MM`. Later months are disabled. */
  max?: string;
  id?: string;
  placeholder?: string;
  "aria-describedby"?: string;
}

interface DateRangePickerProps {
  /** Selected start day as a local `YYYY-MM-DD` string. */
  from: string;
  /** Selected end day as a local `YYYY-MM-DD` string. */
  to: string;
  /** Called with local `YYYY-MM-DD` strings when the selected range changes. */
  onChange: (range: { from: string; to: string }) => void;
  /** Earliest selectable day as `YYYY-MM-DD`. Earlier days are disabled. */
  min?: string;
  /** Latest selectable day as `YYYY-MM-DD`. Later days are disabled. */
  max?: string;
  id?: string;
  placeholder?: string;
  "aria-describedby"?: string;
}

export const DatePicker = ({
  value,
  onChange,
  min,
  max,
  id,
  placeholder,
  showPresets = false,
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) => {
  const { locale } = usePordeeLocale();
  const t = usePordeeTranslation();
  const [open, setOpen] = React.useState(false);
  const selected = parseLocalDate(value);
  const minDate = parseLocalDate(min);
  const maxDate = parseLocalDate(max);
  const [monthOverride, setMonthOverride] = React.useState<Date | undefined>();
  const month = monthOverride ?? selected ?? maxDate ?? minDate ?? undefined;
  const disabled = [
    minDate ? { before: minDate } : null,
    maxDate ? { after: maxDate } : null,
  ].filter((rule): rule is NonNullable<typeof rule> => Boolean(rule));

  const selectDate = (day: Date) => {
    onChange(toLocalDateValue(day));
    setMonthOverride(day);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setMonthOverride(undefined);
      }}
    >
      <PopoverTrigger
        id={id}
        type="button"
        aria-describedby={ariaDescribedBy}
        className={cn(
          "border-line bg-surface focus-visible:ring-coral/30 flex h-11 w-full items-center justify-between gap-2 rounded-[12px] border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
          selected ? "text-ink" : "text-muted"
        )}
      >
        <span className="min-w-0 truncate whitespace-nowrap">
          {selected
            ? formatDateLabel(selected, locale)
            : (placeholder ?? t("datePicker.date.placeholder"))}
        </span>
        <CalendarDays className="text-muted h-4 w-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start">
        <div className="w-fit">
          <Calendar
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonthOverride}
            disabled={disabled.length > 0 ? disabled : undefined}
            onSelect={(day) => {
              if (!day) return;
              selectDate(day);
            }}
          />
          {showPresets ? (
            <div className="border-line mt-3 grid w-full grid-cols-2 gap-2 border-t pt-3">
              {pastDatePresets.map((preset) => {
                const day = resolvePresetDate(preset);
                const isPresetDisabled = !isSelectableDay(
                  day,
                  minDate,
                  maxDate
                );

                return (
                  <Button
                    key={preset.labelId}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isPresetDisabled}
                    className={cn(
                      "h-8 rounded-md px-2 text-xs",
                      preset.monthStart ? "col-span-2" : null
                    )}
                    onClick={() => selectDate(day)}
                  >
                    {t(preset.labelId)}
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const MonthPicker = ({
  value,
  onChange,
  min,
  max,
  id,
  placeholder,
  "aria-describedby": ariaDescribedBy,
}: MonthPickerProps) => {
  const { locale } = usePordeeLocale();
  const t = usePordeeTranslation();
  const [open, setOpen] = React.useState(false);
  const selected = parseMonthValue(value);
  const minMonth = parseMonthValue(min);
  const maxMonth = parseMonthValue(max);
  const [visibleYearOverride, setVisibleYearOverride] = React.useState<
    number | undefined
  >();
  const visibleYear =
    visibleYearOverride ??
    selected?.getFullYear() ??
    maxMonth?.getFullYear() ??
    minMonth?.getFullYear() ??
    new Date().getFullYear();

  const canGoPrevious = !minMonth || visibleYear > minMonth.getFullYear();
  const canGoNext = !maxMonth || visibleYear < maxMonth.getFullYear();

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setVisibleYearOverride(undefined);
      }}
    >
      <PopoverTrigger
        id={id}
        type="button"
        aria-describedby={ariaDescribedBy}
        className={cn(
          "border-line bg-surface focus-visible:ring-coral/30 flex h-11 w-full items-center justify-between gap-2 rounded-[12px] border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
          selected ? "text-ink" : "text-muted"
        )}
      >
        <span className="min-w-0 truncate whitespace-nowrap">
          {selected
            ? formatMonthLabel(selected, locale)
            : (placeholder ?? t("datePicker.month.placeholder"))}
        </span>
        <CalendarDays className="text-muted h-4 w-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[276px]">
        <div className="text-ink">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="border-line text-muted hover:bg-sky hover:text-ink inline-flex h-9 w-9 items-center justify-center rounded-sm border transition-colors disabled:opacity-40"
              disabled={!canGoPrevious}
              onClick={() => setVisibleYearOverride(visibleYear - 1)}
              aria-label={t("datePicker.previousYear")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">
              {formatYear(visibleYear, locale)}
            </p>
            <button
              type="button"
              className="border-line text-muted hover:bg-sky hover:text-ink inline-flex h-9 w-9 items-center justify-center rounded-sm border transition-colors disabled:opacity-40"
              disabled={!canGoNext}
              onClick={() => setVisibleYearOverride(visibleYear + 1)}
              aria-label={t("datePicker.nextYear")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthDate = new Date(visibleYear, monthIndex, 1);
              const monthValue = toLocalMonthValue(monthDate);
              const isSelected = value === monthValue;
              const isDisabled =
                (minMonth && monthDate < minMonth) ||
                (maxMonth && monthDate > maxMonth);

              return (
                <button
                  key={monthValue}
                  type="button"
                  className={cn(
                    "hover:bg-sky focus-visible:ring-coral/40 disabled:text-muted/40 flex h-10 items-center justify-center rounded-sm px-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none",
                    isSelected
                      ? "bg-coral-strong hover:bg-coral font-semibold text-white"
                      : "text-ink"
                  )}
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(monthValue);
                    setOpen(false);
                  }}
                >
                  {formatShortMonth(monthDate, locale)}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const DateRangePicker = ({
  from,
  to,
  onChange,
  min,
  max,
  id,
  placeholder,
  "aria-describedby": ariaDescribedBy,
}: DateRangePickerProps) => {
  const { locale } = usePordeeLocale();
  const [open, setOpen] = React.useState(false);
  const t = usePordeeTranslation();
  const fromDate = parseLocalDate(from);
  const toDate = parseLocalDate(to);
  const minDate = parseLocalDate(min);
  const maxDate = parseLocalDate(max);
  const selected =
    fromDate && toDate ? { from: fromDate, to: toDate } : undefined;
  const disabled = [
    minDate ? { before: minDate } : null,
    maxDate ? { after: maxDate } : null,
  ].filter((rule): rule is NonNullable<typeof rule> => Boolean(rule));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        aria-describedby={ariaDescribedBy}
        className={cn(
          "border-line bg-surface focus-visible:ring-coral/30 flex h-11 w-full items-center justify-between gap-2 rounded-[12px] border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
          selected ? "text-ink" : "text-muted"
        )}
      >
        <span className="min-w-0 truncate whitespace-nowrap">
          {selected
            ? formatRangeLabel(
                selected,
                locale,
                t("datePicker.range.placeholder")
              )
            : (placeholder ?? t("datePicker.range.placeholder"))}
        </span>
        <CalendarDays className="text-muted h-4 w-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="range"
          selected={selected}
          defaultMonth={fromDate ?? maxDate ?? minDate ?? undefined}
          disabled={disabled.length > 0 ? disabled : undefined}
          onSelect={(range) => {
            if (!range?.from) return;
            const nextFrom = toLocalDateValue(range.from);
            const nextTo = toLocalDateValue(range.to ?? range.from);
            onChange({ from: nextFrom, to: nextTo });
            if (range.to) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

const formatRangeLabel = (
  range: DateRange,
  locale: PordeeLocale,
  fallback: string
): string => {
  if (!range.from) return fallback;
  if (
    !range.to ||
    toLocalDateValue(range.from) === toLocalDateValue(range.to)
  ) {
    return formatDateLabel(range.from, locale);
  }
  return `${formatDateLabel(range.from, locale)} - ${formatDateLabel(range.to, locale)}`;
};

const parseLocalDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseMonthValue = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, year, month] = match;
  const monthNumber = Number(month);
  if (monthNumber < 1 || monthNumber > 12) return undefined;
  const date = new Date(Number(year), monthNumber - 1, 1);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const resolvePresetDate = (preset: PastDatePreset): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  if (preset.monthStart) {
    date.setDate(1);
    return date;
  }

  date.setDate(date.getDate() + preset.daysFromToday);
  return date;
};

const isSelectableDay = (
  day: Date,
  minDate?: Date,
  maxDate?: Date
): boolean => {
  if (minDate && day < minDate) return false;
  if (maxDate && day > maxDate) return false;
  return true;
};

const toLocalDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toLocalMonthValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const formatDateLabel = (date: Date, locale: PordeeLocale): string => {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatMonthLabel = (date: Date, locale: PordeeLocale): string => {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatShortMonth = (date: Date, locale: PordeeLocale): string => {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short",
  }).format(date);
};

const formatYear = (year: number, locale: PordeeLocale): string => {
  const displayYear = locale === "th" ? year + 543 : year;
  return new Intl.NumberFormat(getIntlLocale(locale), {
    useGrouping: false,
  }).format(displayYear);
};

const getIntlLocale = (locale: PordeeLocale): string => {
  return locale === "th" ? "th-TH" : "en-US";
};
