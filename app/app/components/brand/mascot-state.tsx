import { cn } from "~/lib/cn";

export type MascotMood = "normal" | "happy" | "saving" | "warning" | "thinking";

interface MascotStateProps {
  mood: MascotMood;
  title: string;
  description: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const mascotSrc: Record<MascotMood, string> = {
  normal: "/brand/mascots/normal.png",
  happy: "/brand/mascots/happy.png",
  saving: "/brand/mascots/saving.png",
  warning: "/brand/mascots/warning.png",
  thinking: "/brand/mascots/thinking.png",
};

export const MascotState = ({
  mood,
  title,
  description,
  size = "md",
  className,
}: MascotStateProps) => {
  return (
    <div
      className={cn(
        "border-line bg-sky/55 flex items-center gap-4 rounded-md border p-4",
        className
      )}
    >
      <img
        alt=""
        className={cn(
          "shrink-0 object-contain",
          size === "xs" && "h-12 w-12",
          size === "sm" && "h-16 w-16",
          size === "md" && "h-20 w-20"
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
};

interface MascotTipProps {
  mood: MascotMood;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const MascotTip = ({
  mood,
  title,
  children,
  className,
}: MascotTipProps) => {
  return (
    <aside
      className={cn(
        "border-line bg-sky/45 flex items-start gap-3 rounded-md border p-3",
        className
      )}
    >
      <img
        alt=""
        className="h-12 w-12 shrink-0 object-contain"
        loading="lazy"
        src={mascotSrc[mood]}
      />
      <div className="min-w-0 pt-0.5">
        <p className="text-ink text-sm font-semibold">{title}</p>
        <div className="text-muted mt-1 text-sm leading-6">{children}</div>
      </div>
    </aside>
  );
};
