import type { AuthUser } from "~/lib/auth.server";
import { cn } from "~/lib/cn";

type AccountAvatarSize = "sm" | "md" | "lg";

type AccountAvatarVariant = {
  alt: string;
  src: string;
};

const accountAvatarVariants: AccountAvatarVariant[] = [
  {
    alt: "พอดีโบกมือ",
    src: "/brand/avatars/pordee-avatar-01-normal-wave.png",
  },
  {
    alt: "พอดียิ้ม",
    src: "/brand/avatars/pordee-avatar-02-happy.png",
  },
  {
    alt: "พอดีถือเหรียญ",
    src: "/brand/avatars/pordee-avatar-03-saving-coin.png",
  },
  {
    alt: "พอดีกำลังคิด",
    src: "/brand/avatars/pordee-avatar-04-thinking.png",
  },
  {
    alt: "พอดีเตือนเบา ๆ",
    src: "/brand/avatars/pordee-avatar-05-warning.png",
  },
  {
    alt: "พอดีภูมิใจ",
    src: "/brand/avatars/pordee-avatar-06-proud-star.png",
  },
  {
    alt: "พอดีจดแผนเงิน",
    src: "/brand/avatars/pordee-avatar-07-planner.png",
  },
  {
    alt: "พอดีตามเป้าหมาย",
    src: "/brand/avatars/pordee-avatar-08-goal.png",
  },
  {
    alt: "พอดีขยิบตา",
    src: "/brand/avatars/pordee-avatar-09-wink.png",
  },
  {
    alt: "พอดีถือกุญแจ",
    src: "/brand/avatars/pordee-avatar-10-secure-key.png",
  },
];

const sizeClassName: Record<AccountAvatarSize, string> = {
  sm: "h-11 w-11 rounded-full p-0.5",
  md: "h-16 w-16 rounded-[18px] p-1",
  lg: "h-20 w-20 rounded-[22px] p-1",
};

interface AccountAvatarProps {
  user: Pick<AuthUser, "email" | "id" | "name">;
  size?: AccountAvatarSize;
  className?: string;
}

export function AccountAvatar({
  user,
  size = "md",
  className,
}: AccountAvatarProps) {
  const avatar = getAccountAvatarVariant(user);

  return (
    <div
      className={cn(
        "border-line bg-sky/70 flex shrink-0 items-center justify-center overflow-hidden border",
        sizeClassName[size],
        className
      )}
    >
      <img
        alt={avatar.alt}
        className="h-full w-full scale-[1.45] object-contain"
        draggable={false}
        loading="lazy"
        src={avatar.src}
      />
    </div>
  );
}

export function getAccountAvatarVariant(
  user: Pick<AuthUser, "email" | "id" | "name">
) {
  const seed = user.id || user.email || user.name || "pordee";
  return accountAvatarVariants[stableHash(seed) % accountAvatarVariants.length];
}

function stableHash(value: string) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }

  return hash;
}
