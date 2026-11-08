"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalaryRangeBars, VerticalBars } from "@/components/charts";
import { KpiCard } from "@/components/kpi";
import { apiGet } from "@/lib/api";
import { formatIDR, formatNumber } from "@/lib/format";
import { SENIORITY_LABEL } from "@/lib/format";
import type { SalaryStats } from "@/lib/types";

export default function SalaryPage() {
  const [stats, setStats] = useState<SalaryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<SalaryStats>("/stats/salary")
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const overall = stats?.overall ?? null;
  const distribution = (stats?.distribution ?? []).map((d) => ({ name: d.bucket, count: d.count }));
  const bySeniority = (stats?.by_seniority ?? [])
    .filter((g) => g.avg_min !== null || g.avg_max !== null)
    .map((g) => ({
      name: SENIORITY_LABEL[g.name] ?? g.name,
      min: g.avg_min ?? g.avg_max ?? 0,
      max: g.avg_max ?? g.avg_min ?? 0,
    }));
  const byCity = (stats?.by_city ?? [])
    .filter((g) => g.avg_min !== null || g.avg_max !== null)
    .slice(0, 10)
    .map((g) => ({ name: g.name, min: g.avg_min ?? g.avg_max ?? 0, max: g.avg_max ?? g.avg_min ?? 0 }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Gaji</h1>
        <p className="text-sm text-muted-foreground">
          Estimasi dari nominal yang dicantumkan di lowongan. Nilai kosong = lowongan tidak
          mencantumkan gaji.
        </p>
      </header>

      {stats && stats.sample_size < 10 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Data gaji terbatas (sampel {formatNumber(stats.sample_size)}). Angka kurang representatif
          sampai lebih banyak lowongan terkumpul.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Sampel gaji" value={loading ? "…" : formatNumber(stats?.sample_size ?? 0)} />
        <KpiCard label="Rata-rata" value={overall ? formatIDR(overall.avg) : "-"} hint="per bulan" />
        <KpiCard label="Median" value={overall ? formatIDR(overall.median) : "-"} hint="per bulan" />
        <KpiCard
          label="Rentang"
          value={overall ? `${formatIDR(overall.min)} – ${formatIDR(overall.max)}` : "-"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribusi gaji (per bulan)</CardTitle>
        </CardHeader>
        <CardContent>{distribution.length ? <VerticalBars data={distribution} /> : <Empty loading={loading} />}</CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rata-rata per senioritas</CardTitle>
          </CardHeader>
          <CardContent>
            {bySeniority.length ? <SalaryRangeBars data={bySeniority} /> : <Empty loading={loading} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rata-rata per kota</CardTitle>
          </CardHeader>
          <CardContent>{byCity.length ? <SalaryRangeBars data={byCity} /> : <Empty loading={loading} />}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      {loading ? "Memuat…" : "Belum ada data gaji."}
    </div>
  );
}
