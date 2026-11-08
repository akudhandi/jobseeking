"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalBars } from "@/components/charts";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import type { Meta, SkillStat } from "@/lib/types";

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

export default function SkillsPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [skills, setSkills] = useState<SkillStat[]>([]);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Meta>("/meta").then(setMeta).catch(() => setMeta(null));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "40" });
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (keyword) params.set("keyword", keyword);
    setLoading(true);
    apiGet<{ items: SkillStat[] }>(`/stats/skills?${params.toString()}`)
      .then((r) => setSkills(r.items))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, [category, city, keyword]);

  const categories = useMemo(() => {
    const set = new Set((meta?.skills ?? []).map((s) => s.category));
    return Array.from(set).sort();
  }, [meta]);

  const chartData = skills.slice(0, 15).map((s) => ({ name: s.name, count: s.count }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Skill yang diminta</h1>
        <p className="text-sm text-muted-foreground">
          Skill paling sering muncul di deskripsi lowongan, dihitung dari teks requirement.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c] ?? c}
            </option>
          ))}
        </Select>
        <Select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Semua kota</option>
          {(meta?.cities ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={keyword} onChange={(e) => setKeyword(e.target.value)}>
          <option value="">Semua posisi</option>
          {(meta?.keywords ?? []).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>15 skill teratas</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length ? (
            <HorizontalBars data={chartData} height={Math.max(320, chartData.length * 26)} />
          ) : (
            <Empty loading={loading} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rincian skill</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Skill</TH>
                <TH>Kategori</TH>
                <TH className="text-right">Jumlah lowongan</TH>
              </TR>
            </THead>
            <TBody>
              {skills.map((s) => (
                <TR key={s.slug}>
                  <TD className="font-medium">{s.name}</TD>
                  <TD>
                    <Badge variant="secondary">{CATEGORY_LABEL[s.category] ?? s.category}</Badge>
                  </TD>
                  <TD className="text-right tabular-nums">{s.count}</TD>
                </TR>
              ))}
              {!skills.length && (
                <TR>
                  <TD colSpan={3} className="py-8 text-center text-muted-foreground">
                    {loading ? "Memuat…" : "Belum ada data."}
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

function Empty({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      {loading ? "Memuat…" : "Belum ada data."}
    </div>
  );
}
