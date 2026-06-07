import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { ReactGrabDev } from "~/lib/dev/react-grab";
import { PordeeI18nProvider } from "~/lib/i18n/provider";

export const links: Route.LinksFunction = () => [
  ...(import.meta.env.PROD
    ? [{ rel: "manifest", href: "/manifest.webmanifest" }]
    : []),
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  {
    rel: "icon",
    href: "/brand/icon-32.png",
    type: "image/png",
    sizes: "32x32",
  },
  { rel: "apple-touch-icon", href: "/brand/icon-180.png", sizes: "180x180" },
];

const serviceWorkerRegistrationScript = `
if ("serviceWorker" in navigator) {
  const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const canRegister = window.location.protocol === "https:" || isLocalhost;

  if (canRegister) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.error("Service worker registration failed", error);
      });
    });
  }
}
`;

const themeInitializationScript = `
(() => {
  const storageKey = "pordee-theme";
  const lightColor = "#EAF7FF";
  const darkColor = "#10181D";

  const resolveTheme = (preference) => {
    if (preference === "light" || preference === "dark") return preference;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  try {
    const storedPreference = window.localStorage.getItem(storageKey);
    const preference =
      storedPreference === "light" || storedPreference === "dark" || storedPreference === "system"
        ? storedPreference
        : "system";
    const theme = resolveTheme(preference);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? darkColor : lightColor);
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themePreference = "system";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#EAF7FF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="พอดี" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: themeInitializationScript,
          }}
        />
        <Meta />
        <Links />
      </head>
      <body className="bg-sky text-ink min-h-dvh antialiased">
        <PordeeI18nProvider>{children}</PordeeI18nProvider>
        <ReactGrabDev />
        <ScrollRestoration />
        <Scripts />
        {import.meta.env.PROD ? (
          <script
            dangerouslySetInnerHTML={{
              __html: serviceWorkerRegistrationScript,
            }}
          />
        ) : null}
      </body>
    </html>
  );
};

const App = () => {
  return <Outlet />;
};

export default App;

export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  let message = "ไม่พบหน้านี้";
  let details = "เกิดข้อผิดพลาดที่เราไม่ได้คาดไว้";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "ไม่พบหน้าที่คุณกำลังหา"
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-xl p-6 pt-16">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p className="text-muted mt-2">{details}</p>
      {stack && (
        <pre className="bg-surface mt-6 w-full overflow-x-auto rounded-md p-4 text-sm">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
};
