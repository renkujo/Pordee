import { cn } from "~/lib/cn";

export type LogoVariant = "light" | "dark";
const LOGO_MARK_SRC = "/logo/direct/pordee-logo-mark-direct-01.png";

export interface PordeeLogoMarkProps {
  size?: number;
  variant?: LogoVariant;
  withTile?: boolean;
  title?: string | null;
  className?: string;
}

export function PordeeLogoMark({
  size = 32,
  variant = "light",
  withTile = false,
  title = "ตราสัญลักษณ์พอดี",
  className,
}: PordeeLogoMarkProps) {
  const mark = (
    <img
      src={LOGO_MARK_SRC}
      alt={title ?? ""}
      width={size}
      height={size}
      className={cn(
        "block shrink-0 object-contain select-none",
        withTile ? "h-full w-full" : className
      )}
      draggable={false}
      aria-hidden={title ? undefined : true}
    />
  );

  if (!withTile) return mark;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[24%] select-none",
        variant === "dark" ? "bg-white/95" : "bg-sky",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden={title ? undefined : true}
    >
      {mark}
    </span>
  );
}
