import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-sky text-ink",
        coral: "bg-coral/10 text-coral",
        teal: "bg-teal/10 text-teal",
        muted: "border border-line text-muted",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, tone, ...props }: BadgeProps) => {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
};

export { Badge, badgeVariants };
