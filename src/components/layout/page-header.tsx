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
  /**
   * When true, the header has no background — title sits flush on the
   * page background. Useful for hero pages where the next section is
   * already visually heavy (e.g. dashboard hero card).
   */
  transparent?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  back,
  right,
  className,
  transparent,
}: PageHeaderProps) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-2 px-4 py-3",
        transparent
          ? "bg-transparent"
          : "glass border-b border-[var(--color-border)]",
        className
      )}
    >
      {back && (
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="-ml-2 grid size-10 place-items-center rounded-full transition-colors hover:bg-[var(--color-muted)] active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </header>
  );
}
