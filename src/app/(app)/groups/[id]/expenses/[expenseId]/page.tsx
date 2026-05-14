import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { formatRupiah } from "@/lib/utils";
import { deleteExpenseAction } from "../actions";
import { ReceiptImage } from "./receipt-image";

export const metadata = { title: "Detail Pengeluaran" };
export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id, expenseId } = await params;
  const [user, group] = await Promise.all([getCurrentUser(), getGroupDetail(id)]);
  if (!group) notFound();
  const expense = group.expenses.find((e) => e.id === expenseId);
  if (!expense) notFound();

  const memberMap = new Map(group.members.map((m) => [m.id, m]));
  const payer = memberMap.get(expense.paid_by_member_id);
  const myMember = group.members.find((m) => m.profile_id === user?.id);

  return (
    <>
      <PageHeader title={expense.title} subtitle={group.name} back />
      <div className="px-4 py-4 space-y-5">
        <Card className="p-5 text-center bg-gradient-to-br from-[var(--color-primary)] to-[color-mix(in_oklab,var(--color-primary),black_15%)] text-[var(--color-primary-foreground)] border-0">
          <p className="text-xs opacity-80">Total</p>
          <p className="text-3xl font-bold tracking-tight mt-1">
            {formatRupiah(expense.amount)}
          </p>
          <p className="text-sm opacity-90 mt-2">
            Dibayar oleh{" "}
            <span className="font-semibold">
              {payer?.id === myMember?.id ? "kamu" : payer?.display_name}
            </span>{" "}
            · {format(new Date(expense.spent_at), "d MMMM yyyy", { locale: idLocale })}
          </p>
        </Card>

        {expense.receipt_url && <ReceiptImage path={expense.receipt_url} />}

        <section>
          <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] mb-2">
            Pembagian
          </h3>
          <Card className="divide-y divide-[var(--color-border)]">
            {expense.splits.map((s) => {
              const m = memberMap.get(s.member_id);
              if (!m) return null;
              return (
                <div key={s.member_id} className="flex items-center gap-3 p-4">
                  <Avatar name={m.display_name} size="sm" />
                  <p className="flex-1 font-medium text-sm">
                    {m.id === myMember?.id ? "Kamu" : m.display_name}
                  </p>
                  <p className="font-semibold text-sm">{formatRupiah(s.amount)}</p>
                </div>
              );
            })}
          </Card>
        </section>

        {expense.notes && (
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] mb-2">
              Catatan
            </h3>
            <Card className="p-4">
              <p className="text-sm whitespace-pre-wrap">{expense.notes}</p>
            </Card>
          </section>
        )}

        <form action={deleteExpenseAction}>
          <input type="hidden" name="expense_id" value={expense.id} />
          <input type="hidden" name="group_id" value={group.id} />
          <Button type="submit" variant="outline" size="lg" className="w-full text-[var(--color-destructive)]">
            <Trash2 className="size-4" />
            Hapus pengeluaran
          </Button>
        </form>
      </div>
    </>
  );
}
