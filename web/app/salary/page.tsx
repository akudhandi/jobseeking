import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { Card, CardActions, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconLink } from "@/components/ui/icon-button";
import { BigStat, StatLine } from "@/components/ui/stat";
import { RangeRows } from "@/components/viz/range-rows";
import { SegmentColumns } from "@/components/viz/segment-columns";
import { PageHeader } from "@/components/shell/page-header";
import { safeGet } from "@/lib/api";
import { formatNumber, formatShortIDR, SENIORITY_LABEL } from "@/lib/format";
import type { SalaryGroup, SalaryStats } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY: SalaryStats = {
  sample_size: 0,
  overall: null,
  salary_min: null,
  salary_max: null,
  distribution: [],
  by_seniority: [],
  by_city: [],
  by_keyword: [],
};

const BUCKET_ORDER = ["<5jt", "5-10jt", "10-15jt", "15-20jt", "20-30jt", ">30jt"];

const bucketLabel = (bucket: string) => bucket.replace("-", "–");
const bucketFull = (bucket: string) => {
  if (bucket.startsWith("<")) return `Di bawah Rp ${bucket.slice(1).replace("jt", "")} juta`;
  if (bucket.startsWith(">")) return `Di atas Rp ${bucket.slice(1).replace("jt", "")} juta`;
  return `Rp ${bucket.replace("jt", "").replace("-", "–")} juta`;
};

/** Groups without any salary figure cannot be plotted; they are dropped, not zeroed. */
function groups(items: SalaryGroup[]) {
  return items
    .filter((item) => item.avg_min !== null || item.avg_max !== null)
    .map((item) => ({
      label: item.name,
      min: item.avg_min ?? item.avg_max ?? 0,
      max: item.avg_max ?? item.avg_min ?? 0,
      hint: `${formatNumber(item.count)}`,
    }));
}

export default async function Page() {
  const [stats, coverage] = await Promise.all([
    safeGet<SalaryStats>("/stats/salary", EMPTY),
    safeGet<{ total_jobs: number; jobs_with_salary: number }>("/stats/overview", {
      total_jobs: 0,
      jobs_with_salary: 0,
    }),
  ]);

  const overall = stats.overall;
  const sample = stats.sample_size;
  const share = coverage.total_jobs ? (coverage.jobs_with_salary / coverage.total_jobs) * 100 : 0;
  const pct = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(share);

  const columns = BUCKET_ORDER.map((bucket) => {
    const item = stats.distribution.find((d) => d.bucket === bucket);
    return {
      label: bucketLabel(bucket),
      fullLabel: bucketFull(bucket),
      value: item?.count ?? 0,
    };
  });

  const bySeniority = groups(stats.by_seniority).map((group) => ({
    ...group,
    label: SENIORITY_LABEL[group.label] ?? group.label,
  }));
  const byCity = groups(stats.by_city).slice(0, 8);
  const cityTop = Math.max(...byCity.map((row) => row.max), 1);

  return (
    <div>
      <PageHeader
        crumb="Gaji"
        title="Gaji"
        description="Estimasi dari nominal yang dicantumkan di lowongan, diseragamkan ke rupiah per bulan. Gaji mata uang asing dan nilai di luar rentang wajar tidak dihitung."
        meta={
          <>
            <span>{formatNumber(sample)} lowongan dengan gaji</span>
            <span className="opacity-40">·</span>
            <span>
              {pct}% dari {formatNumber(coverage.total_jobs)} lowongan aktif
            </span>
          </>
        }
      />

      {sample > 0 && sample < 10 ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-card border border-sun/30 bg-sun-soft px-4 py-3 text-[13px] text-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 leading-relaxed">
            Sampel masih kecil ({formatNumber(sample)} lowongan), jadi rata-rata dan median belum
            mewakili pasar. Angka ini akan bergerak setiap kali scraping menemukan lowongan baru
            yang mencantumkan gaji.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={formatNumber(sample)}
              label="lowongan dengan nominal gaji"
              hint={`${pct}% dari seluruh lowongan aktif`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={overall ? formatShortIDR(overall.avg) : "—"}
              label="rata-rata"
              hint={overall ? "titik tengah tiap rentang gaji" : "belum ada data"}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={overall ? formatShortIDR(overall.median) : "—"}
              label="median"
              hint={overall ? "tahan terhadap nilai ekstrem" : "belum ada data"}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <div className="text-[13px] font-semibold tracking-tight text-ink">Rentang</div>
            <StatLine
              label="Terendah"
              value={overall ? formatShortIDR(overall.min) : "—"}
              hint="/bln"
            />
            <StatLine
              label="Tertinggi"
              value={overall ? formatShortIDR(overall.max) : "—"}
              hint="/bln"
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Batas bawah dan atas yang benar-benar ditawarkan lowongan, bukan turunan rata-rata.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <div>
              <CardTitle>Distribusi gaji</CardTitle>
              <CardDescription>
                Jumlah lowongan per rentang gaji bulanan, dihitung dari titik tengah rentang.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {sample ? (
              <SegmentColumns
                data={columns}
                height={248}
                seriesLabel="Lowongan"
              />
            ) : (
              <Empty />
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Lowongan yang hanya menyebut satu angka masuk ke rentangnya masing-masing; mata uang
              asing tidak dikonversi agar tidak mencampur kurs karangan.
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Cara membaca</CardTitle>
              <CardDescription>Batasan data gaji di pipeline ini.</CardDescription>
            </div>
            <CardActions>
              <IconLink href="/runs" icon={ArrowUpRight} label="Riwayat scrape" />
            </CardActions>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2.5">
            <StatLine label="Periode" value="per bulan" />
            <StatLine label="Rentang wajar" value="Rp 1jt – 150jt" />
            <StatLine label="Mata uang asing" value="tidak dihitung" />
            <StatLine label="Field kosong" value="tidak ditebak" />
            <div className="mt-auto border-t border-line pt-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Hanya {pct}% lowongan mencantumkan gaji. Angka di halaman ini menggambarkan
                kelompok kecil itu, bukan seluruh pasar.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <div>
              <CardTitle>Rata-rata per senioritas</CardTitle>
              <CardDescription>Rentang rata-rata gaji bawah–atas per level.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {bySeniority.length ? <RangeRows rows={bySeniority} /> : <Empty />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <div>
              <CardTitle>Rata-rata per kota</CardTitle>
              <CardDescription>Delapan kota dengan data gaji terbanyak.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {byCity.length ? <RangeRows rows={byCity} max={cityTop} /> : <Empty />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground">
      Belum ada data gaji.
    </div>
  );
}
