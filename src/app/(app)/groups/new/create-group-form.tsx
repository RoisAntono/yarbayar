"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createGroupAction, type GroupFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EMOJIS = ["👥", "🏖️", "✈️", "🍽️", "🏠", "🎉", "☕️", "🎬", "💼", "⚽️", "🎮", "🛒"];

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(
    createGroupAction,
    undefined
  );
  const [emoji, setEmoji] = useState("👥");
  const [members, setMembers] = useState<string[]>([""]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="emoji" value={emoji} />

      {/* Emoji picker */}
      <div className="space-y-2">
        <Label>Ikon grup</Label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
          {EMOJIS.map((e) => {
            const active = emoji === e;
            return (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={cn(
                  "grid size-13 shrink-0 place-items-center rounded-2xl text-2xl transition-all duration-200",
                  active
                    ? "scale-105 bg-[var(--color-accent)] shadow-[var(--shadow-pop-accent)] ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-background)]"
                    : "bg-[var(--color-muted)] hover:bg-[var(--color-secondary)] active:scale-95"
                )}
                style={{ width: "3.25rem", height: "3.25rem" }}
                aria-pressed={active}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Nama grup</Label>
        <Input
          id="name"
          name="name"
          placeholder="Trip Bali, geng kosan…"
          required
          aria-invalid={!!state?.fieldErrors?.name}
        />
        {state?.fieldErrors?.name && (
          <p className="text-xs text-[var(--color-destructive)]">
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="owner_name">Nama tampilan kamu</Label>
        <Input id="owner_name" name="owner_name" placeholder="Saya" />
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Akan muncul di daftar anggota grup.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Anggota lainnya</Label>
          <button
            type="button"
            onClick={() => setMembers((m) => [...m, ""])}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-muted)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] active:scale-95"
          >
            <Plus className="size-3.5" /> Tambah
          </button>
        </div>
        <div className="space-y-2">
          {members.map((m, i) => (
            <div key={i} className="flex gap-2">
              <Input
                name="member_name"
                value={m}
                onChange={(e) =>
                  setMembers((arr) =>
                    arr.map((x, j) => (j === i ? e.target.value : x))
                  )
                }
                placeholder={`Nama anggota #${i + 1}`}
              />
              {members.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setMembers((arr) => arr.filter((_, j) => j !== i))
                  }
                  aria-label="Hapus"
                  className="text-[var(--color-destructive)]"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Anggota tanpa akun cukup ditulis namanya — kamu yang catat dari sisi mereka.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-2xl bg-[color-mix(in_oklab,var(--color-destructive),transparent_88%)] px-4 py-3 text-sm text-[var(--color-destructive)]">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} size="lg" className="w-full">
        Buat grup
      </Button>
    </form>
  );
}
