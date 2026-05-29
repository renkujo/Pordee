import { useId, type JSX } from "react";
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
  variant = "light",
  withTile = true,
  title = "พอดี",
  className,
}: PordeeLogoMarkProps): JSX.Element {
  const titleId = useId();
  const tileFill = variant === "dark" ? "#0E1418" : "#EAF7FF";

  return (
    <svg
      aria-labelledby={titleId}
      className={cn("shrink-0", className)}
      height={size}
      role="img"
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id={titleId}>{title}</title>
      {withTile && <rect width="64" height="64" rx="14" fill={tileFill} />}
      <path
        d="M20 45 V18 C20 13.5 23.6 11 28.4 11 C36.4 11 42 15.9 42 23.1 C42 30.6 36.4 35.2 28.5 35.2 H20"
        fill="none"
        stroke="#FF6B5A"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <path
        d="M34.4 16.2 C45.5 16.2 52 23.6 52 32 C52 40.4 45.5 47.8 34.4 47.8 C31.1 47.8 28.2 47.1 25.8 45.8"
        fill="none"
        stroke="#FF6B5A"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <path
        d="M17 48.2 C25.6 54.1 40.8 54.1 49 47.8"
        fill="none"
        stroke="#18A999"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <circle cx="52.6" cy="46" r="2.6" fill="#B7F34A" />
    </svg>
  );
}
