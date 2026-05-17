import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "../../new/expense-form";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { isWithinEditWindow } from "@/lib/edit-window";

export const metadata = { title: "Edit pengeluaran" };
export const dynamic = "force-dynamic";

export default async function ExpenseEditPage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id, expenseId } = await params;
  const [user, group] = await Promise.all([
    getCurrentUser(),
    getGroupDetail(id),
  ]);
  if (!group) notFound();

  const expense = group.expenses.find((e) => e.id === expenseId);
  if (!expense) notFound();

  // Belt-and-suspenders: server action also checks, but bouncing the
  // user back early avoids rendering a form they can't submit.
  if (!isWithinEditWindow(expense.created_at)) {
    redirect(`/groups/${id}/expenses/${expenseId}`);
  }

  const myMember = group.members.find((m) => m.profile_id === user?.id);
  const defaultPaidBy = myMember?.id ?? group.members[0]?.id ?? "";

  return (
    <>
      <PageHeader title="Edit pengeluaran" subtitle={group.name} back />
      <div className="px-4 py-4">
        <ExpenseForm
          groupId={group.id}
          members={group.members}
          defaultPaidBy={defaultPaidBy}
          initial={{
            id: expense.id,
            title: expense.title,
            amount: expense.amount,
            paid_by_member_id: expense.paid_by_member_id,
            split_method: expense.split_method,
            spent_at: expense.spent_at,
            notes: expense.notes,
            receipt_url: expense.receipt_url,
            category: expense.category,
            splits: expense.splits,
          }}
        />
      </div>
    </>
  );
}
