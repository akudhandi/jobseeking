import { SkeletonHeader, SkeletonLabel, SkeletonPanel } from "@/components/shell/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true">
      <SkeletonLabel />
      <SkeletonHeader />
      <div className="grid gap-4 lg:grid-cols-12">
        <SkeletonPanel className="lg:col-span-8" rows={5} />
        <SkeletonPanel className="lg:col-span-4" rows={5} />
        <SkeletonPanel className="lg:col-span-4" rows={4} />
        <SkeletonPanel className="lg:col-span-4" rows={4} />
        <SkeletonPanel className="lg:col-span-4" rows={4} />
      </div>
    </div>
  );
}
