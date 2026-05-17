import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * Group detail loading state. Hero aurora + chart placeholder + member
 * strip + expense list. Tidak include PageHeader karena `[id]/page.tsx`
 * butuh data group untuk title — fallback ke layout shell yang minimal
 * supaya tidak ada false-positive title.
 */
export default function GroupDetailLoading() {
  return (
    <div className="space-y-5 px-4 py-4 pt-14">
      <CardSkeleton height="220px" />

      <CardSkeleton height="64px" />

      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <CardSkeleton height="180px" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex w-20 shrink-0 flex-col items-center gap-1.5">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        {[0, 1, 2].map((i) => (
          <CardSkeleton key={i} height="68px" />
        ))}
      </div>
    </div>
  );
}
