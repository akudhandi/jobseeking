import Link from "next/link";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type { ScrapeHealth, ScrapeStatus } from "@/lib/types";

const TONE: Record<ScrapeStatus, { box: string; Icon: typeof AlertTriangle }> = {
  ok: { box: "border-mint/30 bg-mint-soft text-ink", Icon: Info },
  stale: { box: "border-sun/30 bg-sun-soft text-ink", Icon: AlertTriangle },
  empty: { box: "border-sun/30 bg-sun-soft text-ink", Icon: AlertTriangle },
  failing: { box: "border-coral/30 bg-coral-soft text-ink", Icon: XCircle },
  hung: { box: "border-coral/30 bg-coral-soft text-ink", Icon: XCircle },
  never: { box: "border-line bg-muted text-ink", Icon: Info },
};

export const SCRAPE_STATUS_LABEL: Record<ScrapeStatus, string> = {
  ok: "Sehat",
  stale: "Data kedaluwarsa",
  empty: "Hasil kosong",
  failing: "Gagal",
  hung: "Macet",
  never: "Belum pernah scrape",
};

/** Only rendered when something is wrong: a healthy pipeline needs no banner. */
export function HealthBanner({ health }: { health: ScrapeHealth | null }) {
  if (!health || health.status === "ok") return null;

  const tone = TONE[health.status] ?? TONE.never;
  const Icon = tone.Icon;

  return (
    <div
      className={cn(
        "mb-5 flex items-start gap-2.5 rounded-card border px-4 py-3 text-[13px]",
        tone.box,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <span className="font-semibold">{SCRAPE_STATUS_LABEL[health.status]}</span>
        <span className="mx-2 opacity-30">·</span>
        <span>{health.message}</span>
        {health.last_success_at ? (
          <span className="ml-1 opacity-70">
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
