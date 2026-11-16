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

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const diffMinutes = Math.round((Date.now() - d.getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return rtf.format(-diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(-diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(-diffDays, "day");
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 60) return `${Math.round(seconds)} dtk`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  return `${hours} jam ${minutes % 60} mnt`;
}

export const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Penuh waktu",
  part_time: "Paruh waktu",
  contract: "Kontrak",
  temporary: "Sementara",
  internship: "Magang",
  volunteer: "Sukarelawan",
  other: "Lainnya",
};

export function labelEmploymentType(value: string | null | undefined): string {
  if (!value) return "Tidak disebutkan";
  return EMPLOYMENT_TYPE_LABEL[value] ?? value;
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
