import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { PordeeLogo } from "~/components/brand/logo";
import { usePordeeTranslation } from "~/lib/i18n/provider";

interface RecoveryPageShellProps {
  children: ReactNode;
  description: string;
  title: string;
}

export const RecoveryPageShell = ({
  children,
  description,
  title,
}: RecoveryPageShellProps) => {
  const t = usePordeeTranslation();

  return (
    <main className="flex min-h-dvh items-center px-4 py-8 md:px-6">
      <section className="border-line bg-surface mx-auto w-full max-w-md rounded-md border p-5 md:p-7">
        <div className="flex items-center justify-between gap-4">
          <PordeeLogo size={42} wordmarkClassName="text-xl" />
          <Link
            to="/login"
            className="text-muted hover:text-ink focus-visible:ring-coral/40 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("passwordRecovery.backToLogin")}
          </Link>
        </div>

        <div className="mt-8">
          <h1 className="text-ink text-2xl font-semibold text-pretty">
            {title}
          </h1>
          <p className="text-muted mt-2 text-sm leading-6">{description}</p>
        </div>

        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
};
