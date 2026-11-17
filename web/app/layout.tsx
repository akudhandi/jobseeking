import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Aurora } from "@/components/shell/aurora";
import { TopNav } from "@/components/shell/top-nav";

/* Self-hosted so the Docker build never depends on fetching a font at build
   time; the file is the latin subset of Instrument Sans (OFL, see fonts/OFL.txt). */
const sans = localFont({
  src: [{ path: "./fonts/InstrumentSans-latin.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial"],
});

export const metadata: Metadata = {
  title: "JobSeeking — Analitik Lowongan Jawa Timur",
  description: "Dashboard analitik lowongan kerja developer di Jawa Timur (sumber: LinkedIn)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={sans.variable}>
      <body className="bg-canvas font-sans antialiased">
        <div className="mx-auto w-full max-w-[1560px] p-2 sm:p-3 lg:p-5">
          <div className="relative min-h-[calc(100vh-1rem)] overflow-hidden rounded-shell bg-surface ring-1 ring-line sm:min-h-[calc(100vh-1.5rem)] lg:min-h-[calc(100vh-2.5rem)]">
            <Aurora />
            <TopNav />
            <main className="relative z-10 mx-auto w-full max-w-[1280px] px-4 pb-20 pt-6 sm:px-6 md:px-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
