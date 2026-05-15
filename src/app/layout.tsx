import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import "./globals.css";

// Body — humanist sans with subtle character (rounder than Inter)
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Display — high-contrast serif used for hero numbers / large totals.
// Makes Rupiah figures feel editorial, not generic dashboard.
const display = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

// Mono — for tabular figures in receipts, splits, and OCR text
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});


export const metadata: Metadata = {
  title: {
    default: "Yarbayar — Splitbill bareng teman",
    template: "%s · Yarbayar",
  },
  description:
    "Catat dan bagi pengeluaran bersama teman, lengkap dengan scan nota dan riwayat transaksi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yarbayar",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1226" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${sans.variable} ${display.variable} ${mono.variable} antialiased`}
    >

      {/*
        suppressHydrationWarning is required because some popular browser
        extensions (Bitdefender, Grammarly, ColorZilla, etc.) inject
        attributes like `bis_register`, `__processed_*`, `cz-shortcut-listen`
        on <body> before React hydrates. Those attribute changes are
        external and not something we can or should patch.
      */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
        <Toaster position="top-center" richColors closeButton />
        {/* Free in Vercel's Hobby tier; only ship in production. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
