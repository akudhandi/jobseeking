"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, Copy, ExternalLink, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PillAnchor } from "@/components/ui/pill";
import { Skeleton } from "@/components/shell/skeleton";
import { cn } from "@/lib/utils";
import { cleanRequirements, limitBlocks, parseDescription } from "@/lib/description";
import type { DescBlock } from "@/lib/description";
import {
  formatDate,
  formatRelative,
  formatSalary,
  labelEmploymentType,
  SALARY_PERIOD_SUFFIX,
  SENIORITY_LABEL,
  WORK_TYPE_LABEL,
} from "@/lib/format";
import type { JobItem } from "@/lib/types";

/** Requirement lists run to 20+ lines; the first few are enough to judge a posting. */
const REQ_VISIBLE = 8;

/**
 * Detail card for one posting. It opens from the Lowongan list so a click never
 * throws the reader straight at LinkedIn: everything already in the database
 * (skills, requirements, description, salary) is shown first, and the external
 * link becomes a deliberate step at the bottom.
 */
export function JobDetail({
  job,
  loading,
  failed,
  onClose,
}: {
  job: JobItem;
  loading: boolean;
  failed: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [allRequirements, setAllRequirements] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => parseDescription(job.description), [job.description]);
  const preview = useMemo(() => limitBlocks(blocks, 1400), [blocks]);
  const requirements = useMemo(
    () => cleanRequirements(job.requirements, job.description),
    [job.requirements, job.description],
  );

  useEffect(() => setMounted(true), []);

  /* A new posting in the same panel: reset the per-job bits. */
  useEffect(() => {
    setExpanded(false);
    setAllRequirements(false);
    setCopied(false);
  }, [job.job_id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(job.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (!mounted) return null;

  const salary = job.has_salary ? formatSalary(job.salary_min, job.salary_max) : null;
  const place = [job.city, job.province && job.province !== job.city ? job.province : null]
    .filter(Boolean)
    .join(", ");
  const shownBlocks = expanded ? blocks : preview.blocks;
  const longDescription = preview.truncated || blocks.length > preview.blocks.length;
  const shownRequirements = allRequirements ? requirements : requirements.slice(0, REQ_VISIBLE);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch">
      <button
        type="button"
        aria-label="Tutup rincian lowongan"
        onClick={onClose}
        className="absolute inset-0 animate-in bg-ink/25 backdrop-blur-[2px] duration-200 fade-in"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-title"
        className="relative z-10 flex max-h-[92vh] w-full animate-in flex-col overflow-hidden rounded-t-shell border border-line bg-surface shadow-pop outline-none duration-200 fade-in slide-in-from-bottom-6 sm:h-full sm:max-h-none sm:max-w-[620px] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:slide-in-from-bottom-0 sm:slide-in-from-right-8"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="muted">{labelEmploymentType(job.employment_type)}</Badge>
              <Badge variant="outline">{WORK_TYPE_LABEL[job.work_type] ?? job.work_type}</Badge>
              {job.seniority ? (
                <Badge variant="outline">{SENIORITY_LABEL[job.seniority] ?? job.seniority}</Badge>
              ) : null}
              {job.is_jatim ? <Badge variant="secondary">Jawa Timur</Badge> : null}
            </div>
            <h2
              id="job-detail-title"
              className="mt-2 text-[17px] font-semibold leading-snug tracking-tight text-ink"
            >
              {job.title}
            </h2>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{job.company ?? "Perusahaan tidak disebut"}</span>
              {job.company_slug ? (
                <span className="hidden shrink-0 opacity-40 sm:inline">· {job.company_slug}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink/60 transition-colors duration-150 ease-swift hover:bg-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Fact
              label="Gaji"
              value={
                salary ? (
                  <span className="num text-[13px] text-ink">
                    {salary}
                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                      {SALARY_PERIOD_SUFFIX}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Tidak dicantumkan</span>
                )
              }
            />
            <Fact
              label="Kota"
              value={
                place ? (
                  <span className="flex min-w-0 items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate" title={job.location_raw ?? undefined}>
                      {place}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {job.location_raw ?? "Tidak disebut"}
                  </span>
                )
              }
            />
            <Fact
              label="Tayang"
              value={
                <span>
                  {formatDate(job.posted_at)}
                  <span className="ml-1.5 text-[11px] text-muted-foreground">
                    ({formatRelative(job.posted_at)})
                  </span>
                </span>
              }
            />
            <Fact
              label="Terakhir discrape"
              value={formatRelative(job.scraped_at)}
            />
            {job.min_years_experience !== null && job.min_years_experience !== undefined ? (
              <Fact
                label="Pengalaman"
                value={`minimal ${job.min_years_experience} tahun`}
              />
            ) : null}
            <Fact
              label="Status"
              value={
                job.is_active ? (
                  <span className="text-ink">
                    Aktif{job.missed_runs ? ` (${job.missed_runs}× tidak muncul)` : ""}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sudah tidak aktif</span>
                )
              }
            />
            {job.salary_source ? (
              <Fact label="Sumber gaji" value={<span className="break-words">{job.salary_source}</span>} />
            ) : null}
            <Fact label="Sumber data" value={`LinkedIn guest (${job.source})`} />
          </div>

          {job.skills.length ? (
            <Section title={`Skill terdeteksi (${job.skills.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="muted">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Section>
          ) : null}

          {loading ? (
            <Section title="Rincian lengkap">
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[92%]" />
                <Skeleton className="h-3 w-[78%]" />
                <Skeleton className="h-3 w-[85%]" />
                <Skeleton className="h-3 w-[40%]" />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Mengambil deskripsi dari API…
              </p>
            </Section>
          ) : (
            <>
              {requirements.length ? (
                <Section title={`Kualifikasi (${requirements.length})`}>
                  <ol className="space-y-1.5">
                    {shownRequirements.map((item, index) => (
                      <li key={index} className="flex gap-2.5 text-[12px] leading-relaxed text-ink/85">
                        <span className="num w-4 shrink-0 text-right text-[11px] leading-[18px] text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="min-w-0 break-words">{item}</span>
                      </li>
                    ))}
                  </ol>
                  {requirements.length > REQ_VISIBLE ? (
                    <button
                      type="button"
                      onClick={() => setAllRequirements((value) => !value)}
                      className="mt-2 text-[11px] font-medium text-ink underline underline-offset-2 hover:text-ink-soft"
                    >
                      {allRequirements
                        ? "Ringkas kembali"
                        : `Tampilkan ${requirements.length - REQ_VISIBLE} kualifikasi lainnya`}
                    </button>
                  ) : null}
                </Section>
              ) : null}

              <Section title="Deskripsi">
                {shownBlocks.length ? (
                  <>
                    <Description blocks={shownBlocks} />
                    {longDescription ? (
                      <button
                        type="button"
                        onClick={() => setExpanded((value) => !value)}
                        className="mt-2.5 text-[11px] font-medium text-ink underline underline-offset-2 hover:text-ink-soft"
                      >
                        {expanded ? "Ringkas kembali" : "Tampilkan seluruh deskripsi"}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {failed
                      ? "Rincian lengkap tidak bisa diambil: permintaan ke API gagal. Data di atas berasal dari daftar, bukan dari detail."
                      : "Deskripsi tidak tersimpan untuk lowongan ini. Deskripsi hanya ikut tersimpan kalau halaman LinkedIn menyertakannya saat discrape."}
                  </p>
                )}
              </Section>
            </>
          )}

          {job.keywords.length ? (
            <Section title="Ditemukan dari pencarian">
              <div className="flex flex-wrap gap-1.5">
                {job.keywords.map((keyword) => (
                  <Badge key={keyword} variant="outline">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3.5">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-[13px] font-medium text-ink/75 transition-colors duration-150 ease-swift hover:bg-muted hover:text-ink"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Tersalin" : "Salin tautan"}
          </button>
          <PillAnchor
            href={job.url}
            icon={ExternalLink}
            variant="coral"
            className="flex-1 justify-center sm:flex-none"
            title="Buka halaman lowongan aslinya di LinkedIn"
          >
            Buka di LinkedIn
          </PillAnchor>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** The parsed posting body: headings, prose, bullet lists and short field pairs. */
function Description({ blocks }: { blocks: DescBlock[] }) {
  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          // A heading straight after another is a sub-heading ("Application
          // development" under "What will my day-to-day look like?").
          const sub = blocks[index - 1]?.kind === "heading";
          return (
            <h4
              key={index}
              className={cn(
                "break-words pt-1.5 tracking-tight text-ink first:pt-0",
                sub ? "text-[12px] font-medium" : "text-[12px] font-semibold",
              )}
            >
              {block.text}
            </h4>
          );
        }

        if (block.kind === "bullets") {
          return (
            <ul key={index} className="space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2.5 text-[12px] leading-relaxed text-ink/85">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/35" />
                  <span className="min-w-0 break-words">{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "fields") {
          return (
            <dl key={index} className="space-y-1.5 rounded-xl bg-muted/60 px-3 py-2.5">
              {block.pairs.map((pair, pairIndex) => (
                <div key={pairIndex} className="flex gap-3 text-[12px] leading-relaxed">
                  <dt className="w-24 shrink-0 text-muted-foreground">{pair.label}</dt>
                  <dd className="min-w-0 break-words text-ink/85">{pair.value}</dd>
                </div>
              ))}
            </dl>
          );
        }

        return (
          <p key={index} className="break-words text-[12px] leading-relaxed text-ink/85">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

function Fact({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex min-w-0 items-center text-[12px] text-ink/85">{value}</div>
    </div>
  );
}
