import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  Skeleton,
  SkeletonCircle,
  SkeletonLine,
} from "~/components/ui/skeleton";
import { cn } from "~/lib/cn";

const smallRows = ["first", "second", "third"] as const;
const mediumRows = ["first", "second", "third", "fourth"] as const;
const largeRows = ["first", "second", "third", "fourth", "fifth"] as const;

type SkeletonKind =
  | "add"
  | "dashboard"
  | "goals"
  | "history"
  | "settings"
  | "wallet";

export const RouteLoadingSkeleton = ({ pathname }: { pathname: string }) => {
  const kind = getSkeletonKind(pathname);

  return (
    <div
      aria-label="กำลังโหลดหน้า"
      aria-live="polite"
      className="contents"
      role="status"
    >
      <span className="sr-only">กำลังโหลดหน้า</span>
      {kind === "dashboard" ? <DashboardSkeleton /> : null}
      {kind === "wallet" ? <WalletSkeleton /> : null}
      {kind === "history" ? <HistorySkeleton /> : null}
      {kind === "goals" ? <GoalsSkeleton /> : null}
      {kind === "settings" ? <SettingsSkeleton /> : null}
      {kind === "add" ? <AddTransactionSkeleton /> : null}
    </div>
  );
};

const getSkeletonKind = (pathname: string): SkeletonKind => {
  if (pathname.startsWith("/wallet")) return "wallet";
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/goals")) return "goals";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/add")) return "add";
  return "dashboard";
};

const PageHeaderSkeleton = ({ action = false }: { action?: boolean }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <SkeletonLine className="h-4 w-24" />
      <SkeletonLine className="mt-2 h-8 w-52 sm:w-64" />
      <SkeletonLine className="mt-2 h-4 w-full max-w-md" />
    </div>
    {action ? <Skeleton className="h-10 w-full sm:w-36" /> : null}
  </div>
);

const MetricTileSkeleton = ({ withIcon = false }: { withIcon?: boolean }) => (
  <div className="border-line flex min-h-24 flex-col justify-between border-r border-b p-4 even:border-r-0 sm:p-5">
    {withIcon ? (
      <SkeletonCircle className="h-4 w-4" />
    ) : (
      <SkeletonLine className="w-20" />
    )}
    <div>
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="mt-2 h-5 w-28" />
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,31rem)]">
        <CardHeader className="bg-teal/10 justify-between gap-5 p-4 sm:p-5 lg:min-h-48">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-28" />
          </div>
          <div>
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="mt-3 h-9 w-56 sm:w-72" />
          </div>
        </CardHeader>
        <CardContent className="border-line flex flex-col gap-4 border-t p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <SkeletonLine className="h-4 w-28" />
              <SkeletonLine className="mt-2 h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="border-line bg-sky/45 rounded-md border p-3 sm:p-4">
            <SkeletonLine className="w-24" />
            <Skeleton className="mt-2 h-10 w-full" />
            <SkeletonLine className="mt-2 w-40" />
          </div>
          <Skeleton className="h-11 w-full lg:hidden" />
        </CardContent>
      </div>
    </Card>

    <section className="grid gap-4 lg:grid-flow-dense lg:auto-rows-[minmax(150px,auto)] lg:grid-cols-6">
      <Card className="overflow-hidden lg:col-span-4">
        <CardContent className="flex h-full flex-col p-4 sm:p-5">
          <div className="bg-teal/10 -m-4 flex flex-1 flex-col gap-4 p-4 sm:-m-5 sm:gap-5 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-7 w-28 rounded-full" />
                <SkeletonLine className="mt-4 w-40" />
                <SkeletonLine className="mt-2 h-10 w-48 sm:w-64" />
              </div>
              <SkeletonCircle className="h-14 w-14 sm:h-16 sm:w-16" />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {smallRows.map((row) => (
                <div className="border-line rounded-sm border p-3" key={row}>
                  <SkeletonLine className="w-14" />
                  <SkeletonLine className="mt-2 h-5 w-full" />
                </div>
              ))}
            </div>
            <div className="border-line bg-surface rounded-md border p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <SkeletonLine className="w-44" />
                  <SkeletonLine className="mt-2 h-4 w-full max-w-lg" />
                  <SkeletonLine className="mt-2 h-4 w-3/4" />
                </div>
                <Skeleton className="h-10 w-full sm:w-36" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TallInsightCardSkeleton className="lg:col-span-2 lg:row-span-2" />
      <CompactListCardSkeleton className="lg:col-span-2" rows={3} />
      <ProgressListCardSkeleton className="lg:col-span-2" rows={3} />
      <CompactListCardSkeleton className="lg:col-span-2" rows={2} />
      <WideSignalSkeleton className="lg:col-span-4" />
    </section>
  </div>
);

const WalletSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
    <PageHeaderSkeleton />
    <section className="border-line bg-surface overflow-hidden rounded-lg border">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="bg-teal/10 flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <SkeletonLine className="w-28" />
              <SkeletonLine className="mt-3 h-11 w-52 sm:w-72" />
              <SkeletonLine className="mt-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-10 w-full sm:w-36" />
          </div>
          <div className="border-line bg-surface rounded-md border p-3 sm:p-4">
            <SkeletonLine className="w-40" />
            <SkeletonLine className="mt-2 h-4 w-full" />
            <SkeletonLine className="mt-2 h-4 w-2/3" />
          </div>
        </div>
        <div className="border-line grid grid-cols-2 gap-0 border-t lg:border-t-0 lg:border-l">
          {mediumRows.map((row) => (
            <MetricTileSkeleton key={row} />
          ))}
        </div>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {mediumRows.map((row, index) => (
        <PocketCardSkeleton key={row} tone={index} />
      ))}
    </section>

    <ProgressListCardSkeleton rows={5} />
  </div>
);

const HistorySkeleton = () => (
  <div className="flex flex-col gap-5">
    <PageHeaderSkeleton action />
    <section className="border-line bg-surface grid gap-3 rounded-md border p-4 sm:grid-cols-3">
      {smallRows.map((row) => (
        <div className="border-line rounded-sm border px-3 py-2" key={row}>
          <SkeletonLine className="w-24" />
          <SkeletonLine className="mt-2 h-6 w-32" />
        </div>
      ))}
    </section>
    <Card>
      <CardHeader className="border-line gap-3 border-b">
        <div className="flex items-center justify-between gap-3">
          <SkeletonLine className="h-5 w-32" />
          <SkeletonLine className="h-4 w-20" />
        </div>
        <Skeleton className="h-11 w-full" />
        <div className="border-line bg-sky/30 grid gap-3 rounded-sm border p-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
          {mediumRows.map((row) => (
            <div className="flex flex-col gap-1.5" key={row}>
              <SkeletonLine className="w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-line divide-y">
          <li className="text-muted hidden grid-cols-[minmax(0,1fr)_8rem_6rem_8rem_3rem] gap-3 px-4 py-3 md:grid">
            {mediumRows.map((row) => (
              <SkeletonLine className="h-3" key={row} />
            ))}
            <SkeletonLine className="h-3" />
          </li>
          {largeRows.map((row) => (
            <TransactionRowSkeleton key={row} />
          ))}
        </ul>
      </CardContent>
    </Card>
  </div>
);

const GoalsSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
    <PageHeaderSkeleton />
    <section className="border-line bg-surface overflow-hidden rounded-lg border">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="bg-teal/10 p-4 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <SkeletonLine className="w-28" />
              <SkeletonLine className="mt-3 h-11 w-56 sm:w-72" />
              <SkeletonLine className="mt-3 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <SkeletonCircle className="h-20 w-20 sm:h-24 sm:w-24" />
              <div className="w-20">
                <SkeletonLine className="h-8 w-full" />
                <SkeletonLine className="mt-2 w-16" />
              </div>
            </div>
          </div>
          <Skeleton className="mt-5 h-2.5 w-full rounded-full" />
        </div>
        <div className="border-line grid grid-cols-2 gap-0 border-t lg:border-t-0 lg:border-l">
          {mediumRows.map((row) => (
            <MetricTileSkeleton key={row} withIcon />
          ))}
        </div>
      </div>
    </section>
    <MascotTipSkeleton />
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:items-start">
      <CompactListCardSkeleton rows={3} />
      <FormCardSkeleton />
    </div>
  </div>
);

const SettingsSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
    <PageHeaderSkeleton />
    <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
      <Card>
        <CardContent className="flex gap-2 p-3 lg:flex-col">
          {["account", "security", "language", "categories"].map((row) => (
            <Skeleton className="h-10 flex-1 lg:w-full" key={row} />
          ))}
        </CardContent>
      </Card>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader className="border-line border-b">
            <SkeletonLine className="h-5 w-40" />
            <SkeletonLine className="w-full max-w-md" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
            {mediumRows.map((row) => (
              <SettingRowSkeleton key={row} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="border-line border-b">
            <SkeletonLine className="h-5 w-36" />
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {smallRows.map((row) => (
              <Skeleton className="h-20 w-full" key={row} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

const AddTransactionSkeleton = () => (
  <div className="flex flex-col gap-4">
    <PageHeaderSkeleton />
    <StepRailSkeleton />
    <FormStepSkeleton />
    <FormStepSkeleton withPreview />
    <FormStepSkeleton compact />
  </div>
);

const PocketCardSkeleton = ({ tone }: { tone: number }) => (
  <article className="border-line bg-surface flex flex-col overflow-hidden rounded-lg border">
    <div
      className={cn(
        "flex h-28 items-center justify-center sm:h-32",
        tone === 0 && "bg-teal/10",
        tone === 1 && "bg-lime/25",
        tone === 2 && "bg-coral/10",
        tone === 3 && "bg-line/35"
      )}
    >
      <SkeletonCircle className="h-20 w-20 sm:h-24 sm:w-24" />
    </div>
    <div className="flex flex-1 flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <SkeletonLine className="h-5 w-24" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <SkeletonLine className="mt-3 w-full" />
      <SkeletonLine className="mt-2 w-4/5" />
      <div className="mt-auto pt-5">
        <SkeletonLine className="w-20" />
        <SkeletonLine className="mt-2 h-7 w-32" />
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <SkeletonLine className="w-24" />
          <SkeletonLine className="w-10" />
        </div>
        <Skeleton className="mt-4 h-9 w-full" />
      </div>
    </div>
  </article>
);

const CompactListCardSkeleton = ({
  className,
  rows,
}: {
  className?: string;
  rows: number;
}) => (
  <Card className={className}>
    <CardHeader className="border-line border-b">
      <div className="flex items-center justify-between gap-3">
        <div>
          <SkeletonLine className="h-5 w-36" />
          <SkeletonLine className="mt-2 w-28" />
        </div>
        <SkeletonLine className="w-12" />
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <ul className="divide-line divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <TransactionRowSkeleton key={index} />
        ))}
      </ul>
    </CardContent>
  </Card>
);

const TransactionRowSkeleton = () => (
  <li className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_3rem]">
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_8rem_6rem_8rem] md:items-center">
      <div>
        <SkeletonLine className="h-4 w-40 max-w-full" />
        <SkeletonLine className="mt-2 w-32 md:hidden" />
      </div>
      <SkeletonLine className="hidden md:block" />
      <Skeleton className="hidden h-6 w-16 rounded-full md:block" />
      <div className="flex items-center justify-between gap-2 md:justify-end">
        <SkeletonLine className="w-14 md:hidden" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
    <div className="flex items-start justify-end md:items-center">
      <SkeletonCircle className="h-8 w-8" />
    </div>
  </li>
);

const ProgressListCardSkeleton = ({
  className,
  rows,
}: {
  className?: string;
  rows: number;
}) => (
  <Card className={className}>
    <CardHeader className="border-line border-b">
      <SkeletonLine className="h-5 w-40" />
      <SkeletonLine className="w-56 max-w-full" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index}>
          <div className="flex items-center justify-between gap-3">
            <SkeletonLine className="h-4 w-32" />
            <SkeletonLine className="w-20" />
          </div>
          <Skeleton className="mt-2 h-2 w-full rounded-full" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const TallInsightCardSkeleton = ({ className }: { className?: string }) => (
  <Card className={className}>
    <CardHeader>
      <SkeletonLine className="h-5 w-32" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="border-line bg-sky/45 rounded-md border p-4">
        <SkeletonCircle className="h-14 w-14" />
        <SkeletonLine className="mt-4 h-5 w-36" />
        <SkeletonLine className="mt-2 w-full" />
        <SkeletonLine className="mt-2 w-4/5" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      {smallRows.map((row) => (
        <div className="flex items-center gap-3" key={row}>
          <SkeletonCircle className="h-9 w-9" />
          <div className="flex-1">
            <SkeletonLine className="w-32" />
            <SkeletonLine className="mt-2 w-20" />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

const WideSignalSkeleton = ({ className }: { className?: string }) => (
  <Card className={className}>
    <CardContent className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_14rem] md:items-center">
      <div>
        <SkeletonLine className="h-5 w-40" />
        <SkeletonLine className="mt-3 w-full max-w-lg" />
        <SkeletonLine className="mt-2 w-3/4" />
      </div>
      <Skeleton className="h-11 w-full" />
    </CardContent>
  </Card>
);

const MascotTipSkeleton = () => (
  <div className="border-line bg-surface rounded-lg border p-4 sm:p-5">
    <div className="flex items-start gap-4">
      <SkeletonCircle className="h-14 w-14 shrink-0" />
      <div className="flex-1">
        <SkeletonLine className="h-5 w-40" />
        <SkeletonLine className="mt-2 w-full max-w-2xl" />
        <SkeletonLine className="mt-2 w-2/3" />
      </div>
    </div>
  </div>
);

const FormCardSkeleton = () => (
  <Card className="2xl:sticky 2xl:top-5">
    <CardHeader className="border-line border-b">
      <SkeletonLine className="h-5 w-36" />
      <SkeletonLine className="w-full" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
      <Skeleton className="h-20 w-full" />
      <FieldSkeleton />
      <FieldSkeleton />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

const FieldSkeleton = () => (
  <div className="flex flex-col gap-2">
    <SkeletonLine className="w-24" />
    <Skeleton className="h-10 w-full" />
  </div>
);

const SettingRowSkeleton = () => (
  <div className="border-line flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      <SkeletonCircle className="h-10 w-10" />
      <div>
        <SkeletonLine className="h-4 w-36" />
        <SkeletonLine className="mt-2 w-52 max-w-full" />
      </div>
    </div>
    <Skeleton className="h-10 w-full sm:w-32" />
  </div>
);

const StepRailSkeleton = () => (
  <div className="grid grid-cols-3 gap-2">
    {smallRows.map((row) => (
      <Skeleton className="h-2 rounded-full" key={row} />
    ))}
  </div>
);

const FormStepSkeleton = ({
  compact = false,
  withPreview = false,
}: {
  compact?: boolean;
  withPreview?: boolean;
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <SkeletonCircle className="h-7 w-7" />
        <SkeletonLine className="h-5 w-36" />
      </div>
      <SkeletonLine className="w-full max-w-md" />
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      {withPreview ? <Skeleton className="h-24 w-full" /> : null}
      <FieldSkeleton />
      {compact ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      )}
    </CardContent>
  </Card>
);
