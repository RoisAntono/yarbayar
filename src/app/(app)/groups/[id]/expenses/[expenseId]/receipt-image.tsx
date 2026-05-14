"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

/**
 * Renders the uploaded receipt image. The path lives in a private bucket,
 * so we generate a signed URL on the client (1h expiry) just for viewing.
 */
export function ReceiptImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from("receipts")
          .createSignedUrl(path, 60 * 60);
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          setError(true);
          return;
        }
        setUrl(data.signedUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return (
    <section>
      <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] mb-2">
        Foto nota
      </h3>
      <Card className="overflow-hidden">
        {error ? (
          <div className="aspect-square grid place-items-center text-[var(--color-muted-foreground)]">
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="size-8" />
              <p className="text-xs">Gagal memuat gambar</p>
            </div>
          </div>
        ) : !url ? (
          <div className="aspect-square animate-pulse bg-[var(--color-muted)]" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Foto nota" className="w-full h-auto" />
        )}
      </Card>
    </section>
  );
}
