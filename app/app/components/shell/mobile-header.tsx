import { NavLink } from "react-router";
import { PordeeLogo } from "~/components/brand/logo";
import type { AuthUser } from "~/lib/auth.server";

export function MobileHeader({ user }: { user: AuthUser }) {
  return (
    <header className="border-line bg-surface/95 sticky top-0 z-20 border-b backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3.5">
        <NavLink
          to="/"
          className="focus-visible:ring-coral/40 rounded-sm outline-none focus-visible:ring-2"
        >
          <PordeeLogo size={34} wordmarkClassName="text-xl" />
        </NavLink>
        <div className="border-line bg-sky text-teal flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
