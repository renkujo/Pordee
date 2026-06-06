import { cn } from "~/lib/cn";
import { PordeeLogoMark, type LogoVariant } from "./logo-mark";

interface PordeeLogoProps {
  size?: number;
  withWordmark?: boolean;
  variant?: LogoVariant;
  className?: string;
  wordmarkClassName?: string;
}

export function PordeeLogo({
  size = 32,
  withWordmark = true,
  variant = "light",
  className,
  wordmarkClassName,
}: PordeeLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2",
        variant === "dark" ? "text-[var(--color-ink-dark)]" : "text-ink",
        className
      )}
    >
      <PordeeLogoMark
        size={size}
        variant={variant}
        withTile
        title={withWordmark ? null : "ตราสัญลักษณ์พอดี"}
      />
      {withWordmark && (
        <span
          className={cn(
            "text-lg font-semibold tracking-tight",
            wordmarkClassName
          )}
        >
          พอดี
        </span>
      )}
    </span>
  );
}
