import { Outlet } from "react-router";
import { Sidebar } from "~/components/shell/sidebar";
import { BottomNav } from "~/components/shell/bottom-nav";
import { MobileHeader } from "~/components/shell/mobile-header";

export default function Shell() {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-xl px-4 py-4 lg:max-w-5xl lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
