import type { Metadata } from "next";
import "./globals.css";
import { MobileNav, Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "JobSeeking — Analitik Lowongan Jawa Timur",
  description: "Dashboard analitik lowongan kerja developer di Jawa Timur (sumber: LinkedIn)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-muted/30">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav />
            <main className="mx-auto w-full max-w-7xl flex-1 p-5 md:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
