import * as React from "react";
import { cn } from "~/lib/cn";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-ink text-sm font-medium select-none", className)}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
