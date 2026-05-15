import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, Trash2, Wallet } from "lucide-react";
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
      <div className="space-y-5 px-4 py-4">
        {/* Hero amount card */}
        <Card className="aurora grain relative overflow-hidden border-0 p-6 text-center text-[var(--color-on-ink)] float-in">
          <div className="relative z-[2]">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
              Total
            </p>
            <p className="mt-2 font-display tabular text-5xl leading-none">
              {formatRupiah(expense.amount)}
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs opacity-80">
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="size-3.5" />
                {payer?.id === myMember?.id ? "Kamu" : payer?.display_name}
              </span>
              <span className="size-1 rounded-full bg-current opacity-50" />
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {format(new Date(expense.spent_at), "d MMM yyyy", {
                  locale: idLocale,
                })}
              </span>
            </div>
          </div>
        </Card>

        {expense.receipt_url && <ReceiptImage path={expense.receipt_url} />}

        <section>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Pembagian
          </h3>
          <Card className="divide-y divide-[var(--color-border)]">
            {expense.splits.map((s) => {
              const m = memberMap.get(s.member_id);
              if (!m) return null;
              return (
                <div key={s.member_id} className="flex items-center gap-3 p-4">
                  <Avatar name={m.display_name} size="sm" />
                  <p className="flex-1 text-sm font-medium">
                    {m.id === myMember?.id ? "Kamu" : m.display_name}
                  </p>
                  <p className="tabular text-sm font-semibold">
                    {formatRupiah(s.amount)}
                  </p>
                </div>
              );
            })}
          </Card>
        </section>

        {expense.notes && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Catatan
            </h3>
            <Card className="p-4">
              <p className="whitespace-pre-wrap text-sm">{expense.notes}</p>
            </Card>
          </section>
        )}

        <form action={deleteExpenseAction}>
          <input type="hidden" name="expense_id" value={expense.id} />
          <input type="hidden" name="group_id" value={group.id} />
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="w-full gap-2 text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
          >
            <Trash2 className="size-4" />
            Hapus pengeluaran
          </Button>
        </form>
      </div>
    </>
  );
}
