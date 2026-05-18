import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

/**
 * Skeleton match dimensi GoalPickerPage:
 *  - disclaimer card (compact, 2 baris)
 *  - form card (input + button + reset button optional)
 *  - footer note
 */
export default function GoalPickerLoading() {
  return (
    <>
      <PageHeader title="Target nabung" subtitle="Set goal bulanan" back />
      <div className="space-y-4 px-4 py-4">
        <Card className="space-y-2 p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </Card>

        <Card className="space-y-3 p-4">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </Card>

        <Skeleton className="mx-auto h-3 w-2/3" />
      </div>
    </>
  );
}
