"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Wrapper untuk dua destructive actions yang sebelumnya nakal: bisa
 * dieksekusi dengan satu tap accidental. Kedua-duanya sekarang punya
 * dialog konfirmasi modal sebelum form di-submit.
 *
 * Pattern: form-nya hidden, ConfirmDialog men-trigger requestSubmit()
 * pas user nge-tap "Lanjutkan". Server action tetap pakai signature
 * (formData: FormData) — tidak ada perubahan di backend.
 */

interface RemoveMemberButtonProps {
  action: (formData: FormData) => Promise<void> | void;
  groupId: string;
  memberId: string;
  memberName: string;
}

export function RemoveMemberButton({
  action,
  groupId,
  memberId,
  memberName,
}: RemoveMemberButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="member_id" value={memberId} />
        <input type="hidden" name="group_id" value={groupId} />
      </form>
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Hapus ${memberName}`}
            className="text-[var(--color-destructive)]"
          >
            <Trash2 className="size-4" />
          </Button>
        }
        title="Hapus anggota dari grup?"
        description={
          <>
            <span className="font-semibold">{memberName}</span> akan dikeluarkan
            dari grup. Riwayat pengeluaran yang sudah ada tetap tersimpan, tapi
            mereka tidak akan ada di pembagian baru.
          </>
        }
        confirmLabel="Hapus anggota"
        variant="destructive"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}

interface DeleteGroupButtonProps {
  action: (formData: FormData) => Promise<void> | void;
  groupId: string;
  groupName: string;
}

export function DeleteGroupButton({
  action,
  groupId,
  groupName,
}: DeleteGroupButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={formRef} action={action} className="hidden">
        <input type="hidden" name="group_id" value={groupId} />
      </form>
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full gap-2 text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
          >
            <Trash2 className="size-4" />
            Hapus grup ini
          </Button>
        }
        title="Hapus grup permanen?"
        description={
          <>
            Grup <span className="font-semibold">{groupName}</span> beserta
            semua pengeluaran, anggota, dan riwayat pelunasan akan dihapus
            permanen. Aksi ini <b>tidak bisa dibatalkan</b>.
          </>
        }
        confirmLabel="Ya, hapus grup"
        variant="destructive"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
