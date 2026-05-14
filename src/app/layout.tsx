import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
