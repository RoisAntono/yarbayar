import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="size-16 grid place-items-center rounded-2xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
        <Compass className="size-7" />
      </div>
      <h2 className="font-semibold text-lg">Halaman tidak ditemukan</h2>
      <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs">
        Mungkin link sudah berubah atau dihapus.
      </p>
      <Link href="/">
        <Button variant="secondary" className="mt-2">
          Kembali ke beranda
        </Button>
      </Link>
    </div>
  );
}
