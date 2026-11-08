import * as React from "react";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "text-foreground",
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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
