import { ArrowUpRight, History } from "lucide-react";
import { Card, CardActions, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconLink } from "@/components/ui/icon-button";
import { BigStat, Delta, MeterRow, StatLine } from "@/components/ui/stat";
import { BarList } from "@/components/viz/bar-list";
import { LegendDot, SERIES } from "@/components/viz/legend-dot";
import { SegmentColumns, type ColumnDatum } from "@/components/viz/segment-columns";
import { HealthBanner } from "@/components/health-banner";
import { PageHeader } from "@/components/shell/page-header";
import { safeGet } from "@/lib/api";
import { formatNumber, formatRelative, labelEmploymentType, SENIORITY_LABEL, WORK_TYPE_LABEL } from "@/lib/format";
import type { CompanyStat, Overview, ScrapeHealth, TrendItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY: Overview = {
  total_jobs: 0,
  inactive_jobs: 0,
  total_companies: 0,
  jobs_with_salary: 0,
  salary_coverage: 0,
  city_coverage: 0,
  employment_type_coverage: 0,
  description_coverage: 0,
  jatim_jobs: 0,
  remote_jobs: 0,
  last_scraped_at: null,
  by_city: [],
  by_work_type: [],
  by_seniority: [],
  by_keyword: [],
  by_employment_type: [],
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const pct = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function keyParts(key: string) {
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

/**
 * Fill the gaps between postings. LinkedIn's `posted_at` only covers the months
 * that actually have jobs, so a raw series would draw silence as a continuous
 * slope; the last 12 months are laid out instead, empty months included.
 */
function buildMonths(items: TrendItem[], anchorIso: string | null, count = 12) {
  const counts = new Map(items.map((item) => [item.bucket, item.count]));
  const anchor = anchorIso ? new Date(anchorIso) : new Date();
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - offset, 1));
    keys.push(monthKey(cursor));
  }

  const current = monthKey(anchor);
  const columns: ColumnDatum[] = keys.map((key) => {
    const { year, month } = keyParts(key);
    return {
      label: MONTH_SHORT[month - 1],
      fullLabel: `${MONTH_LONG[month - 1]} ${year}`,
      value: counts.get(key) ?? 0,
      highlight: key === current,
    };
  });

  const complete = keys.filter((key) => key < current);
  const latest = complete.at(-1);
  const previous = complete.at(-2);
  const delta =
    latest && previous && counts.has(previous) && (counts.get(previous) ?? 0) > 0
      ? ((counts.get(latest) ?? 0) - (counts.get(previous) ?? 0)) / (counts.get(previous) ?? 1) * 100
      : null;

  const labelFor = (key: string) => {
    const { year, month } = keyParts(key);
    return `${MONTH_LONG[month - 1]} ${year}`;
  };

  return {
    columns,
    currentKey: current,
    currentCount: counts.get(current) ?? 0,
    delta,
    deltaLabels:
      latest && previous ? `${labelFor(latest)} vs ${labelFor(previous)} (bulan lengkap terakhir)` : undefined,
  };
}

export default async function Page() {
  const [overview, trend, health, companies] = await Promise.all([
    safeGet<Overview>("/stats/overview", EMPTY),
    safeGet<{ items: TrendItem[] }>("/stats/trend", { items: [] }),
    safeGet<ScrapeHealth | null>("/health/scrape", null),
    safeGet<{ items: CompanyStat[] }>("/stats/companies?limit=6", { items: [] }),
  ]);

  const months = buildMonths(trend.items, overview.last_scraped_at);
  const remoteShare = overview.total_jobs ? (overview.remote_jobs / overview.total_jobs) * 100 : 0;
  const jatimShare = overview.total_jobs ? (overview.jatim_jobs / overview.total_jobs) * 100 : 0;
  const currentLabel = months.columns.find((column) => column.highlight)?.fullLabel ?? "";

  return (
    <div>
      <PageHeader
        crumb="Ringkasan"
        title="Pusat Data Lowongan"
        description="Pasar lowongan developer di Jawa Timur, dirangkum dari hasil scraping LinkedIn lewat endpoint guest."
        meta={
          <>
            <span>Diperbarui {formatRelative(overview.last_scraped_at)}</span>
            <span className="opacity-40">·</span>
            <span>{formatNumber(overview.total_jobs)} lowongan aktif</span>
            <span className="opacity-40">·</span>
            <span>{formatNumber(overview.total_companies)} perusahaan</span>
          </>
        }
      />

      <HealthBanner health={health} />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <div>
              <CardTitle>Lowongan per bulan</CardTitle>
              <CardDescription>Dihitung dari tanggal tayang yang dilaporkan LinkedIn.</CardDescription>
            </div>
            <CardActions>
              <IconLink href="/runs" icon={History} label="Riwayat scrape" />
              <IconLink href="/jobs" icon={ArrowUpRight} label="Buka daftar lowongan" />
            </CardActions>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <BigStat
                value={formatNumber(overview.total_jobs)}
                label="lowongan aktif"
                delta={<Delta value={months.delta} labels={months.deltaLabels} />}
                hint={
                  months.deltaLabels ? `Perubahan ${months.deltaLabels}` : "Belum cukup bulan lengkap untuk tren"
                }
              />
              <div className="flex flex-col items-end gap-1.5">
                <LegendDot color={SERIES.ink} label="Lowongan per bulan" />
                <LegendDot color={SERIES.coral} label="Bulan berjalan" />
              </div>
            </div>

            <div className="relative mt-5">
              <div className="pointer-events-none absolute right-0 top-0 z-10 rounded-xl border border-coral/20 bg-coral-soft px-2.5 py-1 text-[11px] text-ink">
                <span className="num font-medium">{formatNumber(months.currentCount)}</span> lowongan
                <span className="text-ink/60"> · {currentLabel.split(" ")[0]}</span>
              </div>
              <SegmentColumns data={months.columns} height={264} />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Bulan berjalan belum penuh, dan hanya lowongan yang tanggal tayangnya terbaca yang ikut
              dihitung.
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Kualitas data</CardTitle>
              <CardDescription>Seberapa lengkap tiap field terisi.</CardDescription>
            </div>
            <CardActions>
              <IconLink href="/runs" icon={ArrowUpRight} label="Rincian kelengkapan" />
            </CardActions>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-4">
            <MeterRow
              label="Deskripsi"
              percent={overview.description_coverage}
              detail={`${formatNumber(overview.total_jobs)} lowongan`}
            />
            <MeterRow
              label="Kota"
              percent={overview.city_coverage}
              detail={`${pct(jatimShare)}% Jawa Timur`}
            />
            <MeterRow
              label="Jenis pekerjaan"
              percent={overview.employment_type_coverage}
              detail="enum ternormalisasi"
            />
            <MeterRow
              label="Gaji"
              percent={overview.salary_coverage}
              tone="coral"
              detail={`${formatNumber(overview.jobs_with_salary)} lowongan`}
            />
            <div className="border-t border-line pt-4">
              <StatLine label="Remote" value={`${pct(remoteShare)}%`} hint={formatNumber(overview.remote_jobs)} />
              <StatLine
                label="Nonaktif"
                value={formatNumber(overview.inactive_jobs)}
                className="mt-2"
              />
            </div>
            <p className="mt-auto pt-4 text-[11px] leading-relaxed text-muted-foreground">
              Gaji jarang dicantumkan, dan lowongan berbayar mata uang asing tidak dikonversi.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Tipe kerja</CardTitle>
              <CardDescription>Dibaca dari judul, lokasi, dan deskripsi.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <BigStat
              size="card"
              value={pct(remoteShare)}
              unit="%"
              label="lowongan remote"
              hint={`${formatNumber(overview.remote_jobs)} dari ${formatNumber(overview.total_jobs)} lowongan`}
            />
            <BarList
              className="mt-5"
              items={overview.by_work_type.map((item) => ({
                label: WORK_TYPE_LABEL[item.name] ?? item.name,
                value: item.count,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Kota teratas</CardTitle>
              <CardDescription>Lowongan yang menyebut nama kota.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {overview.by_city.length ? (
              <BarList
                items={overview.by_city.slice(0, 7).map((item) => ({
                  label: item.name,
                  value: item.count,
                }))}
              />
            ) : (
              <Empty />
            )}
            <p className="mt-auto pt-4 text-[11px] text-muted-foreground">
              {pct(overview.city_coverage)}% lowongan menyebutkan kota; sisanya remote atau hanya
              negara.
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Kata kunci</CardTitle>
              <CardDescription>Pencarian yang menemukan lowongan.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {overview.by_keyword.length ? (
              <BarList
                items={overview.by_keyword.slice(0, 7).map((item) => ({
                  label: item.name,
                  value: item.count,
                }))}
              />
            ) : (
              <Empty />
            )}
            <p className="mt-auto pt-4 text-[11px] text-muted-foreground">
              Satu lowongan bisa muncul di beberapa kata kunci, jadi totalnya melebihi jumlah
              lowongan.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Senioritas</CardTitle>
              <CardDescription>Kriteria LinkedIn, fallback ke judul.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {overview.by_seniority.length ? (
              <BarList
                items={overview.by_seniority.map((item) => ({
                  label: SENIORITY_LABEL[item.name] ?? item.name,
                  value: item.count,
                }))}
              />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Jenis pekerjaan</CardTitle>
              <CardDescription>Penuh waktu, kontrak, magang, dan lainnya.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {overview.by_employment_type.length ? (
              <BarList
                items={overview.by_employment_type.map((item) => ({
                  label: labelEmploymentType(item.name),
                  value: item.count,
                }))}
              />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Perusahaan teratas</CardTitle>
              <CardDescription>Jumlah lowongan aktif per perusahaan.</CardDescription>
            </div>
            <CardActions>
              <IconLink href="/companies" icon={ArrowUpRight} label="Semua perusahaan" />
            </CardActions>
          </CardHeader>
          <CardContent>
            {companies.items.length ? (
              <BarList
                items={companies.items.map((item) => ({
                  label: item.company,
                  value: item.count,
                }))}
              />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-24 items-center justify-center text-[13px] text-muted-foreground">
      Belum ada data.
    </div>
  );
}
