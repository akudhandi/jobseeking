import { ArrowUpRight, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardActions, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconLink } from "@/components/ui/icon-button";
import { PillLink } from "@/components/ui/pill";
import { BigStat, MeterRow, StatLine } from "@/components/ui/stat";
import { HealthBanner, SCRAPE_STATUS_LABEL } from "@/components/health-banner";
import { PageHeader } from "@/components/shell/page-header";
import { safeGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDuration, formatNumber, formatRelative } from "@/lib/format";
import type { CrawlRunItem, ScrapeHealth } from "@/lib/types";

export const dynamic = "force-dynamic";

const RUN_STATUS_LABEL: Record<string, string> = {
  completed: "Selesai",
  running: "Berjalan",
  failed: "Gagal",
};

/** Status colour carries the meaning; the label stays plain text. */
const STATUS_TONE: Record<string, string> = {
  completed: "border-mint/30 bg-mint-soft text-ink",
  running: "border-sun/30 bg-sun-soft text-ink",
  failed: "border-coral/30 bg-coral-soft text-ink",
};

const COVERAGE_ROWS: {
  key: Exclude<keyof ScrapeHealth["coverage"], "total_jobs" | "inactive_jobs">;
  label: string;
  tone?: "ink" | "coral";
}[] = [
  { key: "description", label: "Deskripsi" },
  { key: "province", label: "Provinsi" },
  { key: "employment_type", label: "Jenis pekerjaan" },
  { key: "keyword", label: "Kata kunci pencarian" },
  { key: "city", label: "Kota" },
  { key: "seniority", label: "Senioritas" },
  { key: "experience", label: "Minimal pengalaman" },
  { key: "salary", label: "Gaji", tone: "coral" },
];

/** One interval per row: time, duration, status, then the five run counters. */
const GRID =
  "grid grid-cols-1 gap-x-3 gap-y-1 md:grid-cols-[minmax(0,1fr)_4rem_5.5rem_3.6rem_3.6rem_3.6rem_3.6rem_3.6rem] md:items-center";

const one = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

export default async function Page() {
  const [health, runs] = await Promise.all([
    safeGet<ScrapeHealth | null>("/health/scrape", null),
    safeGet<{ total: number; items: CrawlRunItem[] }>("/runs?limit=40", { total: 0, items: [] }),
  ]);

  const totalJobs = health?.coverage.total_jobs ?? 0;
  const dueHours = health?.next_due_at
    ? (new Date(health.next_due_at).getTime() - Date.now()) / 3_600_000
    : null;
  const lastRun = health?.last_run ?? null;

  return (
    <div>
      <PageHeader
        crumb="Riwayat scrape"
        title="Riwayat Scrape"
        description="Kesehatan pipeline dan hasil tiap proses scraping, terbaru di atas. Ticker cron memeriksa tiap 30 menit, tetapi scrape penuh hanya jalan setelah interval terlewati."
        meta={
          health ? (
            <>
              <span>{SCRAPE_STATUS_LABEL[health.status]}</span>
              <span className="opacity-40">·</span>
              <span>{formatNumber(totalJobs)} lowongan aktif</span>
              <span className="opacity-40">·</span>
              <span>{formatNumber(runs.total)} proses tercatat</span>
            </>
          ) : (
            <span>API tidak dapat dihubungi</span>
          )
        }
        actions={
          <PillLink href="/jobs" icon={ArrowUpRight}>
            Buka lowongan
          </PillLink>
        }
      />

      <HealthBanner health={health} />

      {health ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent>
                <BigStat
                  size="card"
                  value={SCRAPE_STATUS_LABEL[health.status]}
                  label="status pipeline"
                  hint={health.message}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <BigStat
                  size="card"
                  value={one(health.age_hours)}
                  unit="jam"
                  label="sejak scrape sukses terakhir"
                  hint={health.last_success_at ? formatDateTime(health.last_success_at) : "belum pernah sukses"}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <BigStat
                  size="card"
                  value={dueHours === null ? "—" : one(Math.abs(dueHours))}
                  unit={dueHours === null ? undefined : "jam"}
                  label={dueHours !== null && dueHours < 0 ? "terlambat dari jadwal" : "menuju jadwal berikutnya"}
                  hint={`Target tiap ${health.interval_hours} jam`}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <BigStat
                  size="card"
                  value={formatNumber(health.consecutive_failures)}
                  label="gagal beruntun"
                  hint={
                    health.consecutive_failures
                      ? `Data dianggap basi setelah ${health.stale_after_hours} jam`
                      : `Batas data basi ${health.stale_after_hours} jam`
                  }
                />
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <Card className="flex flex-col lg:col-span-7">
              <CardHeader>
                <div>
                  <CardTitle>Kelengkapan data</CardTitle>
                  <CardDescription>
                    Berapa persen dari {formatNumber(totalJobs)} lowongan aktif yang field-nya terisi.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {COVERAGE_ROWS.map(({ key, label, tone }) => {
                  const entry = health.coverage[key];
                  return (
                    <MeterRow
                      key={key}
                      label={label}
                      percent={entry.percent}
                      tone={tone}
                      detail={`${formatNumber(entry.count)} lowongan`}
                    />
                  );
                })}
                <p className="mt-auto border-t border-line pt-4 text-[11px] leading-relaxed text-muted-foreground">
                  Lowongan remote biasanya hanya menyebut negara, jadi kolom kota rendah secara wajar.
                  Gaji jarang dicantumkan; nilainya tidak pernah ditebak.
                </p>
              </CardContent>
            </Card>

            <Card className="flex flex-col lg:col-span-5">
              <CardHeader>
                <div>
                  <CardTitle>Proses terakhir</CardTitle>
                  <CardDescription>
                    {lastRun
                      ? `Proses #${lastRun.id}, ${formatRelative(lastRun.started_at)}`
                      : "Belum ada proses scrape."}
                  </CardDescription>
                </div>
                <CardActions>
                  <IconLink href="/jobs" icon={ArrowUpRight} label="Buka daftar lowongan" />
                </CardActions>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2.5">
                {lastRun ? (
                  <>
                    <StatLine label="Mulai" value={formatDateTime(lastRun.started_at)} />
                    <StatLine label="Selesai" value={formatDateTime(lastRun.finished_at)} />
                    <StatLine label="Durasi" value={formatDuration(lastRun.duration_seconds)} />
                    <StatLine label="Halaman diambil" value={formatNumber(lastRun.pages_fetched)} />
                    <StatLine label="Ditemukan" value={formatNumber(lastRun.jobs_found)} />
                    <StatLine label="Baru" value={formatNumber(lastRun.jobs_new)} />
                    <StatLine label="Diperbarui" value={formatNumber(lastRun.jobs_updated)} />
                    <StatLine label="Gagal simpan" value={formatNumber(lastRun.jobs_failed)} />
                    <StatLine
                      label="Status"
                      value={
                        <Badge
                          variant="outline"
                          className={STATUS_TONE[lastRun.status] ?? "bg-muted text-muted-foreground"}
                        >
                          {RUN_STATUS_LABEL[lastRun.status] ?? lastRun.status}
                        </Badge>
                      }
                    />
                    <p className="mt-auto border-t border-line pt-3 text-[11px] leading-relaxed text-muted-foreground">
                      Ticker mengunci dirinya sendiri (flock) dan mencatat waktu selesai di
                      <span className="num"> data/.last_scrape</span>, jadi proses yang lama tidak
                      memicu run kedua 30 menit kemudian.
                    </p>
                  </>
                ) : (
                  <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground">
                    Belum ada proses scrape.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-[13px] text-muted-foreground">
            API tidak dapat dihubungi, jadi status pipeline dan kelengkapan data tidak bisa ditampilkan.
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Semua proses</CardTitle>
            <CardDescription>
              {formatNumber(runs.total)} proses tercatat, terbaru di atas.
            </CardDescription>
          </div>
          <CardActions>
            <IconLink href="/jobs" icon={ArrowUpRight} label="Buka daftar lowongan" />
          </CardActions>
        </CardHeader>

        <div className="mt-4 border-t border-line">
          <div className={cn(GRID, "hidden border-b border-line px-5 py-2 md:grid")}>
            <ColumnLabel>Mulai</ColumnLabel>
            <ColumnLabel className="text-right">Durasi</ColumnLabel>
            <ColumnLabel>Status</ColumnLabel>
            <ColumnLabel className="text-right">Halaman</ColumnLabel>
            <ColumnLabel className="text-right">Ditemukan</ColumnLabel>
            <ColumnLabel className="text-right">Baru</ColumnLabel>
            <ColumnLabel className="text-right">Diperbarui</ColumnLabel>
            <ColumnLabel className="text-right">Gagal</ColumnLabel>
          </div>

          <ul className="divide-y divide-line">
            {runs.items.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </ul>

          {!runs.items.length ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <RotateCw className="h-4 w-4 text-muted-foreground" />
              <p className="text-[13px] font-medium text-ink">Belum ada proses scrape</p>
              <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                Baris akan muncul setelah ticker cron menjalankan scraping pertama. Jadwalnya tiap 30
                menit, dan scrape penuh mengikuti interval yang tertera di atas.
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function ColumnLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function RunRow({ run }: { run: CrawlRunItem }) {
  const failed = run.jobs_failed > 0;

  return (
    <li className={cn(GRID, "px-5 py-3.5 transition-colors duration-150 hover:bg-muted/50")}>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="num text-[13px] font-medium text-ink">
            {formatDateTime(run.started_at)}
          </span>
          <span className="text-[11px] text-muted-foreground">#{run.id}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {formatRelative(run.started_at)}
        </div>
      </div>

      <div className="hidden text-right text-[12px] text-ink/80 md:block">
        <span className="num">{formatDuration(run.duration_seconds)}</span>
      </div>

      <div className="md:pt-0">
        <Badge
          variant="outline"
          className={STATUS_TONE[run.status] ?? "bg-muted text-muted-foreground"}
        >
          {RUN_STATUS_LABEL[run.status] ?? run.status}
        </Badge>
      </div>

      <div className="hidden text-right text-[12px] text-ink/80 md:block">
        <span className="num">{formatNumber(run.pages_fetched)}</span>
      </div>
      <div className="hidden text-right text-[12px] text-ink/80 md:block">
        <span className="num">{formatNumber(run.jobs_found)}</span>
      </div>
      <div className="hidden text-right text-[12px] text-ink/80 md:block">
        <span className="num">{formatNumber(run.jobs_new)}</span>
      </div>
      <div className="hidden text-right text-[12px] text-ink/80 md:block">
        <span className="num">{formatNumber(run.jobs_updated)}</span>
      </div>
      <div className="hidden text-right text-[12px] md:block">
        <span className={cn("num", failed ? "text-coral" : "text-muted-foreground")}>
          {formatNumber(run.jobs_failed)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground md:hidden">
        <span className="num">{formatDuration(run.duration_seconds)}</span>
        <span className="num">{formatNumber(run.pages_fetched)} halaman</span>
        <span className="num">{formatNumber(run.jobs_found)} ditemukan</span>
        <span className="num">{formatNumber(run.jobs_new)} baru</span>
        <span className={cn("num", failed && "text-coral")}>
          {formatNumber(run.jobs_failed)} gagal
        </span>
      </div>
    </li>
  );
}
