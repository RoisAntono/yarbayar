"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, Link as LinkIcon, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  createClaimInviteAction,
  createNewMemberInviteAction,
  revokeInviteAction,
  type InviteFormState,
} from "./invite-actions";


/**
 * Two flavors of invite UI in the settings page:
 *
 *   <ClaimInviteButton ... />     – inline "Undang ke akun" next to a
 *                                    guest member row. Pops a dialog
 *                                    with link + copy/share controls.
 *
 *   <NewMemberInviteCard ... />   – a card in the "Tambah anggota"
 *                                    section that creates an invite
 *                                    pointing at *no specific member*.
 *                                    The joiner becomes a fresh auth
 *                                    member with their profile name.
 *
 * Both call the same server actions. Both use Web Share API when
 * available, and fall back to clipboard.copy() otherwise.
 */

// ---------------------------------------------------------------
// Inline Claim button + dialog
// ---------------------------------------------------------------

export function ClaimInviteButton({
  groupId,
  memberId,
  memberName,
}: {
  groupId: string;
  memberId: string;
  memberName: string;
}) {
  const [state, formAction, pending] = useActionState<
    InviteFormState,
    FormData
  >(createClaimInviteAction, undefined);

  const [open, setOpen] = useState(false);

  // Open the result dialog automatically when the action returns a
  // freshly-created link.
  useEffect(() => {
    if (state?.created) setOpen(true);
  }, [state?.created]);

  return (
    <>
      <form action={formAction}>
        <input type="hidden" name="group_id" value={groupId} />
        <input type="hidden" name="member_id" value={memberId} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          loading={pending}
          className="gap-1.5"
        >
          <LinkIcon className="size-3.5" /> Undang
        </Button>
      </form>

      {state?.error && (
        <p className="mt-1 text-[10px] text-[var(--color-destructive)]">
          {state.error}
        </p>
      )}

      <InviteResultDialog
        open={open}
        setOpen={setOpen}
        url={state?.created?.url ?? ""}
        title={`Undang ${memberName}`}
        description={
          <>
            Bagikan link ini ke{" "}
            <span className="font-semibold">{memberName}</span> saja. Setelah
            login, mereka akan otomatis terhubung ke profil tamu yang sudah ada
            — semua riwayat tetap utuh. Link sekali pakai supaya identitas tamu
            tidak bisa diklaim orang lain.
          </>
        }
      />
    </>
  );
}

// ---------------------------------------------------------------
// Generic "buat link untuk anggota baru"
// ---------------------------------------------------------------

export function NewMemberInviteCard({ groupId }: { groupId: string }) {
  const [state, formAction, pending] = useActionState<
    InviteFormState,
    FormData
  >(createNewMemberInviteAction, undefined);

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state?.created) setOpen(true);
  }, [state?.created]);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-[var(--color-accent)]">
          <Share2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Undang lewat link</p>
          <p className="text-[11px] text-[var(--color-muted-foreground)]">
            Bisa dipakai banyak teman · kadaluarsa 24 jam
          </p>
        </div>
      </div>
      <form action={formAction}>
        <input type="hidden" name="group_id" value={groupId} />
        <Button
          type="submit"
          variant="accent"
          loading={pending}
          className="w-full gap-2"
        >
          <LinkIcon className="size-4" />
          Buat link undangan
        </Button>
      </form>
      {state?.error && (
        <p className="text-xs text-[var(--color-destructive)]">{state.error}</p>
      )}

      <InviteResultDialog
        open={open}
        setOpen={setOpen}
        url={state?.created?.url ?? ""}
        title="Link undangan siap"
        description={
          <>
            Bagikan link ini ke teman-teman. Semua orang dengan link ini bisa
            join sebagai anggota baru. Link berlaku 24 jam.
          </>
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------------
// Pending invites list (with revoke)
// ---------------------------------------------------------------

interface PendingInvite {
  token: string;
  display_name: string | null;
  expires_at: string;
  is_claim: boolean;
}

export function PendingInvitesList({
  groupId,
  invites,
}: {
  groupId: string;
  invites: PendingInvite[];
}) {
  if (invites.length === 0) return null;

  return (
    <Card className="divide-y divide-[var(--color-border)]">
      {invites.map((inv) => {
        const exp = new Date(inv.expires_at);
        const remainingHours = Math.max(
          0,
          Math.round((exp.getTime() - Date.now()) / (1000 * 60 * 60))
        );
        return (
          <PendingInviteRow
            key={inv.token}
            groupId={groupId}
            invite={inv}
            remainingHours={remainingHours}
          />
        );
      })}
    </Card>
  );
}

function PendingInviteRow({
  groupId,
  invite,
  remainingHours,
}: {
  groupId: string;
  invite: PendingInvite;
  remainingHours: number;
}) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${invite.token}`
      : "";

  return (
    <div className="flex items-center gap-3 p-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
        <LinkIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {invite.is_claim
            ? `Undang ${invite.display_name ?? "anggota"}`
            : invite.display_name
              ? `Anggota baru · ${invite.display_name}`
              : "Anggota baru"}
        </p>
        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          {remainingHours <= 0
            ? "Kadaluarsa"
            : remainingHours < 1
              ? "Berlaku <1 jam lagi"
              : `Berlaku ${remainingHours} jam lagi`}
        </p>
      </div>
      <CopyButton value={url} small />
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Cabut link"
            className="text-[var(--color-destructive)]"
          >
            <X className="size-4" />
          </Button>
        }
        title="Cabut link undangan?"
        description="Link ini akan langsung tidak berlaku. Yang sudah punya link tidak bisa pakai lagi."
        confirmLabel="Cabut"
        variant="destructive"
        onConfirm={async () => {
          const fd = new FormData();
          fd.append("token", invite.token);
          fd.append("group_id", groupId);
          try {
            await revokeInviteAction(fd);
            toast.success("Link dicabut");
          } catch {
            toast.error("Gagal cabut link, coba lagi");
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------
// Shared: result dialog with copy/share
// ---------------------------------------------------------------

function InviteResultDialog({
  open,
  setOpen,
  url,
  title,
  description,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  url: string;
  title: string;
  description: React.ReactNode;
}) {
  if (!open || !url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-md space-y-4 rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-float)] sm:rounded-3xl",
          "animate-in fade-in slide-in-from-bottom-4"
        )}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-[var(--color-accent)]">
            <Check className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup"
            className="grid size-8 shrink-0 place-items-center rounded-xl text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* URL preview */}
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2">
          <LinkIcon className="size-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
            {url}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <CopyButton value={url} />
          <ShareButton value={url} />
        </div>
      </div>
    </div>
  );
}

function CopyButton({
  value,
  small,
}: {
  value: string;
  small?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleCopy() {
    try {
      setBusy(true);
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      // Toast cuma untuk small icon-only variant — full button udah
      // self-explain via state "Tersalin ✓" jadi double-feedback noisy.
      if (small) toast.success("Link tersalin");
    } catch {
      // Older browsers / iOS lockdown / non-https — fallback ke toast
      // yang tampil URL utuh, user bisa long-press copy manual.
      toast.error("Gagal menyalin otomatis", {
        description: value,
        duration: 8000,
      });
    } finally {
      setBusy(false);
    }
  }

  if (small) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Tersalin" : "Salin link"}
        className={cn(
          "grid size-8 place-items-center rounded-xl transition-all",
          copied
            ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
            : "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
        )}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : copied ? (
          <Check className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      loading={busy}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="size-4" /> Tersalin
        </>
      ) : (
        <>
          <Copy className="size-4" /> Salin link
        </>
      )}
    </Button>
  );
}

function ShareButton({ value }: { value: string }) {
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (typeof navigator === "undefined" || !navigator.share) {
      // Web Share API tidak ada (desktop biasanya). Fallback: copy ke
      // clipboard + toast yang ngarahin user paste ke chat manual.
      try {
        await navigator.clipboard.writeText(value);
        toast.success("Link tersalin", {
          description: "Tempel di chat untuk membagikan",
        });
      } catch {
        // Both Web Share + clipboard fail (rare). Show URL in toast.
        toast.error("Gagal share otomatis", {
          description: value,
          duration: 8000,
        });
      }
      return;
    }
    try {
      setBusy(true);
      await navigator.share({
        title: "Undangan Yarbayar",
        text: "Yuk gabung ke grup pengeluaran kita di Yarbayar",
        url: value,
      });
    } catch {
      // User cancel di share sheet — diam, bukan error sungguhan.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="accent"
      onClick={handleShare}
      loading={busy}
      className="gap-2"
    >
      <Share2 className="size-4" /> Bagikan
    </Button>
  );
}
