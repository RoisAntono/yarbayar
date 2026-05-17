import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function PersonalLoading() {
  return (
    <>
      <PageHeader title="Catatan keuangan" />
      <div className="space-y-5 px-4 py-4">
        {/* Cashflow hero (aurora) */}
        <CardSkeleton height="220px" />

        {/* Two-button grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>

        {/* List heading + 5 rows */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          {[0, 1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} height="68px" />
          ))}
        </div>
      </div>
    </>
  );
}
