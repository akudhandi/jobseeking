import { Skeleton, SkeletonHeader, SkeletonLabel, SkeletonRows } from "@/components/shell/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true">
      <SkeletonLabel />
      <SkeletonHeader />

      <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3 xl:grid-cols-12">
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3 xl:col-span-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-1.5 xl:col-span-2">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-card border border-line bg-surface pb-2">
        <div className="border-b border-line px-5 py-4">
          <div className="h-3.5 w-24 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-2.5 w-56 animate-pulse rounded-md bg-muted" />
        </div>
        <SkeletonRows rows={8} />
      </div>
    </div>
  );
}
