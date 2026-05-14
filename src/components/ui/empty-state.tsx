import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 py-12 px-6",
        className
      )}
    >
      {icon && (
        <div className="size-16 rounded-2xl grid place-items-center bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
