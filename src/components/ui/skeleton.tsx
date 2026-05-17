import { cn } from "@/lib/utils";

/**
 * Skeleton primitive — pakai `--color-muted` sebagai bg, plus subtle
 * pulse via Tailwind's `animate-pulse`. Animation di-disable lewat
 * `prefers-reduced-motion` di globals.css.
 *
 * Gen-Z guideline: "Skeleton, bukan spinner full-screen." Bentuk
 * skeleton harus match dimension card asli supaya tidak ada CLS
 * saat data masuk.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-[var(--color-muted)]",
        className
      )}
      {...props}
    />
  );
}

/** Quick card-shaped skeleton — 1px border to match real Card. */
export function CardSkeleton({
  className,
  height = "5rem",
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]",
        className
      )}
      style={{ height }}
    />
  );
}
