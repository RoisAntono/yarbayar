"use client";

import { useActionState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { loginAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    loginAction,
    undefined
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="kamu@email.com"
          required
          aria-invalid={!!state?.fieldErrors?.email}
        />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-[var(--color-destructive)]">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            required
            aria-invalid={!!state?.fieldErrors?.password}
            className="pr-12"
          />
          <button
            type="button"
            aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] p-1"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p className="text-xs text-[var(--color-destructive)]">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      {state?.error && (
        <p className="text-sm text-[var(--color-destructive)] bg-[var(--color-destructive)]/10 px-3 py-2 rounded-lg">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} size="lg" className="w-full">
        Masuk
      </Button>
    </form>
  );
}
