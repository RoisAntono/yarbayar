import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Calendar, Lock, Pencil, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { editMinutesLeft, isWithinEditWindow } from "@/lib/edit-window";
import { formatMoney } from "@/lib/utils";
import { deleteExpenseAction } from "../actions";
import { ReceiptImage } from "./receipt-image";
import { DeleteExpenseButton } from "./delete-button";

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
  const editable = isWithinEditWindow(expense.created_at);
  const minsLeft = editMinutesLeft(expense.created_at);

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
              {formatMoney(expense.amount, group.currency)}
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

        {/* Edit window status */}
        {editable ? (
          <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),transparent_88%)] px-4 py-2.5 text-xs text-[var(--color-foreground)]">
            <Pencil className="size-3.5" />
            Bisa diedit ~{minsLeft} menit lagi sebelum jadi permanen
          </p>
        ) : (
          <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--color-muted)] px-4 py-2.5 text-xs text-[var(--color-muted-foreground)]">
            <Lock className="size-3.5" />
            Pengeluaran ini sudah permanen (lebih dari 1 jam)
          </p>
        )}

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
                    {formatMoney(s.amount, group.currency)}
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

        {/* Actions — only show when still in the edit window */}
        {editable && (
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/groups/${group.id}/expenses/${expense.id}/edit`}>
              <Button variant="outline" size="lg" className="w-full gap-2">
                <Pencil className="size-4" />
                Edit
              </Button>
            </Link>
            <DeleteExpenseButton
              action={deleteExpenseAction}
              expenseId={expense.id}
              groupId={group.id}
              expenseTitle={expense.title}
              amount={expense.amount}
              currency={group.currency}
            />
          </div>
        )}
      </div>
    </>
  );
}
