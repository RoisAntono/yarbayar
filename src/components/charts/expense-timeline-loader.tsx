"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

/**
 * Recharts is ~90KB gzipped. We don't need it on first paint of the
 * group detail page — only when the chart actually renders. Pulling it
 * via `next/dynamic` with ssr=false moves it to a separate chunk that
 * only downloads once the user reaches a route that needs it, and
 * loads in parallel with the rest of the page.
 *
 * The skeleton occupies the same height as the real chart (~280px) so
 * the layout doesn't jump when the chunk arrives.
 */
export const ExpenseTimeline = dynamic(
  () =>
    import("./expense-timeline").then((m) => ({ default: m.ExpenseTimeline })),
  {
    ssr: false,
    loading: () => <ExpenseTimelineSkeleton />,
  }
);

function ExpenseTimelineSkeleton() {
  return (
    <section className="space-y-3" aria-busy="true">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            <Sparkles className="size-3.5" />
            Memuat grafik…
          </p>
          <div className="mt-1 h-7 w-32 rounded-md bg-[var(--color-muted)]" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-[var(--color-muted)]" />
      </div>
      <div className="h-[180px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]" />
    </section>
  );
}
