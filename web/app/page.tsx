import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Donut, HorizontalBars, TrendLine, VerticalBars } from "@/components/charts";
import { KpiCard } from "@/components/kpi";
import { safeGet } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { WORK_TYPE_LABEL } from "@/lib/format";
import type { Overview, TrendItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY: Overview = {
  total_jobs: 0,
  total_companies: 0,
  jobs_with_salary: 0,
  salary_coverage: 0,
  jatim_jobs: 0,
  remote_jobs: 0,
  last_scraped_at: null,
  by_city: [],
  by_work_type: [],
  by_seniority: [],
  by_keyword: [],
  by_employment_type: [],
};

export default async function Page() {
  const [overview, trend] = await Promise.all([
    safeGet<Overview>("/stats/overview", EMPTY),
    safeGet<{ items: TrendItem[] }>("/stats/trend", { items: [] }),
  ]);

  const cityData = overview.by_city.slice(0, 10);
  const workData = overview.by_work_type.map((w) => ({
    name: WORK_TYPE_LABEL[w.name] ?? w.name,
    count: w.count,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ringkasan</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan pasar lowongan developer di Jawa Timur berdasarkan data hasil scraping.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total lowongan" value={formatNumber(overview.total_jobs)} />
        <KpiCard label="Perusahaan" value={formatNumber(overview.total_companies)} />
        <KpiCard
          label="Coverage gaji"
          value={`${overview.salary_coverage}%`}
          hint={`${formatNumber(overview.jobs_with_salary)} lowongan mencantumkan gaji`}
        />
        <KpiCard label="Jawa Timur" value={formatNumber(overview.jatim_jobs)} />
        <KpiCard label="Remote" value={formatNumber(overview.remote_jobs)} />
        <KpiCard label="Pencarian" value="5 posisi" hint="web/software/frontend/backend/fullstack" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lowongan per kota</CardTitle>
          </CardHeader>
          <CardContent>
            {cityData.length ? (
              <HorizontalBars data={cityData.map((c) => ({ name: c.name, count: c.count }))} />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipe kerja</CardTitle>
          </CardHeader>
          <CardContent>{workData.length ? <Donut data={workData} /> : <Empty />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Level senioritas</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.by_seniority.length ? (
              <VerticalBars
                data={overview.by_seniority.map((s) => ({ name: s.name, count: s.count }))}
              />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lowongan per kata kunci</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.by_keyword.length ? (
              <VerticalBars
                data={overview.by_keyword.map((k) => ({ name: k.name, count: k.count }))}
              />
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren waktu tayang (per bulan)</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.items.length ? <TrendLine data={trend.items} /> : <Empty />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      Belum ada data.
    </div>
  );
}
