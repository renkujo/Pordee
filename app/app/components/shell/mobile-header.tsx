import { NavLink, useSubmit } from "react-router";
import { LogOut, Settings } from "lucide-react";
import { AccountAvatar } from "~/components/brand/account-avatar";
import { PordeeLogo } from "~/components/brand/logo";
import type { AuthUser } from "~/lib/auth.server";
import { ThemeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { usePordeeTranslation } from "~/lib/i18n/provider";

export const MobileHeader = ({ user }: { user: AuthUser }) => {
  const t = usePordeeTranslation();
  const submit = useSubmit();

  return (
    <header className="border-line bg-surface/95 sticky top-0 z-20 border-b backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3.5">
        <NavLink
          to="/"
          className="focus-visible:ring-coral/40 rounded-sm outline-none focus-visible:ring-2"
        >
          <PordeeLogo size={34} wordmarkClassName="text-xl" />
        </NavLink>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="compact" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="เปิดเมนูบัญชี"
                className="focus-visible:ring-coral/40 rounded-full outline-none focus-visible:ring-2"
                type="button"
              >
                <AccountAvatar user={user} size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <span className="block text-sm">{t("shell.accountHint")}</span>
                <span className="text-muted mt-1 block truncate text-xs font-normal">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/settings?tab=account">
                  <Settings className="h-4 w-4" />
                  {t("nav.settings.label")}
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  submit(null, { action: "/logout", method: "post" })
                }
              >
                <LogOut className="h-4 w-4" />
                {t("shell.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
