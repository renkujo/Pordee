import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/cn";

const labelFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

interface DatePickerProps {
  /** Selected value as a local `YYYY-MM-DD` string, or empty when unset. */
  value: string;
  /** Called with the new `YYYY-MM-DD` string when a day is picked. */
  onChange: (value: string) => void;
  /** Latest selectable day as `YYYY-MM-DD`. Later days are disabled. */
  max?: string;
  id?: string;
  placeholder?: string;
  "aria-describedby"?: string;
}

export function DatePicker({
  value,
  onChange,
  max,
  id,
  placeholder = "เลือกวันที่",
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseLocalDate(value);
  const maxDate = parseLocalDate(max);

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
        <span>{selected ? labelFormatter.format(selected) : placeholder}</span>
        <CalendarDays className="text-muted h-4 w-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? maxDate ?? undefined}
          disabled={maxDate ? { after: maxDate } : undefined}
          onSelect={(day) => {
            if (!day) return;
            onChange(toLocalDateValue(day));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function parseLocalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toLocalDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
