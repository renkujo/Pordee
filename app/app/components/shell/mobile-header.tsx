import { NavLink } from "react-router";
import { AccountAvatar } from "~/components/brand/account-avatar";
import { PordeeLogo } from "~/components/brand/logo";
import type { AuthUser } from "~/lib/auth.server";
import { ThemeToggle } from "./theme-toggle";

export const MobileHeader = ({ user }: { user: AuthUser }) => {
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
          <AccountAvatar user={user} size="sm" />
        </div>
      </div>
    </header>
  );
};
