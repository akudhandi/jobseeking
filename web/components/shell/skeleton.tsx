import { cn } from "@/lib/utils";

/**
 * Loading placeholders. They mirror the real layout rather than showing a
 * spinner, so the page does not jump when the data lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function SkeletonHeader() {
  return (
    <div className="mb-6">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-9 w-56 sm:h-12 sm:w-80" />
      <Skeleton className="mt-3 h-3 w-full max-w-xl" />
      <Skeleton className="mt-2 h-3 w-44" />
    </div>
  );
}

export function SkeletonCards({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-card border border-line bg-surface p-5">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="mt-3 h-3 w-32" />
          <Skeleton className="mt-2 h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel({
  rows = 6,
  className,
  withHeader = true,
}: {
  rows?: number;
  className?: string;
  withHeader?: boolean;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-5", className)}>
      {withHeader ? (
        <>
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="mt-2 h-2.5 w-52" />
        </>
      ) : null}
      <div className={cn("space-y-4", withHeader && "mt-5")}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-3 w-[38%]" />
            <Skeleton className="h-[5px] flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Hairline list ghost: title and meta on the left, one number on the right. */
export function SkeletonRows({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <li key={index} className="flex items-center gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-[55%]" />
            <Skeleton className="mt-2 h-2.5 w-[32%]" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="hidden h-3 w-12 shrink-0 sm:block" />
        </li>
      ))}
    </ul>
  );
}

/** Announced once per loading screen; the ghosts themselves are decorative. */
export function SkeletonLabel({ children = "Memuat data…" }: { children?: React.ReactNode }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {children}
    </span>
  );
}
