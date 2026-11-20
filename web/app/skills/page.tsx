import { ArrowUpRight, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardActions, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconLink } from "@/components/ui/icon-button";
import { BigStat, StatLine } from "@/components/ui/stat";
import { BarList } from "@/components/viz/bar-list";
import { PageHeader } from "@/components/shell/page-header";
import { SkillFilters } from "./filter-bar";
import { safeGet, buildQuery } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { Meta, SkillStat } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  language: "Bahasa",
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  devops: "DevOps",
  cloud: "Cloud",
  mobile: "Mobile",
  data: "Data",
  testing: "Testing",
  design: "Desain",
  soft: "Soft skill",
  other: "Lainnya",
};

const EMPTY_META: Meta = {
  cities: [],
  provinces: [],
  work_types: [],
  seniorities: [],
  employment_types: [],
  keywords: [],
  skills: [],
};

/** Rank, name, category, count — the ranking bar is drawn inside the name cell. */
const GRID = "grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-[2.5rem_minmax(0,1fr)_7.5rem_4.5rem] md:items-center";

const SHOWN = 15;

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const pick = (key: string) => {
    const value = raw[key];
    return typeof value === "string" ? value : "";
  };
  const value = { category: pick("category"), city: pick("city"), keyword: pick("keyword") };

  const [meta, { items }] = await Promise.all([
    safeGet<Meta>("/meta", EMPTY_META),
    safeGet<{ items: SkillStat[] }>(`/stats/skills${buildQuery({ limit: 40, ...value })}`, {
      items: [],
    }),
  ]);

  const categories = Array.from(new Set(meta.skills.map((skill) => skill.category))).sort();
  const top = items.slice(0, SHOWN);
  const best = top[0] ?? null;
  const common = items.filter((item) => item.count >= 10);
  const usedCategories = Array.from(new Set(items.map((item) => item.category)));

  const filterLabels = [
    value.category ? `kategori ${CATEGORY_LABEL[value.category] ?? value.category}` : null,
    value.city ? `kota ${value.city}` : null,
    value.keyword ? `posisi ${value.keyword}` : null,
  ].filter(Boolean) as string[];

  return (
    <div>
      <PageHeader
        crumb="Skill"
        title="Skill Diminta"
        description="Skill yang paling sering muncul di deskripsi lowongan. Teks bebas dicocokkan dengan kamus alias pada batas kata, jadi 'js' dan 'JavaScript' dihitung sebagai satu skill."
        meta={
          <>
            <span>{formatNumber(items.length)} skill di daftar</span>
            <span className="opacity-40">·</span>
            <span>{common.length} di antaranya muncul di ≥10 lowongan</span>
            {filterLabels.length ? (
              <>
                <span className="opacity-40">·</span>
                <span>{filterLabels.join(", ")}</span>
              </>
            ) : null}
          </>
        }
        actions={
          <IconLink href="/jobs" icon={ArrowUpRight} label="Buka daftar lowongan" variant="line" />
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <SkillFilters
            value={value}
            categories={categories.map((item) => ({
              value: item,
              label: CATEGORY_LABEL[item] ?? item,
            }))}
            cities={meta.cities}
            keywords={meta.keywords}
          />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={best ? formatNumber(best.count) : "—"}
              label={best ? `lowongan menyebut ${best.name}` : "belum ada data"}
              hint="skill peringkat pertama"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={formatNumber(items.length)}
              label="skill terdeteksi"
              hint="diambil dari 40 peringkat teratas"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={formatNumber(common.length)}
              label="skill muncul di ≥10 lowongan"
              hint="sisanya baru muncul di segelintir lowongan"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <BigStat
              size="card"
              value={formatNumber(usedCategories.length)}
              label="kategori muncul di hasil ini"
              hint={`${categories.length} kategori ada di kamus skill`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <Card className="flex flex-col lg:col-span-8">
          <CardHeader>
            <div>
              <CardTitle>{top.length ? `${top.length} skill teratas` : "Skill teratas"}</CardTitle>
              <CardDescription>
                {filterLabels.length ? "Setelah filter di atas diterapkan." : "Seluruh lowongan aktif."}
              </CardDescription>
            </div>
            <CardActions>
              <IconLink href="/jobs" icon={ArrowUpRight} label="Cari lowongan dengan skill ini" />
            </CardActions>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {top.length ? (
              <BarList items={top.map((item) => ({ label: item.name, value: item.count }))} />
            ) : (
              <Empty>Belum ada skill yang cocok dengan filter ini.</Empty>
            )}
            <p className="mt-auto pt-4 text-[11px] leading-relaxed text-muted-foreground">
              Bilah dibandingkan dengan skill peringkat pertama, bukan dengan jumlah lowongan, jadi
              yang terpenting adalah urutannya.
            </p>
          </CardContent>
        </Card>

        <Card className="flex flex-col lg:col-span-4">
          <CardHeader>
            <div>
              <CardTitle>Cara membaca</CardTitle>
              <CardDescription>Batas angka di halaman ini.</CardDescription>
            </div>
            <CardActions>
              <IconLink href="/runs" icon={ListChecks} label="Kelengkapan data" />
            </CardActions>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2.5">
            <StatLine label="Sumber" value="deskripsi lowongan" />
            <StatLine label="Pencocokan" value="kamus alias" />
            <StatLine label="Batas kata" value="aktif" />
            <StatLine label="Per lowongan" value="dihitung sekali" />
            <StatLine label="Lowongan nonaktif" value="tidak dihitung" />
            <div className="mt-auto border-t border-line pt-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Hanya skill yang namanya ada di kamus yang bisa terdeteksi. Teknologi langka yang
                belum terdaftar tidak muncul di sini walau tertulis di lowongan, jadi angka tiap skill
                adalah batas bawah, bukan jumlah sebenarnya.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Rincian skill</CardTitle>
            <CardDescription>
              {formatNumber(items.length)} skill pada urutan teratas untuk filter aktif.
            </CardDescription>
          </div>
        </CardHeader>

        <div className="mt-4 border-t border-line">
          <div className={cn(GRID, "hidden border-b border-line px-5 py-2 md:grid")}>
            <ColumnLabel>#</ColumnLabel>
            <ColumnLabel>Skill</ColumnLabel>
            <ColumnLabel>Kategori</ColumnLabel>
            <ColumnLabel className="text-right">Lowongan</ColumnLabel>
          </div>

          <ul className="divide-y divide-line">
            {items.map((item, index) => (
              <SkillRow key={item.slug} item={item} rank={index + 1} top={best?.count ?? 1} />
            ))}
          </ul>

          {!items.length ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <p className="text-[13px] font-medium text-ink">Belum ada skill terdeteksi</p>
              <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                Longgarkan filter, atau tunggu scrape berikutnya menyimpan lowongan dengan deskripsi
                yang terbaca.
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

function SkillRow({ item, rank, top }: { item: SkillStat; rank: number; top: number }) {
  return (
    <li className={cn(GRID, "px-5 py-3 transition-colors duration-150 hover:bg-muted/50")}>
      <span className="num hidden text-[12px] text-muted-foreground md:block">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink">{item.name}</div>
        <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-pill bg-muted md:hidden">
          <div
            className="h-full rounded-pill bg-ink/80"
            style={{ width: `${Math.max(2, (item.count / Math.max(1, top)) * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground md:hidden">
          <Badge variant="muted">{CATEGORY_LABEL[item.category] ?? item.category}</Badge>
          <span className="num">{formatNumber(item.count)} lowongan</span>
        </div>
      </div>

      <div className="hidden md:block">
        <Badge variant="muted">{CATEGORY_LABEL[item.category] ?? item.category}</Badge>
      </div>

      <div className="hidden text-right text-[12px] font-medium text-ink md:block">
        <span className="num">{formatNumber(item.count)}</span>
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
