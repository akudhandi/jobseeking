import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { safeGet } from "@/lib/api";
import { formatIDR, formatNumber } from "@/lib/format";
import type { CompanyStat } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const { items } = await safeGet<{ items: CompanyStat[] }>("/stats/companies?limit=50", { items: [] });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Perusahaan</h1>
        <p className="text-sm text-muted-foreground">
          Instansi paling banyak membuka lowongan (nama dinormalisasi; PT/CV/Tbk digabung).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Top {items.length} perusahaan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH className="w-12">#</TH>
                <TH>Perusahaan</TH>
                <TH className="text-right">Lowongan</TH>
                <TH className="text-right">Rata2 gaji min</TH>
                <TH className="text-right">Rata2 gaji max</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((c, i) => (
                <TR key={c.slug}>
                  <TD className="text-muted-foreground">{i + 1}</TD>
                  <TD className="font-medium">{c.company}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(c.count)}</TD>
                  <TD className="text-right tabular-nums">{formatIDR(c.avg_salary_min)}</TD>
                  <TD className="text-right tabular-nums">{formatIDR(c.avg_salary_max)}</TD>
                </TR>
              ))}
              {!items.length && (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada data.
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
