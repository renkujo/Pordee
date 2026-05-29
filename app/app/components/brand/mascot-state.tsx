import { cn } from "~/lib/cn";

export type MascotMood = "normal" | "happy" | "saving" | "warning" | "thinking";

interface MascotStateProps {
  mood: MascotMood;
  title: string;
  description: string;
  size?: "sm" | "md";
  className?: string;
}

const mascotSrc: Record<MascotMood, string> = {
  normal: "/brand/mascots/normal.png",
  happy: "/brand/mascots/happy.png",
  saving: "/brand/mascots/saving.png",
  warning: "/brand/mascots/warning.png",
  thinking: "/brand/mascots/thinking.png",
};

export function MascotState({
  mood,
  title,
  description,
  size = "md",
  className,
}: MascotStateProps) {
  return (
    <div
      className={cn(
        "border-line bg-sky/55 flex items-center gap-4 rounded-[14px] border p-4",
        className
      )}
    >
      <img
        alt=""
        className={cn(
          "shrink-0 object-contain",
          size === "sm" ? "h-16 w-16" : "h-20 w-20"
        )}
        loading="lazy"
        src={mascotSrc[mood]}
      />
      <div className="min-w-0">
        <p className="text-ink text-sm font-semibold">{title}</p>
        <p className="text-muted mt-1 text-sm leading-6">{description}</p>
      </div>
    </div>
  );
}
