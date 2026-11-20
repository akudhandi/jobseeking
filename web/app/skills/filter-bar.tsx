"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SkillFilterValue {
  category: string;
  city: string;
  keyword: string;
}

/**
 * The filters live in the URL, not in component state, so a filtered ranking can
 * be shared or reloaded as-is. Every change is a navigation; the server renders
 * the new numbers.
 */
export function SkillFilters({
  value,
  categories,
  cities,
  keywords,
}: {
  value: SkillFilterValue;
  categories: { value: string; label: string }[];
  cities: string[];
  keywords: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = Object.values(value).some(Boolean);

  function go(next: Partial<SkillFilterValue>) {
    const merged = { ...value, ...next };
    const params = new URLSearchParams();
    for (const [key, item] of Object.entries(merged)) {
      if (item) params.set(key, item);
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `/skills?${query}` : "/skills"));
  }

  return (
    <div className={cn("transition-opacity duration-200", pending && "opacity-60")}>
      <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-3">
        <Field label="Kategori">
          <Select value={value.category} onChange={(e) => go({ category: e.target.value })}>
            <option value="">Semua kategori</option>
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Kota">
          <Select value={value.city} onChange={(e) => go({ city: e.target.value })}>
            <option value="">Semua kota</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Posisi">
          <Select value={value.keyword} onChange={(e) => go({ keyword: e.target.value })}>
            <option value="">Semua posisi</option>
            {keywords.map((keyword) => (
              <option key={keyword} value={keyword}>
                {keyword}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <p className="text-[12px] text-ink/70">
          {active
            ? "Filter ikut ke URL, jadi tautan ini bisa dibuka ulang apa adanya."
            : "Tanpa filter: seluruh lowongan aktif ikut dihitung."}
        </p>
        <button
          type="button"
          onClick={() => go({ category: "", city: "", keyword: "" })}
          disabled={!active}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-line px-2.5 py-1 text-[12px] font-medium text-ink/70 transition-colors duration-150 ease-swift hover:bg-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" />
          Atur ulang
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
