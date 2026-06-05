import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "~/lib/cn";

type ThemePreference = "light" | "dark" | "system";
type ThemeValue = "light" | "dark";

const THEME_STORAGE_KEY = "pordee-theme";
const LIGHT_THEME_COLOR = "#EAF7FF";
const DARK_THEME_COLOR = "#10181D";

const themeOptions: Array<{
  description: string;
  icon: typeof Sun;
  label: string;
  value: ThemePreference;
}> = [
  {
    description: "พื้นฟ้าอ่อน อ่านง่ายตอนกลางวัน",
    icon: Sun,
    label: "สว่าง",
    value: "light",
  },
  {
    description: "ลดแสงจ้า เหมาะกับที่แสงน้อย",
    icon: Moon,
    label: "มืด",
    value: "dark",
  },
  {
    description: "ให้พอดีเปลี่ยนตามเครื่องนี้",
    icon: Monitor,
    label: "ตามเครื่อง",
    value: "system",
  },
];

interface ThemeToggleProps {
  className?: string;
  variant?: "compact" | "icon-segmented" | "segmented";
}

export function ThemeToggle({
  className,
  variant = "segmented",
}: ThemeToggleProps) {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readThemePreference,
    getServerThemePreference
  );

  function updatePreference(nextPreference: ThemePreference) {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    applyThemePreference(nextPreference);
    window.dispatchEvent(new Event("pordee-theme-change"));
  }

  if (variant === "compact") {
    const currentIndex = themeOptions.findIndex(
      (option) => option.value === preference
    );
    const currentOption =
      currentIndex >= 0 ? themeOptions[currentIndex] : themeOptions[2];
    const nextOption = themeOptions[(currentIndex + 1) % themeOptions.length];
    const Icon = currentOption.icon;

    return (
      <button
        type="button"
        aria-label={`ธีม ${currentOption.label} กดเพื่อเปลี่ยนเป็น ${nextOption.label}`}
        className={cn(
          "border-line bg-surface text-muted hover:bg-sky/70 hover:text-ink focus-visible:ring-coral/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border transition-colors focus-visible:ring-2 focus-visible:outline-none",
          className
        )}
        onClick={() => updatePreference(nextOption.value)}
        title={`ธีม: ${currentOption.label}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  if (variant === "icon-segmented") {
    return (
      <div
        aria-label="เลือกธีม"
        className={cn(
          "border-line bg-surface grid grid-cols-3 gap-1 rounded-[14px] border p-1",
          className
        )}
        role="group"
      >
        {themeOptions.map(({ icon: Icon, label, value }) => {
          const active = preference === value;

          return (
            <button
              type="button"
              aria-label={`ธีม ${label}`}
              aria-pressed={active}
              className={cn(
                "focus-visible:ring-coral/40 flex h-9 min-w-0 items-center justify-center rounded-[10px] transition-colors focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "bg-sky text-ink"
                  : "text-muted hover:bg-sky/70 hover:text-ink"
              )}
              key={value}
              onClick={() => updatePreference(value)}
              title={`ธีม: ${label}`}
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
      aria-label="เลือกธีม"
      className={cn("grid gap-2 sm:grid-cols-3", className)}
      role="group"
    >
      {themeOptions.map(({ description, icon: Icon, label, value }) => {
        const active = preference === value;

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
                {description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function subscribeToThemePreference(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function handleSystemThemeChange() {
    const nextPreference = readThemePreference();
    if (nextPreference === "system") {
      applyThemePreference(nextPreference);
      onStoreChange();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY) {
      applyThemePreference(readThemePreference());
      onStoreChange();
    }
  }

  function handleLocalThemeChange() {
    onStoreChange();
  }

  mediaQuery.addEventListener("change", handleSystemThemeChange);
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("pordee-theme-change", handleLocalThemeChange);

  return () => {
    mediaQuery.removeEventListener("change", handleSystemThemeChange);
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("pordee-theme-change", handleLocalThemeChange);
  };
}

function readThemePreference(): ThemePreference {
  const attributePreference = document.documentElement.dataset.themePreference;
  if (isThemePreference(attributePreference)) return attributePreference;

  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemePreference(storedPreference)) return storedPreference;

  return "system";
}

function getServerThemePreference(): ThemePreference {
  return "system";
}

function applyThemePreference(preference: ThemePreference) {
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
}

function resolveTheme(preference: ThemePreference): ThemeValue {
  if (preference === "light" || preference === "dark") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
