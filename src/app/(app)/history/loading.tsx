import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function HistoryLoading() {
  return (
    <>
      <PageHeader title="Riwayat" />
      <div className="space-y-6 px-4 py-4">
        {/* Two breakdown chips */}
        <div className="flex gap-2">
          <Skeleton className="h-16 flex-1 rounded-2xl" />
          <Skeleton className="h-16 flex-1 rounded-2xl" />
        </div>

        {/* Calendar toolbar */}
        <CardSkeleton height="60px" />

        {/* Day header + list */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          {[0, 1, 2].map((i) => (
            <CardSkeleton key={i} height="68px" />
          ))}
        </div>
      </div>
    </>
  );
}
