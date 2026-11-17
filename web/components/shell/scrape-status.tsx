"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import type { ScrapeHealth, ScrapeStatus } from "@/lib/types";
import { SCRAPE_STATUS_LABEL } from "@/components/health-banner";

const DOT: Record<ScrapeStatus, string> = {
  ok: "bg-mint",
  stale: "bg-sun",
  empty: "bg-sun",
  failing: "bg-coral",
  hung: "bg-coral",
  never: "bg-ink/25",
};

/**
 * Live pipeline status in the top bar; opens the run history. Fetched in the
 * browser so the nav never forces every route (including the client-rendered
 * ones) to become a server-rendered page just to render a status dot.
 */
export function ScrapeStatusPill({ className }: { className?: string }) {
  const [health, setHealth] = useState<ScrapeHealth | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<ScrapeHealth>("/health/scrape")
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const status: ScrapeStatus = health?.status ?? "never";
  // "never" means the API really has no successful run on record; a failed
  // fetch is a different thing and must not be reported as a pipeline problem.
  const label = !loaded ? "Memuat status…" : health ? SCRAPE_STATUS_LABEL[status] : "Status tidak tersedia";
  const when = health?.last_success_at ? formatRelative(health.last_success_at) : "";
  const dot = !loaded || !health ? "bg-ink/20" : DOT[status];

  return (
    <Link
      href="/runs"
      title={health?.message ?? "Riwayat proses scraping"}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5",
        "text-[13px] font-medium text-ink transition-colors duration-150 ease-swift hover:bg-muted",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
      {when ? <span className="hidden text-muted-foreground xl:inline">{when}</span> : null}
    </Link>
  );
}
