import { NavLink } from "react-router";
import { PlusCircle } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { PordeeLogo } from "~/components/brand/logo";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/cn";

const SIDEBAR_NAV_ITEMS = NAV_ITEMS.filter(({ to }) => to !== "/add");

export function Sidebar() {
  return (
    <aside className="border-line bg-surface sticky top-0 hidden h-dvh w-72 shrink-0 overflow-y-auto border-r lg:flex lg:flex-col">
      <div className="border-line border-b px-5 py-5">
        <NavLink
          to="/"
          className="focus-visible:ring-coral/40 rounded-sm outline-none focus-visible:ring-2"
        >
          <PordeeLogo size={36} />
          <span className="text-muted mt-1 block text-sm">
            เงินพอดี ชีวิตเบาขึ้น
          </span>
        </NavLink>
      </div>

      <div className="px-4 py-4">
        <Button
          asChild
          size="lg"
          className="h-12 w-full justify-start rounded-sm"
        >
          <NavLink to="/add">
            <PlusCircle className="h-5 w-5" />
            บันทึกรายการ
          </NavLink>
        </Button>
      </div>

      <nav aria-label="เมนูหลัก" className="px-3">
        <ul className="flex flex-col gap-1.5">
          {SIDEBAR_NAV_ITEMS.map(
            ({ to, label, description, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "group focus-visible:ring-coral/40 relative flex items-center gap-3 rounded-sm border px-3 py-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      isActive
                        ? "border-coral/30 bg-coral/10 text-ink"
                        : "text-muted hover:bg-sky/70 hover:text-ink border-transparent"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-3 bottom-3 left-0 w-1 rounded-r-xs",
                          isActive ? "bg-coral" : "bg-transparent"
                        )}
                      />
                      <span
                        className={cn(
                          "border-line flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border transition-colors",
                          isActive
                            ? "border-coral bg-coral text-white"
                            : "bg-surface text-muted group-hover:text-ink"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{label}</span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs leading-5",
                            isActive ? "text-ink" : "text-muted"
                          )}
                        >
                          {description}
                        </span>
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            )
          )}
        </ul>
      </nav>

      <div className="mt-auto px-4 pb-4">
        <div className="border-line bg-sky/55 rounded-md border p-3">
          <div className="flex items-start gap-3">
            <img
              alt=""
              className="h-14 w-14 shrink-0 object-contain"
              loading="lazy"
              src="/brand/mascots/normal.png"
            />
            <div className="min-w-0">
              <p className="text-ink text-sm font-semibold">พอดีช่วยตั้งหลัก</p>
              <p className="text-muted mt-1 text-sm leading-6">
                เริ่มจากบันทึกรายการวันนี้ แล้วค่อยดูภาพรวมเงินเข้าออก
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
