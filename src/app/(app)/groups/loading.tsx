import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function GroupsLoading() {
  return (
    <>
      <PageHeader title="Grup" />
      <div className="space-y-3 px-4 py-4">
        {[0, 1, 2, 3].map((i) => (
          <CardSkeleton key={i} height="84px" />
        ))}
        {/* Subtle hint biar user tau "ini lagi loading" bukan
            "memang kosong segini doang". */}
        <Skeleton className="mx-auto mt-2 h-3 w-32" />
      </div>
    </>
  );
}
