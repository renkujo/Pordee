import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "~/lib/cn";
import { usePordeeTranslation } from "~/lib/i18n/provider";

type ThemePreference = "light" | "dark" | "system";
type ThemeValue = "light" | "dark";

const THEME_STORAGE_KEY = "pordee-theme";
const LIGHT_THEME_COLOR = "#EAF7FF";
const DARK_THEME_COLOR = "#10181D";

const themeOptions: Array<{
  descriptionKey: string;
  icon: typeof Sun;
  labelKey: string;
  value: ThemePreference;
}> = [
  {
    descriptionKey: "theme.light.description",
    icon: Sun,
    labelKey: "theme.light.label",
    value: "light",
  },
  {
    descriptionKey: "theme.dark.description",
    icon: Moon,
    labelKey: "theme.dark.label",
    value: "dark",
  },
  {
    descriptionKey: "theme.system.description",
    icon: Monitor,
    labelKey: "theme.system.label",
    value: "system",
  },
];

interface ThemeToggleProps {
  className?: string;
  variant?: "compact" | "icon-segmented" | "segmented";
}

export const ThemeToggle = ({
  className,
  variant = "segmented",
}: ThemeToggleProps) => {
  const t = usePordeeTranslation();
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    getServerThemePreference
  );

  const updatePreference = (nextPreference: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    applyThemePreference(nextPreference);
    window.dispatchEvent(new Event("pordee-theme-change"));
  };

  if (variant === "compact") {
    const currentIndex = themeOptions.findIndex(
      (option) => option.value === preference
    );
    const currentOption =
      currentIndex >= 0 ? themeOptions[currentIndex] : themeOptions[2];
    const nextOption = themeOptions[(currentIndex + 1) % themeOptions.length];
    const Icon = currentOption.icon;
    const currentLabel = t(currentOption.labelKey);
    const nextLabel = t(nextOption.labelKey);

    return (
      <button
        type="button"
        aria-label={t("theme.compact.ariaLabel", {
          current: currentLabel,
          next: nextLabel,
        })}
        className={cn(
          "border-line bg-surface text-muted hover:bg-sky/70 hover:text-ink focus-visible:ring-coral/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border transition-colors focus-visible:ring-2 focus-visible:outline-none",
          className
        )}
        onClick={() => updatePreference(nextOption.value)}
        title={t("theme.title", { label: currentLabel })}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  if (variant === "icon-segmented") {
    return (
      <div
        aria-label={t("theme.groupLabel")}
        className={cn(
          "border-line bg-surface grid grid-cols-3 gap-1 rounded-[14px] border p-1",
          className
        )}
        role="group"
      >
        {themeOptions.map(({ icon: Icon, labelKey, value }) => {
          const active = preference === value;
          const label = t(labelKey);

          return (
            <button
              type="button"
              aria-label={t("theme.optionAriaLabel", { label })}
              aria-pressed={active}
              className={cn(
                "focus-visible:ring-coral/40 flex h-9 min-w-0 items-center justify-center rounded-[10px] transition-colors focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "bg-sky text-ink"
                  : "text-muted hover:bg-sky/70 hover:text-ink"
              )}
              key={value}
              onClick={() => updatePreference(value)}
              title={t("theme.title", { label })}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      aria-label={t("theme.groupLabel")}
      className={cn("grid gap-2 sm:grid-cols-3", className)}
      role="group"
    >
      {themeOptions.map(({ descriptionKey, icon: Icon, labelKey, value }) => {
        const active = preference === value;
        const label = t(labelKey);

        return (
          <button
            type="button"
            aria-pressed={active}
            className={cn(
              "border-line bg-surface focus-visible:ring-coral/40 flex min-w-0 flex-col items-start gap-3 rounded-[14px] border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
              active
                ? "border-coral bg-coral/10 text-ink shadow-[inset_0_0_0_1px_var(--color-coral)]"
                : "text-muted hover:bg-sky/60 hover:text-ink"
            )}
            key={value}
            onClick={() => updatePreference(value)}
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span
                className={cn(
                  "border-line bg-sky/55 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border",
                  active && "border-coral bg-coral text-white"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "border-line flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  active && "border-coral"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full bg-transparent",
                    active && "bg-coral"
                  )}
                />
              </span>
            </span>
            <span className="min-w-0">
              <span className="text-ink block text-sm font-semibold">
                {label}
              </span>
              <span className="text-muted mt-1 block text-xs leading-5">
                {t(descriptionKey)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

const subscribeToThemePreference = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleSystemThemeChange = () => {
    const nextPreference = readThemePreference();
    if (nextPreference === "system") {
      applyThemePreference(nextPreference);
      onStoreChange();
    }
  };

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyThemePreference(readThemePreference());
      onStoreChange();
    }
  };

  const handleLocalThemeChange = () => {
    onStoreChange();
  };

  mediaQuery.addEventListener("change", handleSystemThemeChange);
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("pordee-theme-change", handleLocalThemeChange);

  return () => {
    mediaQuery.removeEventListener("change", handleSystemThemeChange);
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("pordee-theme-change", handleLocalThemeChange);
  };
};

const readThemePreference = (): ThemePreference => {
  const attributePreference = document.documentElement.dataset.themePreference;
  if (isThemePreference(attributePreference)) return attributePreference;

  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemePreference(storedPreference)) return storedPreference;

  return "system";
};

const getServerThemePreference = (): ThemePreference => {
  return "system";
};

const applyThemePreference = (preference: ThemePreference) => {
  const theme = resolveTheme(preference);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR
    );
};

const resolveTheme = (preference: ThemePreference): ThemeValue => {
  if (preference === "light" || preference === "dark") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const isThemePreference = (value: unknown): value is ThemePreference => {
  return value === "light" || value === "dark" || value === "system";
};
