import { cn } from "@/lib/utils";
import { formatShortIDR } from "@/lib/format";

export interface RangeRow {
  label: string;
  min: number;
  max: number;
  hint?: string;
}

/**
 * Average salary band per group. A horizontal span reads the spread directly —
 * where it starts, where it ends, how wide — which a pair of grouped bars makes
 * you compute in your head. All rows share one scale so the bars compare.
 */
export function RangeRows({
  rows,
  max,
  className,
}: {
  rows: RangeRow[];
  max?: number;
  className?: string;
}) {
  if (!rows.length) return null;
  const top = max ?? Math.max(...rows.map((row) => row.max), 1);

  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((row) => {
        const left = Math.max(0, Math.min(100, (row.min / top) * 100));
        const width = Math.max(2, ((row.max - row.min) / top) * 100);
        return (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3"
          >
            <span className="min-w-0 truncate text-[12px] text-ink/75" title={row.label}>
              {row.label}
              {row.hint ? (
                <span className="ml-1.5 text-muted-foreground">· {row.hint}</span>
              ) : null}
            </span>
            <span className="relative h-[5px] w-full overflow-hidden rounded-pill bg-muted">
              <span
                className="absolute inset-y-0 rounded-pill bg-ink/80"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </span>
            <span className="num whitespace-nowrap text-right text-[12px] font-medium text-ink">
              {formatShortIDR(row.min)} – {formatShortIDR(row.max)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
