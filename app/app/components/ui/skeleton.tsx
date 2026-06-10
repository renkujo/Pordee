import * as React from "react";
import { cn } from "~/lib/cn";

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn("skeleton-shimmer rounded-xs", className)}
    {...props}
  />
));
Skeleton.displayName = "Skeleton";

const SkeletonLine = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Skeleton ref={ref} className={cn("h-3 w-full", className)} {...props} />
));
SkeletonLine.displayName = "SkeletonLine";

const SkeletonCircle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Skeleton
    ref={ref}
    className={cn("aspect-square rounded-full", className)}
    {...props}
  />
));
SkeletonCircle.displayName = "SkeletonCircle";

export { Skeleton, SkeletonCircle, SkeletonLine };
