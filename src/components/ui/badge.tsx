import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
        secondary:
          "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
        success:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        destructive:
          "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        warning:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
