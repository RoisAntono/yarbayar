import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton untuk Beranda. Match layout di `page.tsx`:
 *   1. Greeting row (kiri name, kanan avatar)
 *   2. Hero saldo bersih (aurora card, ~220px)
 *   3. Cashflow card (~140px)
 *   4. Quick actions grid 2 kolom
 *   5. Header "Grup kamu" + 3 group rows
 *
 * Tujuan: zero CLS — user lihat shape persis sama dengan halaman
 * sungguhan yang lagi loading.
 */
export default function HomeLoading() {
  return (
    <div className="space-y-6 px-4 pt-4 pb-2">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="size-12 rounded-full" />
      </div>

      <CardSkeleton height="220px" />
      <CardSkeleton height="140px" />

      <div className="grid grid-cols-2 gap-3">
        <CardSkeleton height="100px" />
        <CardSkeleton height="100px" />
      </div>

      <div className="space-y-2.5">
        <Skeleton className="mb-3 h-4 w-24" />
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} height="76px" />
        ))}
      </div>
    </div>
  );
}
