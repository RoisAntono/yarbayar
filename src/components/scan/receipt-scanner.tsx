"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { formatRupiah } from "@/lib/utils";

export interface ScanResult {
  /** Detected total in rupiah (best guess) */
  amount: number | null;
  /** Detected merchant / first non-empty line */
  merchant: string | null;
  /** Raw OCR text */
  text: string;
}

interface ReceiptScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (result: ScanResult, file: File) => void;
}

/**
 * Mobile-friendly receipt scanner. Uses the device camera when available,
 * runs Tesseract.js (Indonesian + English) in the browser, and extracts
 * a best-guess total amount from the text.
 *
 * Tesseract is loaded only on demand (when user picks a file) so the
 * ~3MB worker doesn't block first paint.
 */
export function ReceiptScanner({ open, onOpenChange, onResult }: ReceiptScannerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setProgress(0);
    setBusy(true);

    try {
      // Lazy import so the worker only loads when needed
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "ind+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const parsed = parseReceipt(data.text);
      setResult(parsed);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memproses gambar. Coba foto yang lebih jelas.");
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    if (result && pendingFile) {
      onResult(result, pendingFile);
      reset();
      onOpenChange(false);
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setProgress(0);
    setPendingFile(null);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Scan nota"
      description="Foto atau pilih gambar nota — kami baca otomatis."
    >
      <div className="space-y-4 pt-2">
        {!preview && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                onClick={() => cameraRef.current?.click()}
                className="h-24 flex-col gap-1"
              >
                <Camera className="size-6" />
                <span className="text-xs font-medium">Buka kamera</span>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                className="h-24 flex-col gap-1"
              >
                <Upload className="size-6" />
                <span className="text-xs font-medium">Pilih dari galeri</span>
              </Button>
            </div>
            <p className="text-xs text-[var(--color-muted-foreground)] text-center px-4">
              Tip: pastikan nota terbaca jelas dan tidak buram. Total akan dideteksi otomatis.
            </p>
          </>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {preview && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-[var(--color-muted)] aspect-[3/4] max-h-[50vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Pratinjau nota"
                className="w-full h-full object-contain"
              />
              {busy && (
                <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin" />
                    <p className="text-sm font-medium">Membaca nota… {progress}%</p>
                  </div>
                </div>
              )}
              <button
                onClick={reset}
                className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white grid place-items-center"
                aria-label="Hapus"
              >
                <X className="size-4" />
              </button>
            </div>

            {result && (
              <div className="rounded-2xl bg-[var(--color-muted)] p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4 text-[var(--color-primary)]" />
                  Hasil deteksi
                </div>
                {result.merchant && (
                  <div>
                    <p className="text-xs text-[var(--color-muted-foreground)]">Toko</p>
                    <p className="font-medium truncate">{result.merchant}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Total terdeteksi
                  </p>
                  <p className="text-2xl font-bold">
                    {result.amount !== null ? formatRupiah(result.amount) : "—"}
                  </p>
                  {result.amount === null && (
                    <p className="text-xs text-[var(--color-warning)] mt-1">
                      Tidak menemukan total. Kamu masih bisa isi manual.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} className="flex-1">
                Foto ulang
              </Button>
              <Button onClick={confirm} disabled={busy || !result} className="flex-1">
                Pakai hasil ini
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/**
 * Best-effort parser for receipt text.
 * Strategy:
 *  1. Strip thousand separators (.,) carefully.
 *  2. Look for lines containing "total", "grand total", "tagihan", "bayar"
 *     and take the largest number on or near that line.
 *  3. Fallback: largest number anywhere in the text >= 1000.
 */
export function parseReceipt(text: string): ScanResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const merchant = lines[0] ?? null;

  const TOTAL_KEYS = /\b(grand\s*total|total\s*akhir|total\s*bayar|total|tagihan|jumlah\s*bayar|bayar)\b/i;

  const numberRegex = /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d{4,})(?:[.,]\d{2})?/g;

  function extractNumbers(s: string): number[] {
    const out: number[] = [];
    for (const m of s.matchAll(numberRegex)) {
      const cleaned = m[1].replace(/[.,]/g, "");
      const n = Number(cleaned);
      if (Number.isFinite(n) && n >= 100) out.push(n);
    }
    return out;
  }

  let candidate: number | null = null;

  // Pass 1: lines mentioning "total"
  for (let i = 0; i < lines.length; i++) {
    if (TOTAL_KEYS.test(lines[i])) {
      const nums = [
        ...extractNumbers(lines[i]),
        ...(lines[i + 1] ? extractNumbers(lines[i + 1]) : []),
      ];
      if (nums.length > 0) {
        const max = Math.max(...nums);
        if (candidate === null || max > candidate) candidate = max;
      }
    }
  }

  // Pass 2: fallback — largest number across all lines
  if (candidate === null) {
    const all = lines.flatMap(extractNumbers).filter((n) => n >= 1000);
    if (all.length > 0) candidate = Math.max(...all);
  }

  return {
    amount: candidate,
    merchant: merchant ? merchant.slice(0, 80) : null,
    text,
  };
}
