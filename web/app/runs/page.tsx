import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { HealthBanner, SCRAPE_STATUS_LABEL } from "@/components/health-banner";
import { KpiCard } from "@/components/kpi";
import { safeGet } from "@/lib/api";
import { formatDateTime, formatDuration, formatNumber, formatRelative } from "@/lib/format";
import type { CrawlRunItem, ScrapeHealth } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, "default" | "secondary" | "outline" | "muted"> = {
  completed: "secondary",
  running: "outline",
  failed: "default",
};

const RUN_STATUS_LABEL: Record<string, string> = {
  completed: "Selesai",
  running: "Berjalan",
  failed: "Gagal",
};

const COVERAGE_ROWS: {
  key: Exclude<keyof ScrapeHealth["coverage"], "total_jobs">;
  label: string;
  hint?: string;
}[] = [
  { key: "salary", label: "Gaji" },
  { key: "city", label: "Kota", hint: "Lowongan remote hanya mencantumkan negara" },
  { key: "province", label: "Provinsi" },
  { key: "employment_type", label: "Jenis pekerjaan" },
  { key: "seniority", label: "Senioritas" },
  { key: "experience", label: "Minimal pengalaman" },
  { key: "description", label: "Deskripsi" },
  { key: "keyword", label: "Kata kunci pencarian" },
];

export default async function RunsPage() {
  const [health, runs] = await Promise.all([
    safeGet<ScrapeHealth | null>("/health/scrape", null),
    safeGet<{ total: number; items: CrawlRunItem[] }>("/runs?limit=40", { total: 0, items: [] }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Riwayat scrape</h1>
        <p className="text-sm text-muted-foreground">
          Kesehatan pipeline dan hasil tiap proses scraping, terbaru di atas.
        </p>
      </header>

      <HealthBanner health={health} />

      {health ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              label="Status"
              value={SCRAPE_STATUS_LABEL[health.status]}
              hint={health.message}
            />
            <KpiCard
              label="Sukses terakhir"
              value={formatRelative(health.last_success_at)}
              hint={formatDateTime(health.last_success_at)}
            />
            <KpiCard
              label="Jadwal berikutnya"
              value={formatRelative(health.next_due_at)}
              hint={`Target tiap ${health.interval_hours} jam`}
            />
            <KpiCard
              label="Gagal beruntun"
              value={formatNumber(health.consecutive_failures)}
              hint={`Batas data basi ${health.stale_after_hours} jam`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Kelengkapan data ({formatNumber(health.coverage.total_jobs)} lowongan)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {COVERAGE_ROWS.map(({ key, label, hint }) => {
                  const entry = health.coverage[key];
                  return (
                    <div key={key}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span>{label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {entry.percent}% · {formatNumber(entry.count)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, entry.percent)}%` }}
                        />
                      </div>
                      {hint ? (
                        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proses terakhir</CardTitle>
              </CardHeader>
              <CardContent>
                {health.last_run ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <Field label="Mulai" value={formatDateTime(health.last_run.started_at)} />
                    <Field label="Durasi" value={formatDuration(health.last_run.duration_seconds)} />
                    <Field label="Halaman" value={formatNumber(health.last_run.pages_fetched)} />
                    <Field label="Ditemukan" value={formatNumber(health.last_run.jobs_found)} />
                    <Field label="Baru" value={formatNumber(health.last_run.jobs_new)} />
                    <Field label="Diperbarui" value={formatNumber(health.last_run.jobs_updated)} />
                    <Field label="Gagal simpan" value={formatNumber(health.last_run.jobs_failed)} />
                    <Field
                      label="Status"
                      value={RUN_STATUS_LABEL[health.last_run.status] ?? health.last_run.status}
                    />
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada proses scrape.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            API tidak dapat dihubungi.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Semua proses ({formatNumber(runs.total)})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH className="w-12">#</TH>
                <TH>Mulai</TH>
                <TH>Durasi</TH>
                <TH>Status</TH>
                <TH className="text-right">Halaman</TH>
                <TH className="text-right">Ditemukan</TH>
                <TH className="text-right">Baru</TH>
                <TH className="text-right">Diperbarui</TH>
                <TH className="text-right">Gagal</TH>
              </TR>
            </THead>
            <TBody>
              {runs.items.map((run) => (
                <TR key={run.id}>
                  <TD className="text-muted-foreground">{run.id}</TD>
                  <TD>
                    <div>{formatDateTime(run.started_at)}</div>
                    <div className="text-xs text-muted-foreground">{formatRelative(run.started_at)}</div>
                  </TD>
                  <TD className="tabular-nums">{formatDuration(run.duration_seconds)}</TD>
                  <TD>
                    <Badge variant={STATUS_BADGE[run.status] ?? "muted"}>
                      {RUN_STATUS_LABEL[run.status] ?? run.status}
                    </Badge>
                  </TD>
                  <TD className="text-right tabular-nums">{formatNumber(run.pages_fetched)}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(run.jobs_found)}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(run.jobs_new)}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(run.jobs_updated)}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(run.jobs_failed)}</TD>
                </TR>
              ))}
              {!runs.items.length && (
                <TR>
                  <TD colSpan={9} className="py-8 text-center text-muted-foreground">
                    Belum ada proses scrape.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
