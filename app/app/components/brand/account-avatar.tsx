import type { AuthUser } from "~/lib/auth.server";
import { cn } from "~/lib/cn";
import { usePordeeTranslation } from "~/lib/i18n/provider";
import {
  accountAvatarPresets,
  getAccountAvatarPresetById,
} from "./account-avatar-presets";

type AccountAvatarSize = "sm" | "md" | "lg";

const sizeClassName: Record<AccountAvatarSize, string> = {
  sm: "h-11 w-11 rounded-full",
  md: "h-16 w-16 rounded-full",
  lg: "h-20 w-20 rounded-full",
};

interface AccountAvatarProps {
  user: Pick<AuthUser, "avatarPresetId" | "email" | "id" | "name">;
  size?: AccountAvatarSize;
  className?: string;
}

export const AccountAvatar = ({
  user,
  size = "md",
  className,
}: AccountAvatarProps) => {
  const avatar = getAccountAvatarVariant(user);
  const t = usePordeeTranslation();

  return (
    <div
      data-testid="account-avatar"
      className={cn(
        "border-line bg-sky/70 flex shrink-0 items-center justify-center overflow-hidden border",
        sizeClassName[size],
        className
      )}
    >
      <img
        alt={t("brand.accountAvatarAlt", { index: avatar.index })}
        className="h-full w-full scale-[1.12] rounded-full object-cover"
        draggable={false}
        loading="lazy"
        src={avatar.src}
      />
    </div>
  );
};

export const getAccountAvatarVariant = (
  user: Pick<AuthUser, "avatarPresetId" | "email" | "id" | "name">
) => {
  const selectedPreset = getAccountAvatarPresetById(user.avatarPresetId);
  if (selectedPreset) return selectedPreset;

  const seed = user.id || user.email || user.name || "pordee";
  return accountAvatarPresets[stableHash(seed) % accountAvatarPresets.length];
};

const stableHash = (value: string) => {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }

  return hash;
};
