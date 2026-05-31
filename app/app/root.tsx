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
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/500.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/ibm-plex-sans-thai/700.css";
import { ReactGrabDev } from "~/lib/dev/react-grab";

export const links: Route.LinksFunction = () => [
  { rel: "manifest", href: "/manifest.webmanifest" },
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

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
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
        <Meta />
        <Links />
      </head>
      <body className="bg-sky text-ink min-h-dvh antialiased">
        {children}
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
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
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
}
