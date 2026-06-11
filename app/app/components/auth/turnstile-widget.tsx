import { useEffect, useId, useRef, useState } from "react";
import { usePordeeTranslation } from "~/lib/i18n/provider";

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileWidgetProps {
  action: string;
  siteKey: string;
}

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  size?: "normal" | "flexible" | "compact";
  theme?: "auto" | "light" | "dark";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: TurnstileRenderOptions
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

export const TurnstileWidget = ({ action, siteKey }: TurnstileWidgetProps) => {
  const t = usePordeeTranslation();
  const widgetId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderedWidgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    const renderWidget = async () => {
      try {
        await loadTurnstileScript();
      } catch {
        if (active) setHasError(true);
        return;
      }

      if (!active || !containerRef.current || !window.turnstile) return;

      renderedWidgetIdRef.current = window.turnstile.render(
        containerRef.current,
        {
          action,
          callback: (nextToken) => {
            setHasError(false);
            setToken(nextToken);
          },
          "error-callback": () => {
            setHasError(true);
            setToken("");
          },
          "expired-callback": () => {
            setToken("");
          },
          size: "flexible",
          sitekey: siteKey,
          theme: "auto",
        }
      );
    };

    void renderWidget();

    return () => {
      active = false;
      const renderedWidgetId = renderedWidgetIdRef.current;
      if (renderedWidgetId && window.turnstile) {
        window.turnstile.remove(renderedWidgetId);
      }
      renderedWidgetIdRef.current = null;
    };
  }, [action, siteKey]);

  return (
    <div className="flex w-full flex-col gap-2">
      <input
        name="cf-turnstile-response"
        type="hidden"
        value={token}
        readOnly
      />
      <div
        aria-label={t("auth.turnstile.label")}
        className="flex min-h-[65px] w-full justify-center"
        id={widgetId}
        ref={containerRef}
      />
      {hasError && (
        <p className="text-coral-strong text-xs" role="alert">
          {t("auth.error.turnstileLoadFailed")}
        </p>
      )}
    </div>
  );
};

const loadTurnstileScript = () => {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(), { once: true });
    document.head.append(script);
  });

  return turnstileScriptPromise;
};
