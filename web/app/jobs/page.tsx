"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import JobsLoading from "./loading";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JobDetail } from "@/components/jobs/job-detail";
import { Card, CardActions, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Input, Select } from "@/components/ui/input";
import { PillAnchor } from "@/components/ui/pill";
import { PageHeader } from "@/components/shell/page-header";
import { SkeletonRows } from "@/components/shell/skeleton";
import { API_BASE, apiGet, buildQuery } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  formatNumber,
  formatRelative,
  formatSalary,
  labelEmploymentType,
  SALARY_PERIOD_SUFFIX,
  SENIORITY_LABEL,
  WORK_TYPE_LABEL,
} from "@/lib/format";
import type { JobItem, JobsResponse, Meta } from "@/lib/types";

const PAGE_SIZE = 25;
const EMPTY: JobsResponse = { total: 0, limit: PAGE_SIZE, offset: 0, items: [] };

/** Column template shared by the header row and every job row. */
const GRID =
  "grid grid-cols-1 gap-x-4 gap-y-1.5 md:grid-cols-[minmax(0,1fr)_9rem_8.5rem_5rem] md:items-center " +
  "xl:grid-cols-[minmax(0,1fr)_12rem_9rem_8.5rem_5rem]";

export default function JobsPage() {
  /* useSearchParams needs a boundary, and the detail card is addressed by a
     ?job= query so it can be linked, bookmarked and opened from the palette.
     The route's own loading screen doubles as the fallback, so the prerendered
     HTML still shows the page skeleton instead of an empty box. */
  return (
    <Suspense fallback={<JobsLoading />}>
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobParam = searchParams.get("job");

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

  const [data, setData] = useState<JobsResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  /* The open posting: seeded from the row that was clicked for an instant paint,
     then replaced by the full record (description, requirements) from the API. */
  const [selected, setSelected] = useState<JobItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFailed, setDetailFailed] = useState(false);
  const itemsRef = useRef<JobItem[]>([]);
  itemsRef.current = data.items;

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
        .then((res) => {
          setData(res);
          setFailed(false);
        })
        .catch(() => {
          setData(EMPTY);
          setFailed(true);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, nonce]);

  useEffect(() => {
    setOffset(0);
  }, [q, city, skill, workType, seniority, keyword, hasSalary, sort]);

  /* The panel follows ?job=, so a link can point straight at one posting and the
     browser's back button closes the card. */
  useEffect(() => {
    if (!jobParam) {
      setSelected(null);
      setDetailLoading(false);
      setDetailFailed(false);
      return;
    }
    const seeded = itemsRef.current.find((item) => item.job_id === jobParam) ?? null;
    setSelected(seeded);
    setDetailLoading(true);
    setDetailFailed(false);
    let alive = true;
    apiGet<JobItem>(`/jobs/${encodeURIComponent(jobParam)}`)
      .then((job) => {
        if (!alive) return;
        setSelected(job);
        setDetailLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setDetailLoading(false);
        setDetailFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [jobParam]);

  const openJob = useCallback(
    (job: JobItem) => {
      const next = new URLSearchParams(window.location.search);
      next.set("job", job.job_id);
      router.push(`/jobs?${next.toString()}`, { scroll: false });
    },
    [router],
  );

  const closeJob = useCallback(() => {
    const next = new URLSearchParams(window.location.search);
    next.delete("job");
    const qs = next.toString();
    router.replace(qs ? `/jobs?${qs}` : "/jobs", { scroll: false });
  }, [router]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const start = data.items.length ? offset + 1 : 0;
  const end = offset + data.items.length;

  const activeFilters = [
    q.trim() ? "kata kunci" : null,
    city ? "kota" : null,
    skill ? "skill" : null,
    keyword ? "posisi" : null,
    workType ? "tipe kerja" : null,
    seniority ? "senioritas" : null,
    hasSalary ? "bergaji" : null,
  ].filter(Boolean) as string[];

  function reset() {
    setQ("");
    setCity("");
    setSkill("");
    setKeyword("");
    setWorkType("");
    setSeniority("");
    setHasSalary(false);
    setSort("recent");
  }

  const exportHref = `${API_BASE}/export.csv${buildQuery({
    q,
    city,
    keyword,
    skill: skill || undefined,
  })}`;

  return (
    <div>
      <PageHeader
        crumb="Lowongan"
        title="Lowongan"
        description="Seluruh lowongan aktif hasil scraping endpoint guest LinkedIn. Filter berlaku langsung ke API, bukan hanya ke halaman ini. Klik satu baris untuk membaca rinciannya dulu; tautan LinkedIn ada di dalam kartu itu."
        meta={
          <>
            <span className={loading || failed ? "text-muted-foreground" : "text-ink/70"}>
              {loading
                ? "Menghitung…"
                : failed
                  ? "API tidak merespons"
                  : `${formatNumber(data.total)} lowongan cocok`}
            </span>
            <span className="opacity-40">·</span>
            <span>
              Halaman {page} dari {pages}
            </span>
            {activeFilters.length ? (
              <>
                <span className="opacity-40">·</span>
                <span>{activeFilters.length} filter aktif</span>
              </>
            ) : null}
          </>
        }
        actions={
          <PillAnchor
            href={exportHref}
            download
            icon={Download}
            variant="coral"
            title="Unduh hasil dengan filter yang sedang aktif"
          >
            Ekspor CSV
          </PillAnchor>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 sm:grid-cols-3 xl:grid-cols-12">
            <Field label="Cari" className="col-span-2 sm:col-span-3 xl:col-span-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 pr-8"
                  placeholder="Judul, perusahaan, deskripsi…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q ? (
                  <button
                    type="button"
                    aria-label="Kosongkan pencarian"
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-ink"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </Field>

            <Field label="Kota" className="xl:col-span-2">
              <Select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">Semua kota</option>
                {(meta?.cities ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Skill" className="xl:col-span-2">
              <Select value={skill} onChange={(e) => setSkill(e.target.value)}>
                <option value="">Semua skill</option>
                {(meta?.skills ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Posisi" className="xl:col-span-2">
              <Select value={keyword} onChange={(e) => setKeyword(e.target.value)}>
                <option value="">Semua posisi</option>
                {(meta?.keywords ?? []).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tipe kerja" className="xl:col-span-2">
              <Select value={workType} onChange={(e) => setWorkType(e.target.value)}>
                <option value="">Semua tipe</option>
                {(meta?.work_types ?? []).map((w) => (
                  <option key={w} value={w}>
                    {WORK_TYPE_LABEL[w] ?? w}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Senioritas" className="xl:col-span-2">
              <Select value={seniority} onChange={(e) => setSeniority(e.target.value)}>
                <option value="">Semua level</option>
                {(meta?.seniorities ?? []).map((s) => (
                  <option key={s} value={s}>
                    {SENIORITY_LABEL[s] ?? s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Urutkan" className="xl:col-span-2">
              <Select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="salary">Gaji tertinggi</option>
              </Select>
            </Field>

            <div className="col-span-2 flex items-center justify-between gap-3 self-end sm:col-span-3 xl:col-span-8">
              <label className="flex cursor-pointer items-center gap-2 py-1 pr-1 text-[12px] text-ink/70">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 cursor-pointer rounded border-line accent-ink"
                  checked={hasSalary}
                  onChange={(e) => setHasSalary(e.target.checked)}
                />
                Hanya lowongan yang mencantumkan gaji
              </label>
              <button
                type="button"
                onClick={reset}
                disabled={!activeFilters.length}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-line px-2.5 py-1 text-[12px] font-medium text-ink/70 transition-colors duration-150 ease-swift hover:bg-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
              >
                <RotateCcw className="h-3 w-3" />
                Atur ulang
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn("mt-4 transition-opacity duration-200", loading && data.items.length ? "opacity-60" : "")}>
        <CardHeader className="items-center">
          <div>
            <CardTitle>Hasil</CardTitle>
            <CardDescription>
              {loading
                ? "Memuat lowongan…"
                : failed
                  ? "Permintaan ke API gagal — daftar ini kosong karena tidak ada jawaban, bukan karena tidak ada lowongan"
                  : data.items.length
                    ? `Menampilkan ${start}–${end} dari ${formatNumber(data.total)} lowongan`
                    : "Tidak ada yang cocok dengan filter ini"}
            </CardDescription>
          </div>
          <CardActions>
            <IconButton
              icon={ChevronLeft}
              label="Halaman sebelumnya"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0 || loading}
            />
            <span className="num min-w-9 text-center text-[11px] text-muted-foreground">
              {page}/{pages}
            </span>
            <IconButton
              icon={ChevronRight}
              label="Halaman berikutnya"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= data.total || loading}
            />
          </CardActions>
        </CardHeader>

        <div className="mt-4 border-t border-line">
          <div className={cn(GRID, "hidden border-b border-line px-5 py-2 md:grid")}>
            <ColumnLabel>Posisi</ColumnLabel>
            <ColumnLabel className="hidden xl:block">Skill</ColumnLabel>
            <ColumnLabel>Kota</ColumnLabel>
            <ColumnLabel className="text-right">Gaji</ColumnLabel>
            <ColumnLabel className="text-right">Tayang</ColumnLabel>
          </div>

          <ul className="divide-y divide-line">
            {data.items.map((job) => (
              <JobRow key={job.job_id} job={job} onOpen={openJob} />
            ))}
          </ul>

          {loading && !data.items.length ? <SkeletonRows rows={8} /> : null}

          {!loading && !data.items.length ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <p className="text-[13px] font-medium text-ink">
                {failed ? "API tidak merespons" : "Tidak ada lowongan yang cocok"}
              </p>
              <p className="max-w-sm text-[12px] leading-relaxed text-muted-foreground">
                {failed
                  ? "Daftar ini kosong karena permintaan gagal, bukan karena datanya kosong. Coba lagi setelah API hidup."
                  : "Longgarkan filter, atau atur ulang lalu mulai dari kata kunci yang lebih umum."}
              </p>
              {failed ? (
                <button
                  type="button"
                  onClick={() => setNonce((n) => n + 1)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink-soft"
                >
                  <RotateCcw className="h-3 w-3" />
                  Coba lagi
                </button>
              ) : null}
              {!failed && activeFilters.length ? (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-pill bg-ink px-3 py-1.5 text-[12px] font-medium text-white hover:bg-ink-soft"
                >
                  <RotateCcw className="h-3 w-3" />
                  Atur ulang filter
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      {selected ? (
        <JobDetail
          job={selected}
          loading={detailLoading}
          failed={detailFailed}
          onClose={closeJob}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
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

function JobRow({ job, onOpen }: { job: JobItem; onOpen: (job: JobItem) => void }) {
  const salary = job.has_salary ? formatSalary(job.salary_min, job.salary_max) : null;
  const place = [job.city, job.province && job.province !== job.city ? job.province : null]
    .filter(Boolean)
    .join(", ");

  return (
    <li
      className={cn(
        GRID,
        "group relative px-5 py-3.5 transition-colors duration-150 hover:bg-muted/50 focus-within:bg-muted/50",
      )}
    >
      {/* The whole row opens the detail card. The LinkedIn link lives inside that
          card, so a click on a posting never leaves the dashboard by surprise. */}
      <button
        type="button"
        onClick={() => onOpen(job)}
        aria-label={`Lihat rincian ${job.title}`}
        className="absolute inset-0 z-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink/40"
      />

      <div className="pointer-events-none min-w-0">
        <span
          className="block truncate text-[13px] font-medium text-ink underline-offset-2 group-hover:underline"
          title={job.title}
        >
          {job.title}
        </span>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate">{job.company ?? "Perusahaan tidak disebut"}</span>
          <span className="opacity-40">·</span>
          <span className="shrink-0">{labelEmploymentType(job.employment_type)}</span>
        </div>
        {/* Phones get the rest on its own line: inline separators there wrap into
            a dangling dot, so the fields are spaced instead. */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground md:hidden">
          <span>{place || "Lokasi tidak disebut"}</span>
          <span>{WORK_TYPE_LABEL[job.work_type] ?? job.work_type}</span>
          {salary ? <span className="num text-ink/75">{salary}</span> : null}
          <span>{formatRelative(job.posted_at)}</span>
        </div>
        {job.skills.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1 xl:hidden">
            {job.skills.slice(0, 4).map((s) => (
              <Badge key={s} variant="muted">
                {s}
              </Badge>
            ))}
            {job.skills.length > 4 ? <Badge variant="outline">+{job.skills.length - 4}</Badge> : null}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none hidden min-w-0 items-center gap-1 overflow-hidden xl:flex">
        {job.skills.slice(0, 2).map((s) => (
          <Badge key={s} variant="muted" className="shrink-0">
            {s}
          </Badge>
        ))}
        {job.skills.length > 2 ? (
          <Badge variant="outline" className="shrink-0">
            +{job.skills.length - 2}
          </Badge>
        ) : null}
      </div>

      <div className="pointer-events-none hidden min-w-0 md:block">
        <div className="flex items-center gap-1 truncate text-[12px] text-ink/80" title={place || undefined}>
          {job.city ? <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
          <span className="truncate">{job.city ?? "—"}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {[WORK_TYPE_LABEL[job.work_type] ?? job.work_type, job.is_jatim ? "Jatim" : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>

      <div className="pointer-events-none hidden text-right md:block">
        <span className={cn("num text-[12px]", salary ? "text-ink" : "text-muted-foreground")}>
          {salary ?? "—"}
        </span>
        {salary ? (
          <div className="text-[11px] text-muted-foreground">{SALARY_PERIOD_SUFFIX}</div>
        ) : null}
      </div>

      <div className="pointer-events-none hidden items-center justify-end gap-1.5 text-right text-[11px] text-muted-foreground md:flex">
        <span>{formatRelative(job.posted_at)}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink/25 transition-transform duration-150 ease-swift group-hover:translate-x-0.5 group-hover:text-ink/45" />
      </div>
    </li>
  );
}
