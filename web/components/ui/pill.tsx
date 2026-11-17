import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "plain" | "glass" | "coral" | "ink";

const VARIANTS: Record<Variant, string> = {
  plain: "border-line bg-surface text-ink hover:bg-muted",
  glass: "border-white/70 bg-white/55 text-ink backdrop-blur-md hover:bg-white/80",
  coral: "border-transparent bg-coral text-white hover:bg-coral-bright",
  ink: "border-transparent bg-ink text-white hover:bg-ink-soft",
};

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border px-3 py-1.5 " +
  "text-[13px] font-medium transition-colors duration-150 ease-swift";

export function Pill({
  className,
  variant = "plain",
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span className={cn(BASE, VARIANTS[variant], className)} {...props}>
      {children}
    </span>
  );
}

/** Same look as PillLink but for URLs the browser must handle itself (downloads). */
export function PillAnchor({
  href,
  icon: Icon,
  variant = "plain",
  className,
  download,
  title,
  children,
}: {
  href: string;
  icon?: LucideIcon;
  variant?: Variant;
  className?: string;
  download?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      download={download}
      title={title}
      className={cn(BASE, VARIANTS[variant], className)}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </a>
  );
}

export function PillLink({
  href,
  icon: Icon,
  variant = "plain",
  className,
  external,
  children,
}: {
  href: string;
  icon?: LucideIcon;
  variant?: Variant;
  className?: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls = cn(BASE, VARIANTS[variant], className);
  const inner = (
    <>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
