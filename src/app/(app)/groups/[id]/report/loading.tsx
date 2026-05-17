import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Match layout di `report/page.tsx`:
 *   1. Hero aurora total trip (~190px karena ada 2 stat chip + date span)
 *   2. List "Pengeluaran per orang" — 3 row contoh, masing-masing
 *      ~150px (avatar+pill, 2 stat columns, progress bar)
 *   3. Breakdown kategori collapsed (~70px summary card)
 *   4. Sisa utang section (~100px)
 *
 * Header pakai PageHeader langsung — title hardcoded "Laporan trip"
 * supaya tab title konsisten saat loading.
 */
export default function GroupReportLoading() {
  return (
    <>
      <PageHeader title="Laporan trip" back />
      <div className="space-y-5 px-4 py-4">
        <CardSkeleton height="190px" />

        <div className="space-y-2">
          <Skeleton className="h-3 w-44" />
          <CardSkeleton height="150px" />
          <CardSkeleton height="150px" />
          <CardSkeleton height="150px" />
        </div>

        <CardSkeleton height="70px" />

        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <CardSkeleton height="100px" />
        </div>
      </div>
    </>
  );
}
