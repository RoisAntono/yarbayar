"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Delete personal expense, gated by a ConfirmDialog. Same pattern as
 * group expense delete + danger-actions in settings.
 *
 * After delete completes, push back to /personal so the user lands on
 * the list, not on a 404'd edit page (the row was just removed).
 */
export function DeletePersonalButton({
  action,
  id,
  title,
}: {
  action: (formData: FormData) => Promise<void> | void;
  id: string;
  title: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <>
      <form
        ref={formRef}
        action={async (fd) => {
          await action(fd);
          router.push("/personal");
        }}
        className="hidden"
      >
        <input type="hidden" name="id" value={id} />
      </form>
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full gap-2 text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
          >
            <Trash2 className="size-4" /> Hapus pengeluaran
          </Button>
        }
        title="Hapus pengeluaran pribadi?"
        description={
          <>
            <span className="font-semibold">{title}</span> akan dihapus dari
            riwayat. Aksi ini tidak bisa dibatalkan.
          </>
        }
        confirmLabel="Hapus"
        variant="destructive"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
