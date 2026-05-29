import { NavLink } from "react-router";
import { NAV_ITEMS } from "./nav-items";
import { PordeeLogo } from "~/components/brand/logo";
import { cn } from "~/lib/cn";

export function Sidebar() {
  return (
    <aside className="border-line bg-surface hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
      <div className="px-5 py-5">
        <PordeeLogo />
      </div>
      <nav className="px-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm",
                    isActive
                      ? "bg-sky text-ink font-medium"
                      : "text-muted hover:bg-sky/60 hover:text-ink"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="text-muted mt-auto px-5 py-4 text-xs">
        เงินพอดี ชีวิตเบาขึ้น
      </div>
    </aside>
  );
}
