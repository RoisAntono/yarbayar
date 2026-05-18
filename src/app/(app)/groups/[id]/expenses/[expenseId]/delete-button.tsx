"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatMoney } from "@/lib/utils";

interface DeleteExpenseButtonProps {
  /** Server action passed in from a server component. */
  action: (formData: FormData) => Promise<void> | void;
  expenseId: string;
  groupId: string;
  expenseTitle: string;
  /** Optional amount to show in the confirm copy */
  amount?: number;
  /** Currency code untuk format amount di konfirmasi (default IDR). */
  currency?: string;
}

/**
 * Wraps the delete server action in a confirm dialog. The form is
 * hidden — the dialog's confirm button submits it programmatically.
 * This way we keep using the proper Server Action flow (no fetch /
 * client-side supabase calls) while still getting a real confirm UI.
 */
export function DeleteExpenseButton({
  action,
  expenseId,
  groupId,
  expenseTitle,
  amount,
  currency = "IDR",
}: DeleteExpenseButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="expense_id" value={expenseId} />
        <input type="hidden" name="group_id" value={groupId} />
      </form>
      <ConfirmDialog
        trigger={
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2 text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
          >
            <Trash2 className="size-4" />
            Hapus
          </Button>
        }
        title="Hapus pengeluaran?"
        description={
          <>
            <span className="font-semibold">{expenseTitle}</span>
            {amount !== undefined ? ` (${formatMoney(amount, currency)})` : ""} akan
            dihapus permanen dari grup. Aksi ini tidak bisa dibatalkan.
          </>
        }
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={() => {
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
