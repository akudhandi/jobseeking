import { cn } from "@/lib/utils";

export function LegendDot({
  color,
  label,
  className,
}: {
  color: string;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] text-ink/70", className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export const SERIES = {
  ink: "#0B0B0D",
  coral: "#FF4D2E",
  mint: "#2FB968",
  sun: "#D89012",
  lilac: "#8B7CF6",
} as const;
