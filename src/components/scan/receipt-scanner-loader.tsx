"use client";

import dynamic from "next/dynamic";

/**
 * Tesseract OCR + canvas pipeline sekitar 1.5MB. Ini cuma dipakai
 * saat user tap "Scan nota", jadi tidak boleh masuk ke main bundle
 * `expense-form`. Pakai `next/dynamic` ssr:false biar lib
 * browser-only-nya tidak ke-execute di server.
 *
 * Tidak ada loading skeleton karena scanner = modal yang baru muncul
 * setelah user tap. Sekejap kosong → dialog terbuka itu lebih natural
 * daripada double placeholder.
 */
export const ReceiptScanner = dynamic(
  () =>
    import("./receipt-scanner").then((m) => ({ default: m.ReceiptScanner })),
  { ssr: false }
);
