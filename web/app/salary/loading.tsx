import {
  SkeletonCards,
  SkeletonHeader,
  SkeletonLabel,
  SkeletonPanel,
} from "@/components/shell/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true">
      <SkeletonLabel />
      <SkeletonHeader />
      <SkeletonCards />
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <SkeletonPanel className="lg:col-span-8" rows={4} />
        <SkeletonPanel className="lg:col-span-4" rows={4} />
        <SkeletonPanel className="lg:col-span-6" rows={4} />
        <SkeletonPanel className="lg:col-span-6" rows={4} />
      </div>
    </div>
  );
}
