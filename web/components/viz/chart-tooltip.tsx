"use client";

import type { TooltipProps } from "recharts";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Floating card used as Recharts `content`; the CSS tooltip looks nothing like the rest. */
export function TooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-pop backdrop-blur">
      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{title}</div>
      {rows.map((row) => (
        <div key={row.label} className="mt-1 flex items-center gap-2">
          {row.color ? (
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
          ) : null}
          <span className="text-[12px] text-ink/70">{row.label}</span>
          <span className="num ml-auto text-[12px] font-medium text-ink">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Adapter so a single-series chart can use TooltipCard without re-implementing it. */
export function SingleSeriesTooltip({
  active,
  payload,
  seriesLabel,
  unit = "",
  fullLabel,
}: TooltipProps<number, string> & {
  seriesLabel: string;
  unit?: string;
  fullLabel?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const raw = point?.payload as { label?: string; fullLabel?: string; value?: number } | undefined;
  if (!raw) return null;
  const label = raw.fullLabel ?? (fullLabel ? fullLabel(raw.label ?? "") : (raw.label ?? ""));
  return (
    <TooltipCard
      title={label}
      rows={[{ label: seriesLabel, value: `${raw.value ?? 0}${unit}`, color: "#0B0B0D" }]}
    />
  );
}
