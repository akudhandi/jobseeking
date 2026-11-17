import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Headline number. The unit renders smaller than the value, the way a printed
 * dashboard does it, so "2,1%" and "201" can sit in the same grid without the
 * percentage looking like a rounding error.
 */
export function BigStat({
  value,
  unit,
  label,
  delta,
  hint,
  size = "hero",
  className,
}: {
  value: string;
  unit?: string;
  label?: string;
  delta?: React.ReactNode;
  hint?: string;
  size?: "hero" | "card";
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-start gap-1">
        <span
          className={cn(
            "num font-medium leading-[0.95] tracking-[-0.04em] text-ink",
            size === "hero" ? "text-[52px] sm:text-[64px]" : "text-[40px] sm:text-[46px]",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span
            className={cn(
              "font-medium tracking-tight text-muted-foreground",
              size === "hero" ? "pt-1 text-[22px]" : "pt-0.5 text-[18px]",
            )}
          >
            {unit}
          </span>
        ) : null}
        {delta ? <span className="pt-1.5">{delta}</span> : null}
      </div>
      {label ? <div className="mt-2 text-[13px] text-ink/75">{label}</div> : null}
      {hint ? <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Change marker. Up is not automatically good, so colour follows the sign only. */
export function Delta({
  value,
  suffix = "%",
  labels,
  className,
}: {
  value: number | null;
  suffix?: string;
  labels?: string;
  className?: string;
}) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 text-[12px] font-medium",
        up ? "text-mint" : "text-coral",
        className,
      )}
      title={labels}
    >
      <span aria-hidden className="text-[9px] leading-none">
        {up ? "▲" : "▼"}
      </span>
      {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Math.abs(value))}
      {suffix}
    </span>
  );
}

/** Label + value + optional hint, stacked for a sidebar-style block. */
export function StatLine({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <span className="text-[13px] text-ink/70">{label}</span>
      <span className="num text-right text-[13px] font-medium text-ink">
        {value}
        {hint ? <span className="ml-1.5 font-normal text-muted-foreground">{hint}</span> : null}
      </span>
    </div>
  );
}

/** Thin coverage meter: a 4px track, no gradients, value always visible. */
export function MeterRow({
  label,
  percent,
  detail,
  tone = "ink",
}: {
  label: string;
  percent: number;
  detail?: string;
  tone?: "ink" | "coral" | "mint" | "sun";
}) {
  const fill: Record<string, string> = {
    ink: "bg-ink",
    coral: "bg-coral",
    mint: "bg-mint",
    sun: "bg-sun",
  };
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink/70">{label}</span>
        <span className="num text-[13px] font-medium text-ink">
          {percent.toString().replace(".", ",")}%
          {detail ? <span className="ml-1.5 font-normal text-muted-foreground">{detail}</span> : null}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-pill bg-muted">
        <div
          className={cn("h-full rounded-pill transition-[width] duration-500 ease-swift", fill[tone])}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}
