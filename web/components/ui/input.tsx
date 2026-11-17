import * as React from "react";
import { cn } from "@/lib/utils";

const FIELD =
  "flex h-9 w-full rounded-xl border border-line bg-surface px-3 py-1 text-[13px] text-ink " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 " +
  "focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD, "cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}
