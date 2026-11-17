import { cn } from "@/lib/utils";

export interface BarItem {
  label: string;
  value: number;
  hint?: string;
}

/**
 * Ranked list as thin hairlines instead of Recharts bars: crisper at 1-2px,
 * labels stay readable without rotated ticks, and no chart library is needed
 * for what is really a sorted table.
 */
export function BarList({
  items,
  max,
  color = "#0B0B0D",
  valueLabel,
  className,
}: {
  items: BarItem[];
  max?: number;
  color?: string;
  valueLabel?: (item: BarItem) => string;
  className?: string;
}) {
  if (!items.length) return null;
  const top = max ?? Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-[36%] min-w-0 truncate text-[13px] text-ink/80" title={item.label}>
            {item.label}
          </span>
          <span className="relative h-[5px] flex-1 overflow-hidden rounded-pill bg-muted">
            <span
              className="absolute inset-y-0 left-0 rounded-pill"
              style={{
                width: `${Math.max(2, (item.value / top) * 100)}%`,
                background: color,
                opacity: 0.85,
              }}
            />
          </span>
          <span className="num w-12 shrink-0 text-right text-[13px] font-medium text-ink">
            {valueLabel ? valueLabel(item) : item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
