"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, back, right, className }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-20 glass border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-2",
        className
      )}
    >
      {back && (
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="rounded-full p-2 -ml-2 hover:bg-[var(--color-muted)]"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[var(--color-muted-foreground)] truncate">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </header>
  );
}
