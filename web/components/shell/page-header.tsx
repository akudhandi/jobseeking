import type { ReactNode } from "react";
import { LayoutGrid } from "lucide-react";

/**
 * Breadcrumb + display title + optional meta line and right-aligned actions.
 * Every page opens with this so the shell reads the same from screen to screen.
 */
export function PageHeader({
  crumb,
  title,
  description,
  meta,
  actions,
}: {
  crumb: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <LayoutGrid className="h-3 w-3" />
        <span>Pantauan</span>
        <span className="opacity-40">/</span>
        <span className="text-ink/60">{crumb}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[32px] font-medium leading-[1.06] tracking-[-0.035em] text-ink sm:text-[44px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink/70">{description}</p>
          ) : null}
          {meta ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
