"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createGroupAction, type GroupFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMOJIS = ["👥", "🏖️", "✈️", "🍽️", "🏠", "🎉", "☕️", "🎬", "💼", "⚽️"];

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(
    createGroupAction,
    undefined
  );
  const [emoji, setEmoji] = useState("👥");
  const [members, setMembers] = useState<string[]>([""]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="emoji" value={emoji} />

      {/* Emoji picker */}
      <div className="space-y-2">
        <Label>Ikon grup</Label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`size-12 shrink-0 rounded-xl text-2xl transition-all ${
                emoji === e
                  ? "bg-[var(--color-primary)] scale-105 shadow-[var(--shadow-pop)]"
                  : "bg-[var(--color-muted)] hover:bg-[var(--color-secondary)]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Nama grup</Label>
        <Input
          id="name"
          name="name"
          placeholder="Mis. Trip Bali, Geng Kosan"
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
        <Label htmlFor="owner_name">Nama tampilan kamu di grup ini</Label>
        <Input
          id="owner_name"
          name="owner_name"
          placeholder="Saya"
        />
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Akan muncul di daftar anggota.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Anggota lainnya</Label>
          <button
            type="button"
            onClick={() => setMembers((m) => [...m, ""])}
            className="text-xs font-medium text-[var(--color-primary)] flex items-center gap-1"
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
                  setMembers((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))
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
        <p className="text-sm text-[var(--color-destructive)] bg-[var(--color-destructive)]/10 px-3 py-2 rounded-lg">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} size="lg" className="w-full">
        Buat grup
      </Button>
    </form>
  );
}
