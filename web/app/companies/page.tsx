import { ArrowUpRight } from "lucide-react";
import { Card, CardActions, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconLink } from "@/components/ui/icon-button";
import { BigStat } from "@/components/ui/stat";
import { BarList } from "@/components/viz/bar-list";
import { RangeRows } from "@/components/viz/range-rows";
import { PageHeader } from "@/components/shell/page-header";
import { safeGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatNumber, formatSalary } from "@/lib/format";
import type { CompanyStat, Overview } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY_OVERVIEW: Overview = {
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

/** Rank, name, job count with its share, then the salary band the API can prove. */
const GRID =
  "grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_11rem] md:items-center";

const pct = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

export default async function CompaniesPage() {
  const [overview, { items }] = await Promise.all([
    safeGet<Overview>("/stats/overview", EMPTY_OVERVIEW),
    safeGet<{ items: CompanyStat[] }>("/stats/companies?limit=50", { items: [] }),
  ]);

  const totalJobs = overview.total_jobs;
  const top = items.slice(0, 10);
  const topJobs = top.reduce((sum, item) => sum + item.count, 0);
  const topShare = totalJobs ? (topJobs / totalJobs) * 100 : 0;

  const withSalary = items.filter(
    (item) => item.avg_salary_min !== null || item.avg_salary_max !== null,
  );
  const rest = Math.max(0, overview.total_companies - items.length);

  const salaryRows = withSalary.map((item) => ({
    label: item.company,
    min: item.avg_salary_min ?? item.avg_salary_max ?? 0,
    max: item.avg_salary_max ?? item.avg_salary_min ?? 0,
    hint: `${formatNumber(item.count)} lowongan`,
  }));

  return (
    <div>
      <PageHeader
        crumb="Perusahaan"
        title="Perusahaan"
        description="Instansi paling banyak membuka lowongan. Nama dinormalisasi saat parsing, sehingga PT, CV, dan Tbk yang sama digabung jadi satu baris."
        meta={
          <>
            <span>{formatNumber(overview.total_companies)} perusahaan aktif</span>
            <span className="opacity-40">·</span>
            <span>{formatNumber(totalJobs)} lowongan aktif</span>
            <span className="opacity-40">·</span>
            <span>{items.length} perusahaan diperiksa</span>
          </>
        }
        actions={
          <IconLink
            href="/jobs"
            icon={ArrowUpRight}
            label="Buka daftar lowongan"
            variant="line"
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={formatNumber(overview.total_companies)}
              label="perusahaan dengan lowongan aktif"
              hint={`dari ${formatNumber(totalJobs)} lowongan aktif`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={formatNumber(topJobs)}
              label="lowongan dari 10 perusahaan teratas"
              hint={`${pct(topShare)}% dari seluruh lowongan aktif`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={formatNumber(items[0]?.count ?? 0)}
              label={items[0] ? `lowongan dari ${items[0].company}` : "belum ada data"}
              hint={
                items[0]
                  ? `${pct(totalJobs ? ((items[0].count ?? 0) / totalJobs) * 100 : 0)}% dari seluruh lowongan`
                  : undefined
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={formatNumber(withSalary.length)}
              label="perusahaan dengan data gaji"
              hint="sisanya tidak mencantumkan nominal"
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Card className="flex flex-col lg:col-span-7">
          <CardHeader>
            <div>
              <CardTitle>Peringkat lowongan</CardTitle>
              <CardDescription>
                {top.length} perusahaan dengan lowongan aktif terbanyak.
              </CardDescription>
            </div>
            <CardActions>
              <IconLink href="/jobs" icon={ArrowUpRight} label="Filter lowongan per posisi" />
            </CardActions>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {top.length ? (
              <BarList
                items={top.map((item) => ({ label: item.company, value: item.count }))}
              />
            ) : (
              <Empty>Belum ada data perusahaan.</Empty>
            )}
            <p className="mt-auto pt-4 text-[11px] leading-relaxed text-muted-foreground">
              Satu lowongan dihitung sekali per perusahaan, sesuai nama yang sudah dinormalisasi.
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-5">
          <CardHeader>
            <div>
              <CardTitle>Rata-rata gaji per perusahaan</CardTitle>
              <CardDescription>
                Hanya perusahaan yang lowongannya mencantumkan nominal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {salaryRows.length ? (
              <RangeRows rows={salaryRows} labelWidth="10.5rem" hintAt="value" />
            ) : (
              <Empty>Belum ada perusahaan dengan data gaji.</Empty>
            )}
            <p className="mt-auto pt-4 text-[11px] leading-relaxed text-muted-foreground">
              Ini rata-rata dari batas bawah dan batas atas yang benar-benar ditulis di lowongan
              perusahaan tersebut — bukan rata-rata pasar. Baris di bawah menunjukkan angka aslinya.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Semua perusahaan</CardTitle>
            <CardDescription>
              {formatNumber(items.length)} perusahaan diperiksa
              {rest > 0 ? `, ${formatNumber(rest)} lainnya di luar daftar ini` : ""}.
            </CardDescription>
          </div>
        </CardHeader>

        <div className="mt-4 border-t border-line">
          <div className={cn(GRID, "hidden border-b border-line px-5 py-2 md:grid")}>
            <ColumnLabel>#</ColumnLabel>
            <ColumnLabel>Perusahaan</ColumnLabel>
            <ColumnLabel className="text-right">Lowongan</ColumnLabel>
            <ColumnLabel className="text-right">Rata-rata gaji</ColumnLabel>
          </div>

          <ul className="divide-y divide-line">
            {items.map((item, index) => (
              <CompanyRow
                key={item.slug}
                item={item}
                rank={index + 1}
                share={totalJobs ? (item.count / totalJobs) * 100 : 0}
              />
            ))}
          </ul>

          {!items.length ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <p className="text-[13px] font-medium text-ink">Belum ada perusahaan</p>
              <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                Perusahaan muncul di sini setelah scraping menyimpan lowongan aktif pertamanya.
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

function CompanyRow({
  item,
  rank,
  share,
}: {
  item: CompanyStat;
  rank: number;
  share: number;
}) {
  const salary = formatSalary(item.avg_salary_min, item.avg_salary_max);
  const hasSalary = item.avg_salary_min !== null || item.avg_salary_max !== null;

  return (
    <li className={cn(GRID, "px-5 py-3 transition-colors duration-150 hover:bg-muted/50")}>
      <span className="num hidden text-[12px] text-muted-foreground md:block">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-ink" title={item.company}>
          {item.company}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground md:hidden">
          <span className="num">
            {formatNumber(item.count)} lowongan · {pct(share)}%
          </span>
          {hasSalary ? <span className="num text-ink/75">{salary}</span> : null}
        </div>
      </div>

      <div className="hidden text-right md:block">
        <span className="num text-[12px] font-medium text-ink">{formatNumber(item.count)}</span>
        <div className="num text-[11px] text-muted-foreground">{pct(share)}%</div>
      </div>

      <div className="hidden text-right md:block">
        <span className={cn("num text-[12px]", hasSalary ? "text-ink" : "text-muted-foreground")}>
          {hasSalary ? salary : "—"}
        </span>
      </div>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center text-[13px] text-muted-foreground">
      {children}
    </div>
  );
}
