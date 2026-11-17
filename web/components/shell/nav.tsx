"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  History,
  LayoutDashboard,
  ListChecks,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/skills", label: "Skill", icon: BarChart3 },
  { href: "/salary", label: "Gaji", icon: Wallet },
  { href: "/companies", label: "Perusahaan", icon: Building2 },
  { href: "/jobs", label: "Lowongan", icon: ListChecks },
  { href: "/runs", label: "Riwayat", icon: History },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Brand mark: a solid ink tile with one coral corner, used instead of a logo. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-7 w-7 items-center justify-center rounded-[9px] bg-ink",
        className,
      )}
    >
      <span className="absolute right-[5px] top-[5px] h-[7px] w-[7px] rounded-[2px] bg-coral-bright" />
      <span className="absolute bottom-[5px] left-[5px] h-[7px] w-[7px] rounded-[2px] bg-white/85" />
    </span>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <BrandMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">JobSeeking</span>
    </Link>
  );
}

/** Centred pill navigation. Inactive items collapse to their icon. */
export function NavPills({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        "flex items-center gap-0.5 rounded-pill border border-white/70 bg-white/55 p-1 backdrop-blur-md",
        "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-swift",
              active
                ? "bg-surface text-ink shadow-pill"
                : "text-ink/55 hover:bg-white/70 hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className={cn(active ? "inline" : "sr-only xl:not-sr-only xl:inline")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Horizontal scrollable pills for narrow screens, where icons alone lose too much. */
export function MobileNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn("scrollbar-none fade-r flex gap-1.5 overflow-x-auto pb-1", className)}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[13px] font-medium",
              active
                ? "border-transparent bg-ink text-white"
                : "border-line bg-surface text-ink/70",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
