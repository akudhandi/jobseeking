import { cn } from "@/lib/utils";

/**
 * Compact stat block for pages that report a handful of numbers side by side.
 * The big display number lives in `components/ui/stat.tsx`; this is its smaller
 * sibling and keeps the original `(label, value, hint)` API.
 */
export function KpiCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-5 shadow-card", className)}>
      <div className="text-[13px] text-ink/70">{label}</div>
      <div className="num mt-2 text-[28px] font-medium leading-none tracking-[-0.03em] text-ink">
        {value}
      </div>
      {hint ? <div className="mt-2 text-[11px] leading-snug text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
