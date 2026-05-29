import { useEffect } from "react";

export function ReactGrabDev() {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (typeof window === "undefined") return;
    import("react-grab")
      .then((mod) => {
        if (typeof mod.init === "function") {
          try {
            mod.init();
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        /* dev-only helper; ignore load failures */
      });
  }, []);

  return null;
}
