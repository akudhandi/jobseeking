"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, LayoutDashboard, ListChecks, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/skills", label: "Skill", icon: BarChart3 },
  { href: "/salary", label: "Gaji", icon: Wallet },
  { href: "/companies", label: "Perusahaan", icon: Building2 },
  { href: "/jobs", label: "Lowongan", icon: ListChecks },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <span className="text-lg font-semibold tracking-tight">JobSeeking</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">Data lowongan Jawa Timur</div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto border-b bg-card px-3 py-2 md:hidden">
      {NAV.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
              active ? "bg-secondary" : "text-muted-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
