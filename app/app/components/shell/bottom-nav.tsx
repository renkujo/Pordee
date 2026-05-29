import { NavLink } from "react-router";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "~/lib/cn";

export function BottomNav() {
  return (
    <nav className="border-line bg-surface fixed inset-x-0 bottom-0 z-30 border-t lg:hidden">
      <ul className="mx-auto flex max-w-xl items-stretch">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-xs",
                  isActive ? "text-coral" : "text-muted"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
