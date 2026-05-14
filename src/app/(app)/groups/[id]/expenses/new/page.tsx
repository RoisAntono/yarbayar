import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { ExpenseForm } from "./expense-form";

export const metadata = { title: "Tambah Pengeluaran" };
export const dynamic = "force-dynamic";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, group] = await Promise.all([
    getCurrentUser(),
    getGroupDetail(id),
  ]);
  if (!user) redirect("/login");
  if (!group) notFound();

  const myMember = group.members.find((m) => m.profile_id === user.id);

  return (
    <>
      <PageHeader title="Pengeluaran baru" subtitle={group.name} back />
      <div className="px-4 py-4">
        <ExpenseForm
          groupId={group.id}
          members={group.members}
          defaultPaidBy={myMember?.id ?? group.members[0]?.id ?? ""}
        />
      </div>
    </>
  );
}
