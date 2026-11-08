"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { API_BASE, apiGet, buildQuery } from "@/lib/api";
import { formatDate, formatIDR, formatNumber, SENIORITY_LABEL, WORK_TYPE_LABEL } from "@/lib/format";
import type { JobItem, JobsResponse, Meta } from "@/lib/types";

const PAGE_SIZE = 25;

export default function JobsPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [skill, setSkill] = useState("");
  const [workType, setWorkType] = useState("");
  const [seniority, setSeniority] = useState("");
  const [keyword, setKeyword] = useState("");
  const [hasSalary, setHasSalary] = useState(false);
  const [sort, setSort] = useState("recent");
  const [offset, setOffset] = useState(0);

  const [data, setData] = useState<JobsResponse>({ total: 0, limit: PAGE_SIZE, offset: 0, items: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Meta>("/meta").then(setMeta).catch(() => setMeta(null));
  }, []);

  const query = useMemo(
    () =>
      buildQuery({
        q,
        city,
        skill: skill || undefined,
        work_type: workType,
        seniority,
        keyword,
        has_salary: hasSalary ? true : undefined,
        sort,
        limit: PAGE_SIZE,
        offset,
      }),
    [q, city, skill, workType, seniority, keyword, hasSalary, sort, offset],
  );

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      apiGet<JobsResponse>(`/jobs${query}`)
        .then(setData)
        .catch(() => setData({ total: 0, limit: PAGE_SIZE, offset: 0, items: [] }))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [q, city, skill, workType, seniority, keyword, hasSalary, sort]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lowongan</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Memuat…" : `${formatNumber(data.total)} lowongan ditemukan`}
          </p>
        </div>
        <a
          href={`${API_BASE}/export.csv${buildQuery({ q, city, keyword, skill: skill || undefined })}`}
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Ekspor CSV
        </a>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
          <Input placeholder="Cari judul / deskripsi…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Semua kota</option>
            {(meta?.cities ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">Semua skill</option>
            {(meta?.skills ?? []).map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
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
          <Select value={workType} onChange={(e) => setWorkType(e.target.value)}>
            <option value="">Semua tipe kerja</option>
            {(meta?.work_types ?? []).map((w) => (
              <option key={w} value={w}>
                {WORK_TYPE_LABEL[w] ?? w}
              </option>
            ))}
          </Select>
          <Select value={seniority} onChange={(e) => setSeniority(e.target.value)}>
            <option value="">Semua senioritas</option>
            {(meta?.seniorities ?? []).map((s) => (
              <option key={s} value={s}>
                {SENIORITY_LABEL[s] ?? s}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="salary">Gaji tertinggi</option>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={hasSalary}
              onChange={(e) => setHasSalary(e.target.checked)}
            />
            Hanya yang ada gaji
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            Halaman {page} dari {pages}
          </CardTitle>
          <div className="flex gap-2">
            <button
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Sebelumnya
            </button>
            <button
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={offset + PAGE_SIZE >= data.total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Berikutnya
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Posisi</TH>
                <TH>Perusahaan</TH>
                <TH>Kota</TH>
                <TH>Tipe</TH>
                <TH>Level</TH>
                <TH>Gaji</TH>
                <TH>Skill</TH>
                <TH>Tayang</TH>
              </TR>
            </THead>
            <TBody>
              {data.items.map((job) => (
                <JobRow key={job.job_id} job={job} />
              ))}
              {!data.items.length && (
                <TR>
                  <TD colSpan={8} className="py-10 text-center text-muted-foreground">
                    {loading ? "Memuat…" : "Tidak ada lowongan cocok."}
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

function JobRow({ job }: { job: JobItem }) {
  return (
    <TR>
      <TD className="max-w-[240px]">
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {job.title}
        </a>
      </TD>
      <TD className="max-w-[180px] truncate">{job.company ?? "-"}</TD>
      <TD>{job.city ?? "-"}</TD>
      <TD className="text-xs">{WORK_TYPE_LABEL[job.work_type] ?? job.work_type}</TD>
      <TD className="text-xs">{SENIORITY_LABEL[job.seniority ?? "unknown"] ?? job.seniority ?? "-"}</TD>
      <TD className="whitespace-nowrap text-xs">
        {job.has_salary ? `${formatIDR(job.salary_min)} – ${formatIDR(job.salary_max)}` : "-"}
      </TD>
      <TD>
        <div className="flex max-w-[220px] flex-wrap gap-1">
          {job.skills.slice(0, 4).map((s) => (
            <Badge key={s} variant="muted">
              {s}
            </Badge>
          ))}
          {job.skills.length > 4 && <Badge variant="outline">+{job.skills.length - 4}</Badge>}
        </div>
      </TD>
      <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(job.posted_at)}</TD>
    </TR>
  );
}
