"use client";

import { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { PillAnchor } from "@/components/ui/pill";
import { Brand, MobileNav, NavPills } from "@/components/shell/nav";
import { CommandPalette } from "@/components/shell/command-palette";
import { ScrapeStatusPill } from "@/components/shell/scrape-status";

export function TopNav() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Registered once for the whole shell, so the shortcut works from any page.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="relative z-10">
      <div className="flex items-center gap-3 px-4 pt-4 sm:px-6">
        <Brand />
        <NavPills className="mx-auto hidden md:flex" />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-pill border border-white/70 bg-white/55 px-3 py-1.5 text-[13px] font-medium text-ink backdrop-blur-md transition-colors duration-150 ease-swift hover:bg-white/80 lg:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            Cari lowongan
            <kbd className="ml-1 hidden rounded-[5px] border border-line/70 bg-white/70 px-1 py-px font-sans text-[10px] leading-none text-ink/55 xl:inline">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Cari lowongan"
            title="Cari lowongan (⌘K)"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/55 text-ink/70 backdrop-blur-md transition-colors duration-150 ease-swift hover:bg-white/80 hover:text-ink lg:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <ScrapeStatusPill className="hidden md:inline-flex" />
          <PillAnchor
            href={`${API_BASE}/export.csv`}
            download
            variant="coral"
            className="hidden md:inline-flex"
            title="Unduh semua lowongan aktif sebagai CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </PillAnchor>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 px-4 sm:px-6 md:hidden">
        <MobileNav className="min-w-0 flex-1" />
        <PillAnchor
          href={`${API_BASE}/export.csv`}
          download
          variant="coral"
          title="Unduh semua lowongan aktif sebagai CSV"
          className="shrink-0 px-2.5"
        >
          <Download className="h-4 w-4" />
        </PillAnchor>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
