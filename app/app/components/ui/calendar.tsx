import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { th } from "react-day-picker/locale";
import { cn } from "~/lib/cn";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarChevron({
  orientation,
  className,
}: {
  orientation?: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon className={cn("h-4 w-4", className)} />;
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      locale={th}
      navLayout="around"
      showOutsideDays={showOutsideDays}
      className={cn("text-ink", className)}
      classNames={{
        root: cn(defaults.root, "w-fit"),
        months: cn(defaults.months, "flex flex-col gap-3"),
        month: cn(
          defaults.month,
          "flex w-[252px] flex-wrap items-center gap-y-3"
        ),
        month_caption: cn(
          defaults.month_caption,
          "flex h-9 min-w-0 flex-1 items-center justify-center"
        ),
        caption_label: cn(
          defaults.caption_label,
          "text-ink text-sm font-semibold"
        ),
        button_previous: cn(
          defaults.button_previous,
          "border-line text-muted hover:bg-sky hover:text-ink inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-40"
        ),
        button_next: cn(
          defaults.button_next,
          "border-line text-muted hover:bg-sky hover:text-ink inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-40"
        ),
        month_grid: cn(
          defaults.month_grid,
          "w-full basis-full border-collapse"
        ),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(
          defaults.weekday,
          "text-muted h-9 w-9 text-center text-xs font-normal"
        ),
        week: cn(defaults.week, "mt-1 flex w-full"),
        day: cn(defaults.day, "h-9 w-9 p-0 text-center text-sm"),
        day_button: cn(
          defaults.day_button,
          "hover:bg-sky text-ink focus-visible:ring-coral/40 inline-flex h-9 w-9 items-center justify-center rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        ),
        today: cn(defaults.today, "[&>button]:border-line [&>button]:border"),
        selected: cn(
          defaults.selected,
          "[&>button]:bg-coral [&>button]:hover:bg-coral-strong [&>button]:text-white"
        ),
        outside: cn(defaults.outside, "[&>button]:text-muted/50"),
        disabled: cn(defaults.disabled, "[&>button]:text-muted/40"),
        ...classNames,
      }}
      components={{ Chevron: CalendarChevron }}
      {...props}
    />
  );
}
