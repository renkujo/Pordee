import { i18n } from "@lingui/core";
import { I18nProvider, useLingui } from "@lingui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  isPordeeLocale,
  LOCALE_STORAGE_KEY,
  messages,
  type PordeeLocale,
} from "./messages";

i18n.load(messages);
i18n.activate(DEFAULT_LOCALE);

interface PordeeI18nContextValue {
  locale: PordeeLocale;
  setLocale: (locale: PordeeLocale) => void;
}

const PordeeI18nContext = createContext<PordeeI18nContextValue | null>(null);

export function PordeeI18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    readLocale,
    getServerLocale
  );

  if (i18n.locale !== locale) {
    i18n.activate(locale);
  }

  const setLocale = useCallback((nextLocale: PordeeLocale) => {
    i18n.activate(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event("pordee-locale-change"));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <PordeeI18nContext.Provider value={value}>
      <I18nProvider i18n={i18n}>{children}</I18nProvider>
    </PordeeI18nContext.Provider>
  );
}

export function usePordeeLocale() {
  const context = useContext(PordeeI18nContext);
  if (!context) {
    throw new Error("usePordeeLocale must be used inside PordeeI18nProvider");
  }
  return context;
}

export function usePordeeTranslation() {
  const { _ } = useLingui();
  return _;
}

function subscribeToLocale(onStoreChange: () => void) {
  window.addEventListener("pordee-locale-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("pordee-locale-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readLocale(): PordeeLocale {
  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isPordeeLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
}

function getServerLocale(): PordeeLocale {
  return DEFAULT_LOCALE;
}
