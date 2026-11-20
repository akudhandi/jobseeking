import {
  Skeleton,
  SkeletonCards,
  SkeletonHeader,
  SkeletonLabel,
  SkeletonPanel,
  SkeletonRows,
} from "@/components/shell/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true">
      <SkeletonLabel />
      <SkeletonHeader />

      <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="grid gap-x-3 gap-y-3.5 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      <SkeletonCards className="mt-4" />
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <SkeletonPanel className="lg:col-span-8" rows={8} />
        <SkeletonPanel className="lg:col-span-4" rows={5} />
      </div>
      <div className="mt-4 rounded-card border border-line bg-surface pb-2">
        <div className="px-5 py-5">
          <div className="h-3.5 w-36 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="border-t border-line">
          <SkeletonRows rows={6} />
        </div>
      </div>
    </div>
  );
}
