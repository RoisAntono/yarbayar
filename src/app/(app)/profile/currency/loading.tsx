import { CardSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

export default function CurrencyPickerLoading() {
  return (
    <>
      <PageHeader title="Mata uang" subtitle="Pilih cara tampilan angka" back />
      <div className="space-y-4 px-4 py-4">
        <CardSkeleton height="80px" />
        <CardSkeleton height="540px" />
      </div>
    </>
  );
}
