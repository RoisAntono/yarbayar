"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="size-16 grid place-items-center rounded-2xl bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
        <AlertCircle className="size-7" />
      </div>
      <h2 className="font-semibold text-lg">Aduh, ada yang error</h2>
      <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs">
        {error.message || "Coba muat ulang halaman ini."}
      </p>
      <Button onClick={reset} variant="secondary" className="mt-2">
        Coba lagi
      </Button>
    </div>
  );
}
