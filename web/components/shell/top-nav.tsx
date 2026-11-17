"use client";

import { Download, Search } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { PillAnchor, PillLink } from "@/components/ui/pill";
import { Brand, MobileNav, NavPills } from "@/components/shell/nav";
import { ScrapeStatusPill } from "@/components/shell/scrape-status";

export function TopNav() {
  return (
    <header className="relative z-10">
      <div className="flex items-center gap-3 px-4 pt-4 sm:px-6">
        <Brand />
        <NavPills className="mx-auto hidden md:flex" />
        <div className="ml-auto flex items-center gap-2">
          <PillLink href="/jobs" icon={Search} variant="glass" className="hidden sm:inline-flex">
            Cari lowongan
          </PillLink>
          <ScrapeStatusPill className="hidden md:inline-flex" />
          <PillAnchor
            href={`${API_BASE}/export.csv`}
            download
            variant="coral"
            className="hidden sm:inline-flex"
            title="Unduh semua lowongan aktif sebagai CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </PillAnchor>
        </div>
      </div>
      <div className="mt-3 px-4 sm:px-6">
        <MobileNav />
      </div>
    </header>
  );
}
