import { PordeeLogo } from "~/components/brand/logo";

export function MobileHeader() {
  return (
    <header className="border-line bg-surface/95 sticky top-0 z-20 border-b backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <PordeeLogo size={28} />
      </div>
    </header>
  );
}
