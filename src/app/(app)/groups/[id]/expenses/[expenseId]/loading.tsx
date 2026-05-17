import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Edit expense screen loads `getGroupDetail` + member list + splits.
 * Skeleton-nya match expense-form layout: hero amount aurora, judul,
 * tanggal+payer grid, split method picker, per-member splits list,
 * notes, save button.
 */
export default function ExpenseEditLoading() {
  return (
    <>
      <PageHeader title="Edit pengeluaran" back />
      <div className="space-y-5 px-4 py-4">
        {/* Amount hero */}
        <CardSkeleton height="180px" />

        {/* Title */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Date + payer grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        {/* Split method picker */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        {/* Per-member splits — 3 row contoh */}
        <div className="space-y-2">
          <CardSkeleton height="64px" />
          <CardSkeleton height="64px" />
          <CardSkeleton height="64px" />
        </div>

        {/* Notes + save */}
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </>
  );
}
