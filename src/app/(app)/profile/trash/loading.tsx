import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function TrashLoading() {
  return (
    <>
      <PageHeader title="Sampah" subtitle="Catatan keuangan" back />
      <div className="space-y-5 px-4 py-4">
        <Skeleton className="h-3 w-48" />
        <CardSkeleton height="120px" />
        <CardSkeleton height="120px" />
        <CardSkeleton height="120px" />
      </div>
    </>
  );
}
