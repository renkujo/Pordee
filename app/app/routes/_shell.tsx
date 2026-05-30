import { Outlet, useLoaderData } from "react-router";
import type { Route } from "./+types/_shell";
import { Sidebar } from "~/components/shell/sidebar";
import { BottomNav } from "~/components/shell/bottom-nav";
import { MobileHeader } from "~/components/shell/mobile-header";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export default function Shell() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader user={user} />
        <main className="flex-1 pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-xl px-4 py-4 md:max-w-3xl md:px-6 lg:max-w-6xl lg:px-8 lg:py-8 xl:max-w-7xl">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
