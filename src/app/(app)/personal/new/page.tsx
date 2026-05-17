import { PageHeader } from "@/components/layout/page-header";
import { PersonalForm } from "../personal-form";
import { todayISO } from "../utils";

/**
 * Halaman buat catatan baru. `?kind=income` di URL bikin form
 * langsung default ke mode pemasukan (pakai untuk deeplink dari
 * tombol "Pemasukan" di /personal). Default-nya pengeluaran.
 *
 * Metadata title juga ngikut kind supaya tab browser jelas.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  return {
    title: kind === "income" ? "Pemasukan baru" : "Pengeluaran baru",
  };
}

export default async function NewPersonalExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind: kindParam } = await searchParams;
  const defaultKind: "expense" | "income" =
    kindParam === "income" ? "income" : "expense";

  return (
    <>
      <PageHeader
        title={defaultKind === "income" ? "Pemasukan baru" : "Pengeluaran baru"}
        subtitle="Catat dengan cepat"
        back
      />
      <div className="px-4 py-4">
        <PersonalForm
          mode="create"
          defaultDate={todayISO()}
          defaultKind={defaultKind}
        />
      </div>
    </>
  );
}
