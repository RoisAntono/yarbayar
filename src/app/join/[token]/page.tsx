import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { acceptInviteAction } from "@/app/(app)/groups/[id]/settings/invite-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Undangan grup" };
export const dynamic = "force-dynamic";

interface PreviewRow {
  group_id: string;
  group_name: string;
  group_emoji: string | null;
  invited_display_name: string | null;
  is_claim: boolean;
  expires_at: string;
  is_used: boolean;
}

/**
 * Public-ish page where anyone with an invite link lands. Three flows:
 *
 *  1. Token invalid / expired / already used → friendly error card.
 *  2. User not authenticated → redirect to /login with `next=` so they
 *     come back here automatically after sign-in.
 *  3. User authenticated → show preview ("kamu akan bergabung sebagai
 *     X di grup Y") + a single "Gabung" button that calls accept_invite.
 *
 * Note: We don't auto-accept on render; we always require a tap so the
 * joiner gets a chance to confirm before binding their identity.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error: errorParam } = await searchParams;

  const supabase = await createClient();

  // Validate the token via SECURITY DEFINER preview RPC. The RPC is
  // open to anon so the page can render *before* the user signs in.
  type Rpc = {
    rpc: (
      fn: "preview_invite",
      args: { _token: string }
    ) => Promise<{
      data: PreviewRow[] | null;
      error: { message: string } | null;
    }>;
  };
  const { data: previewRows } = await (supabase as unknown as Rpc).rpc(
    "preview_invite",
    { _token: token }
  );

  const preview = previewRows?.[0];

  // Token doesn't exist at all (probably revoked).
  if (!preview) {
    return (
      <ErrorScreen
        icon={<TriangleAlert className="size-7" />}
        title="Link undangan tidak valid"
        description="Link sudah dicabut atau pemiliknya menghapus grup. Minta link baru ke pemilik grup."
      />
    );
  }

  // Token used / expired
  if (preview.is_used) {
    return (
      <ErrorScreen
        icon={<CheckCircle2 className="size-7" />}
        title="Link sudah dipakai"
        description="Link undangan ini hanya bisa dipakai sekali. Minta link baru kalau memang butuh bergabung lagi."
      />
    );
  }
  if (new Date(preview.expires_at) < new Date()) {
    return (
      <ErrorScreen
        icon={<Clock className="size-7" />}
        title="Link kadaluarsa"
        description="Link undangan ini sudah lewat masa berlaku 7 hari. Minta link baru ke pemilik grup."
      />
    );
  }

  // Auth gate — push to login with next= callback.
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  // Authenticated. Show the confirm card.
  const groupLabel = `${preview.group_emoji ?? "👥"} ${preview.group_name}`;
  const errorMsg = decodeErrorParam(errorParam);

  return (
    <main className="mx-auto flex min-h-[80svh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          <Sparkles className="size-3.5" />
          Undangan grup
        </div>
        <h1 className="font-display mt-3 text-3xl tracking-tight">
          Bergabung ke grup ini?
        </h1>
      </div>

      <Card className="aurora grain relative overflow-hidden border-0 p-6 text-center text-[var(--color-on-ink)]">
        <div className="relative z-[2]">
          <p className="font-display text-2xl tracking-tight">{groupLabel}</p>
          {preview.is_claim ? (
            <p className="mt-3 text-sm opacity-90">
              Kamu akan masuk sebagai{" "}
              <span className="font-semibold text-[var(--color-accent)]">
                {preview.invited_display_name ?? "anggota"}
              </span>
              .
              <br />
              Semua riwayat pengeluaran sebelumnya tetap utuh.
            </p>
          ) : (
            <p className="mt-3 text-sm opacity-90">
              Kamu akan ditambahkan sebagai anggota baru dengan akun{" "}
              <span className="font-semibold">{u.user.email}</span>.
            </p>
          )}
        </div>
      </Card>

      {errorMsg && (
        <div className="rounded-2xl border border-[var(--color-destructive)]/30 bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)] p-3 text-xs text-[var(--color-destructive)]">
          {errorMsg}
        </div>
      )}

      <form action={acceptInviteAction} className="space-y-2">
        <input type="hidden" name="token" value={token} />
        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full gap-2"
        >
          <UserCheck className="size-5" /> Gabung ke grup
        </Button>
        <Link href="/" className="block text-center">
          <Button type="button" variant="ghost" size="sm" className="w-full">
            Tidak sekarang
          </Button>
        </Link>
      </form>
    </main>
  );
}

function ErrorScreen({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex min-h-[80svh] max-w-md flex-col justify-center gap-5 px-6 py-12 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
        {icon}
      </span>
      <div>
        <h1 className="font-display text-2xl tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          {description}
        </p>
      </div>
      <Link href="/" className="block">
        <Button variant="outline" size="lg" className="w-full">
          Kembali ke beranda
        </Button>
      </Link>
    </main>
  );
}

/**
 * Server-side errors from accept_invite get bounced back as ?error=…
 * to render a friendly Indonesian message above the Gabung button.
 */
function decodeErrorParam(raw: string | undefined): string | null {
  if (!raw) return null;
  // Postgres `raise exception 'X'` typically prefixes with the message.
  if (raw.includes("not_authenticated")) return "Sesi habis, login ulang dulu.";
  if (raw.includes("invalid_invite")) return "Link undangan tidak valid.";
  if (raw.includes("already_used")) return "Link sudah pernah dipakai.";
  if (raw.includes("expired")) return "Link sudah kadaluarsa.";
  if (raw.includes("target_already_claimed")) {
    return "Profil tamu ini sudah diklaim oleh akun lain.";
  }
  return "Gagal bergabung. Silakan coba lagi.";
}
