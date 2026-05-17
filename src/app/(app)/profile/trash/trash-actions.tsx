"use client";

import { useRef, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";


/**
 * Two action buttons per trash bin row:
 *   - **Pulihkan** — restore (set archived_at = NULL). Low-stakes,
 *     no confirm dialog. Pakai useTransition supaya tombol tampil
 *     loading tanpa nge-block UI.
 *   - **Hapus permanen** — purge dari DB. High-stakes, irreversible
 *     → wajib ConfirmDialog destructive variant.
 *
 * Pattern hidden form + requestSubmit() konsisten dengan
 * delete-button.tsx dan settlements-card.tsx — server action di-call
 * lewat <form action={...}> bukan onClick fetch, supaya mutation
 * tetap di server-side route + auto revalidatePath.
 */
export function TrashRowActions({
  id,
  title,
  restoreAction,
  purgeAction,
}: {
  id: string;
  title: string;
  restoreAction: (formData: FormData) => Promise<void>;
  purgeAction: (formData: FormData) => Promise<void>;
}) {
  const restoreFormRef = useRef<HTMLFormElement>(null);
  const purgeFormRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  // Restore: low-stakes, langsung action — toast yang konfirmasi.
  // Pattern try/catch supaya error path juga punya toast feedback.
  async function handleRestore(fd: FormData) {
    try {
      await restoreAction(fd);
      toast.success(`"${title}" dipulihkan`);
    } catch {
      toast.error("Gagal pulihkan, coba lagi");
    }
  }

  async function handlePurge(fd: FormData) {
    try {
      await purgeAction(fd);
      toast.success("Dihapus permanen");
    } catch {
      toast.error("Gagal hapus permanen, coba lagi");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <form
        ref={restoreFormRef}
        action={(fd) => start(() => handleRestore(fd))}
        className="inline-flex"
      >
        <input type="hidden" name="id" value={id} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          loading={pending}
          className="gap-1.5"
          aria-label={`Pulihkan ${title}`}
        >
          <RotateCcw className="size-3.5" />
          Pulihkan
        </Button>
      </form>

      <form ref={purgeFormRef} action={handlePurge} className="hidden">
        <input type="hidden" name="id" value={id} />
      </form>
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
            aria-label={`Hapus permanen ${title}`}
          >
            <Trash2 className="size-3.5" />
            Hapus
          </Button>
        }
        title="Hapus permanen?"
        description={
          <>
            <span className="font-semibold">{title}</span> akan hilang
            sepenuhnya dari database. Tidak ada cara untuk pulihkan setelah ini.
          </>
        }
        confirmLabel="Hapus permanen"
        variant="destructive"
        onConfirm={() => purgeFormRef.current?.requestSubmit()}
      />
    </div>
  );
}
