import type { AuthUser } from "~/lib/auth.server";
import { cn } from "~/lib/cn";

type AccountAvatarSize = "sm" | "md" | "lg";

type AccountAvatarVariant = {
  alt: string;
  src: string;
};

const accountAvatarVariants: AccountAvatarVariant[] = [
  {
    alt: "อวาตาร์ผู้ใช้พอดี 1",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-01.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 2",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-02.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 3",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-03.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 4",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-04.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 5",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-05.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 6",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-06.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 7",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-07.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 8",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-08.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 9",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-09.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 10",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-10.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 11",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-11.png",
  },
  {
    alt: "อวาตาร์ผู้ใช้พอดี 12",
    src: "/brand/avatars/human-line-art-direct/pordee-human-avatar-direct-12.png",
  },
];

const sizeClassName: Record<AccountAvatarSize, string> = {
  sm: "h-11 w-11 rounded-full",
  md: "h-16 w-16 rounded-full",
  lg: "h-20 w-20 rounded-full",
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
        className="h-full w-full scale-[1.12] rounded-full object-cover"
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
