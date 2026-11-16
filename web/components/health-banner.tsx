import Link from "next/link";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type { ScrapeHealth, ScrapeStatus } from "@/lib/types";

const TONE: Record<ScrapeStatus, { box: string; Icon: typeof AlertTriangle }> = {
  ok: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: AlertTriangle },
  stale: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  empty: { box: "border-amber-200 bg-amber-50 text-amber-900", Icon: AlertTriangle },
  failing: { box: "border-red-200 bg-red-50 text-red-900", Icon: XCircle },
  hung: { box: "border-red-200 bg-red-50 text-red-900", Icon: XCircle },
  never: { box: "border-slate-200 bg-slate-50 text-slate-900", Icon: Info },
};

export const SCRAPE_STATUS_LABEL: Record<ScrapeStatus, string> = {
  ok: "Sehat",
  stale: "Data kedaluwarsa",
  empty: "Hasil kosong",
  failing: "Gagal",
  hung: "Macet",
  never: "Belum pernah scrape",
};

export function HealthBanner({ health }: { health: ScrapeHealth | null }) {
  // A healthy scraper needs no banner; the dashboard itself is the good news.
  if (!health || health.status === "ok") return null;

  const tone = TONE[health.status] ?? TONE.never;
  const Icon = tone.Icon;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3 text-sm", tone.box)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <span className="font-semibold">{SCRAPE_STATUS_LABEL[health.status]}</span>
        <span className="mx-2 opacity-40">·</span>
        <span>{health.message}</span>
        {health.last_success_at ? (
          <span className="ml-1 opacity-80">
            Sukses terakhir {formatRelative(health.last_success_at)}.
          </span>
        ) : null}
        <Link href="/runs" className="ml-2 underline underline-offset-2">
          Lihat riwayat scrape
        </Link>
      </div>
    </div>
  );
}
