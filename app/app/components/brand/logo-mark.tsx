import { cn } from "~/lib/cn";

export type LogoVariant = "light" | "dark";

export interface PordeeLogoMarkProps {
  size?: number;
  variant?: LogoVariant;
  withTile?: boolean;
  title?: string;
  className?: string;
}

export function PordeeLogoMark({
  size = 32,
  title = "พอดี",
  className,
}: PordeeLogoMarkProps) {
  return (
    <img
      src="/brand/icon-192.png"
      srcSet="/brand/icon-192.png 1x, /brand/icon-512.png 2x"
      alt={title}
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
