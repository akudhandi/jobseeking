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
  labelWidth = "7.5rem",
  hintAt = "label",
  className,
}: {
  rows: RangeRow[];
  max?: number;
  /** Group names vary in length; the caller knows how much room its card has. */
  labelWidth?: string;
  /** Counts belong next to the name when it is short, next to the value when it is not. */
  hintAt?: "label" | "value";
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
            style={{ gridTemplateColumns: `minmax(0,${labelWidth}) minmax(0,1fr) auto` }}
            className="grid items-center gap-3"
          >
            <span className="min-w-0 truncate text-[12px] text-ink/75" title={row.label}>
              {row.label}
              {row.hint && hintAt === "label" ? (
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
              {row.hint && hintAt === "value" ? (
                <span className="ml-1.5 font-normal text-muted-foreground">{row.hint}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
