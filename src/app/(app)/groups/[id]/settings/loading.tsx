import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Match layout di `settings/page.tsx`:
 *   1. Members section — header chip + list dengan ~3 row (avatar +
 *      name + badge + action button kanan)
 *   2. Add member section (owner-only, render duluan kalau load belum
 *      tau owner status — skeleton aman karena conditional content
 *      muncul pas data ada)
 *   3. Danger zone — single button card
 *
 * Tetap render placeholder Add member + Danger zone karena umumnya
 * yang masuk ke /settings adalah owner; non-owner masuk hanya untuk
 * lihat member list — kelebihan skeleton row ngga harm.
 */
export default function GroupSettingsLoading() {
  return (
    <>
      <PageHeader title="Pengaturan grup" back />
      <div className="space-y-6 px-4 py-4">
        {/* Members */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <CardSkeleton height="64px" />
          <CardSkeleton height="64px" />
          <CardSkeleton height="64px" />
        </div>

        {/* Add member */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <CardSkeleton height="160px" />
          <CardSkeleton height="120px" />
        </div>

        {/* Danger zone */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <CardSkeleton height="48px" />
        </div>
      </div>
    </>
  );
}
