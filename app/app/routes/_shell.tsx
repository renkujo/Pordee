import { useEffect, useState } from "react";
import {
  Outlet,
  useLoaderData,
  useLocation,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/_shell";
import { Sidebar } from "~/components/shell/sidebar";
import { BottomNav } from "~/components/shell/bottom-nav";
import { MobileHeader } from "~/components/shell/mobile-header";
import { RouteLoadingSkeleton } from "~/components/shell/route-loading-skeleton";
import { requireUser } from "~/lib/auth.server";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request);
  return { user };
};

const Shell = () => {
  const { user } = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigation = useNavigation();
  const isRouteLoading = navigation.state === "loading";
  const showRouteSkeleton = useDelayedBoolean(isRouteLoading, 140);
  const pendingPathname = navigation.location?.pathname ?? location.pathname;

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader user={user} />
        <main className="flex-1 pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-xl px-4 py-4 md:max-w-3xl md:px-6 lg:max-w-6xl lg:px-8 lg:py-8 xl:max-w-7xl">
            {showRouteSkeleton ? (
              <RouteLoadingSkeleton pathname={pendingPathname} />
            ) : (
              <Outlet />
            )}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export default Shell;

const useDelayedBoolean = (value: boolean, delayMs: number) => {
  const [delayedValue, setDelayedValue] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        setDelayedValue(value);
      },
      value ? delayMs : 0
    );

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return delayedValue;
};
