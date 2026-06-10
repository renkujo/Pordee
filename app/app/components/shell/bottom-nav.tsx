import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { MOBILE_MORE_NAV_ITEMS, MOBILE_PRIMARY_NAV_ITEMS } from "./nav-items";
import { cn } from "~/lib/cn";
import { usePordeeTranslation } from "~/lib/i18n/provider";

export const BottomNav = () => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();
  const t = usePordeeTranslation();
  const isMoreActive = MOBILE_MORE_NAV_ITEMS.some(({ to }) =>
    location.pathname.startsWith(to)
  );

  return (
    <>
      {isMoreOpen && <MobileMoreDrawer onClose={() => setIsMoreOpen(false)} />}
      <nav
        aria-label={t("mobile.navLabel")}
        className="border-line bg-surface fixed inset-x-0 bottom-0 z-30 border-t lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {MOBILE_PRIMARY_NAV_ITEMS.map(({ to, labelId, icon: Icon, end }) => {
            const isAddAction = to === "/add";

            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={() => setIsMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-xs transition-colors",
                      isAddAction
                        ? "text-coral"
                        : isActive
                          ? "text-coral"
                          : "text-muted"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isAddAction ? (
                        <span
                          className={cn(
                            "border-line bg-coral -mt-3 flex h-11 w-11 items-center justify-center rounded-full border text-white shadow-[0_4px_10px_rgba(247,106,93,0.18)] transition-transform",
                            isActive ? "scale-105" : "scale-100"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                      <span
                        className={cn(
                          "leading-none",
                          isAddAction ? "font-semibold" : null
                        )}
                      >
                        {t(labelId)}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={isMoreOpen}
              aria-controls="mobile-more-drawer"
              onClick={() => setIsMoreOpen((value) => !value)}
              className={cn(
                "flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 py-2 text-xs",
                isMoreOpen || isMoreActive ? "text-coral" : "text-muted"
              )}
            >
              <Menu className="h-5 w-5" />
              <span>{t("mobile.more")}</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};

const MobileMoreDrawer = ({ onClose }: { onClose: () => void }) => {
  const t = usePordeeTranslation();

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-40 lg:hidden"
      id="mobile-more-drawer"
      role="dialog"
    >
      <button
        type="button"
        aria-label={t("mobile.more.closeLabel")}
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
      />
      <div className="border-line bg-surface absolute right-3 bottom-20 left-3 mx-auto max-w-xl rounded-md border shadow-sm">
        <div className="border-line flex items-center justify-between border-b px-4 py-3">
          <p className="text-ink text-sm font-semibold">{t("mobile.more")}</p>
          <button
            type="button"
            aria-label={t("mobile.more.close")}
            className="text-muted hover:text-ink focus-visible:ring-coral/40 flex h-9 w-9 items-center justify-center rounded-sm focus-visible:ring-2 focus-visible:outline-none"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav aria-label={t("mobile.more.navLabel")}>
          <ul className="p-2">
            {MOBILE_MORE_NAV_ITEMS.map(
              ({ to, labelId, descriptionId, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "focus-visible:ring-coral/40 flex items-center gap-3 rounded-sm px-3 py-3 text-sm focus-visible:ring-2 focus-visible:outline-none",
                        isActive
                          ? "bg-coral/10 text-ink"
                          : "text-muted hover:bg-sky/70 hover:text-ink"
                      )
                    }
                  >
                    <span className="border-line bg-surface flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{t(labelId)}</span>
                      <span className="mt-0.5 block text-xs leading-5">
                        {t(descriptionId)}
                      </span>
                    </span>
                  </NavLink>
                </li>
              )
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
};
