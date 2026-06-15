import * as React from "react";
import { cn } from "~/lib/cn";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  indicatorClassName?: string;
  max?: number;
  value: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, indicatorClassName, max = 100, value, ...props }, ref) => {
    const percent =
      max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

    return (
      <div
        ref={ref}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        className={cn(
          "bg-line/70 h-2 w-full overflow-hidden rounded-full",
          className
        )}
        role="progressbar"
        {...props}
      >
        <div
          className={cn("bg-teal h-full rounded-full", indicatorClassName)}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
