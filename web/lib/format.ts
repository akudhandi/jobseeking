export function formatIDR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatShortIDR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}jt`;
  return formatIDR(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

export const WORK_TYPE_LABEL: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
  unknown: "Tidak diketahui",
};

export const SENIORITY_LABEL: Record<string, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  unknown: "Tidak diketahui",
};
