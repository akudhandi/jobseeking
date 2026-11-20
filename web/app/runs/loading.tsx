import {
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
      <SkeletonCards />
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <SkeletonPanel className="lg:col-span-7" rows={5} />
        <SkeletonPanel className="lg:col-span-5" rows={5} />
      </div>
      <div className="mt-4 rounded-card border border-line bg-surface pb-2">
        <div className="px-5 py-5">
          <div className="h-3.5 w-32 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="border-t border-line">
          <SkeletonRows rows={6} />
        </div>
      </div>
    </div>
  );
}
