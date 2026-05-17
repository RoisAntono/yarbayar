import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";
import { PersonalForm } from "../../personal-form";
import { deletePersonalExpenseAction } from "../../actions";
import { todayISO } from "../../utils";
import { DeletePersonalButton } from "./delete-button";

export const dynamic = "force-dynamic";

/**
 * Tab title ikut kind row supaya browser tab tampil "Edit pemasukan"
 * vs "Edit pengeluaran" — bukan generic "Edit" yang membingungkan
 * saat user buka beberapa tab paralel.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("personal_expenses")
    .select("kind")
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  return {
    title: data?.kind === "income" ? "Edit pemasukan" : "Edit pengeluaran",
  };
}

export default async function EditPersonalExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personal_expenses")
    .select("id, title, amount, category, notes, kind, spent_at")
    .eq("id", id)
    // Soft-deleted rows ngga boleh muncul di edit form — kalau ada
    // archived_at, treat as not-found supaya user redirect ke trash.
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) notFound();

  const kind: "expense" | "income" =
    data.kind === "income" ? "income" : "expense";

  return (
    <>
      <PageHeader
        title={kind === "income" ? "Edit pemasukan" : "Edit pengeluaran"}
        subtitle="Catatan keuangan"
        back
      />
      <div className="space-y-6 px-4 py-4">
        <PersonalForm
          mode="edit"
          defaultDate={todayISO()}
          initial={{
            id: data.id,
            title: data.title,
            amount: Number(data.amount),
            category: data.category,
            notes: data.notes,
            kind,
            spent_at: data.spent_at,
          }}
        />

        {/* Delete is below the save button — destructive action
            visually separated from the primary save action. The
            confirm dialog is intentional friction (see
            DeletePersonalButton). */}
        <DeletePersonalButton
          action={deletePersonalExpenseAction}
          id={data.id}
          title={data.title}
        />
      </div>
    </>
  );
}
