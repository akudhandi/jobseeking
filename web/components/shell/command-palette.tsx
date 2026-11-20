"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NAV } from "@/components/shell/nav";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type { JobItem, JobsResponse } from "@/lib/types";

type PaletteItem =
  | { kind: "page"; href: string; label: string; Icon: LucideIcon }
  | { kind: "job"; job: JobItem };

const MAX_JOBS = 6;
const MIN_QUERY = 2;

/**
 * ⌘K palette. Two things are worth searching from anywhere: the pages of the
 * dashboard, and the job list itself. Both answer from the same box, so the
 * keyboard shortcut never dead-ends on a page you did not mean.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    onClose();
    setQuery("");
    setJobs([]);
    setFailed(false);
    setBusy(false);
    setActive(0);
  }, [onClose]);

  /* The palette is mounted once and toggled, so the page list is always ready;
     only the job search talks to the API. */
  const pages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return NAV.filter((item) => !needle || item.label.toLowerCase().includes(needle)).map(
      (item) => ({ kind: "page" as const, href: item.href, label: item.label, Icon: item.icon }),
    );
  }, [query]);

  const items: PaletteItem[] = useMemo(
    () => [...pages, ...jobs.map((job) => ({ kind: "job" as const, job }))],
    [pages, jobs],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setJobs([]);
      setBusy(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    setBusy(true);
    setFailed(false);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/jobs?q=${encodeURIComponent(trimmed)}&limit=${MAX_JOBS}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as JobsResponse;
        setJobs(data.items);
      } catch {
        if (!controller.signal.aborted) {
          setJobs([]);
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => setActive(0), [query]);

  const choose = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      if (item.kind === "page") {
        close();
        router.push(item.href);
        return;
      }
      close();
      window.open(item.job.url, "_blank", "noreferrer");
    },
    [close, router],
  );

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center px-4 pt-[10vh]">
      <button
        type="button"
        aria-label="Tutup pencarian"
        onClick={close}
        className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cari lowongan dan halaman"
        className="relative h-fit w-full max-w-[640px] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_70px_-24px_rgba(11,11,13,0.45)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => (items.length ? (index + 1) % items.length : 0));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) =>
                  items.length ? (index - 1 + items.length) % items.length : 0,
                );
              } else if (event.key === "Enter") {
                event.preventDefault();
                choose(items[active]);
              }
            }}
            placeholder="Cari judul lowongan, perusahaan, atau halaman…"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none"
          />
          {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : null}
        </div>

        <ul ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {items.length ? (
            items.map((item, index) => (
              <li key={item.kind === "page" ? item.href : item.job.job_id} data-index={index}>
                <button
                  type="button"
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100",
                    index === active ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  {item.kind === "page" ? (
                    <>
                      <item.Icon className="h-4 w-4 shrink-0 text-ink/60" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                        {item.label}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">Halaman</span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        <ArrowUpRight className="h-3.5 w-3.5 text-ink/45" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {item.job.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="truncate">{item.job.company ?? "Perusahaan tidak disebut"}</span>
                          {item.job.city ? (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="shrink-0">{item.job.city}</span>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelative(item.job.posted_at)}
                      </span>
                    </>
                  )}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-[12px] leading-relaxed text-muted-foreground">
              {failed
                ? "API tidak merespons, jadi lowongan tidak bisa dicari. Halaman di atas tetap bisa dibuka."
                : query.trim().length < MIN_QUERY
                  ? "Ketik minimal dua huruf untuk mencari lowongan."
                  : busy
                    ? "Mencari…"
                    : "Tidak ada yang cocok."}
            </li>
          )}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Key>↑</Key>
              <Key>↓</Key>
              navigasi
            </span>
            <span className="flex items-center gap-1">
              <Key>↵</Key>
              buka
            </span>
            <span className="flex items-center gap-1">
              <Key>esc</Key>
              tutup
            </span>
          </span>
          <span className="hidden sm:inline">Hasil lowongan dari API</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-line bg-muted px-1 font-sans text-[10px] leading-none text-ink/70">
      {children}
    </kbd>
  );
}
