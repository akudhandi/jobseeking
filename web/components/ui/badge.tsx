import * as React from "react";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  default: "border-transparent bg-ink text-white",
  secondary: "border-transparent bg-muted text-ink/75",
  outline: "border-line text-ink/75",
  muted: "border-transparent bg-muted text-muted-foreground",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof styles }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-2 py-0.5 text-[11px] font-medium",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
