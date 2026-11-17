import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-ink/60 " +
  "transition-colors duration-150 ease-swift disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<string, string> = {
  ghost: "border-transparent hover:bg-muted hover:text-ink",
  line: "border-line bg-surface hover:bg-muted hover:text-ink",
};

/** Small circular icon action used in card headers and the top bar. */
export function IconButton({
  icon: Icon,
  label,
  variant = "line",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(BASE, VARIANTS[variant], className)}
      {...props}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function IconLink({
  href,
  icon: Icon,
  label,
  variant = "line",
  className,
  external,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
  external?: boolean;
}) {
  const cls = cn(BASE, VARIANTS[variant], className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className={cls}>
        <Icon className="h-3.5 w-3.5" />
      </a>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label} className={cls}>
      <Icon className="h-3.5 w-3.5" />
    </Link>
  );
}
