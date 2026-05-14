import Link from "next/link";
import { Database, ExternalLink, Settings2, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Setup Supabase" };

export default function SetupPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-[var(--color-background)] via-[var(--color-background)] to-[color-mix(in_oklab,var(--color-primary),var(--color-background)_82%)] px-4 py-10">
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center space-y-2">
          <div className="size-16 rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] grid place-items-center text-2xl mx-auto shadow-[var(--shadow-pop)]">
            <Settings2 className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Setup Supabase
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Yarbayar butuh koneksi Supabase agar bisa menyimpan data kamu.
            Tiga langkah cepat di bawah.
          </p>
        </div>

        <Card className="p-5 space-y-4">
          <Step
            n={1}
            title="Buat project Supabase"
            body={
              <>
                Buka{" "}
                <a
                  href="https://supabase.com/dashboard/projects"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] font-medium inline-flex items-center gap-1"
                >
                  Supabase Dashboard
                  <ExternalLink className="size-3.5" />
                </a>{" "}
                lalu klik <strong>New project</strong>. Region terdekat dari
                Indonesia: Singapore.
              </>
            }
          />

          <Step
            n={2}
            title="Salin URL & API key"
            body={
              <>
                Setelah project siap, masuk ke{" "}
                <strong>Project Settings → API</strong>. Salin{" "}
                <code className="bg-[var(--color-muted)] px-1.5 py-0.5 rounded text-xs">
                  Project URL
                </code>{" "}
                dan{" "}
                <code className="bg-[var(--color-muted)] px-1.5 py-0.5 rounded text-xs">
                  anon public
                </code>{" "}
                key, lalu buat file{" "}
                <code className="bg-[var(--color-muted)] px-1.5 py-0.5 rounded text-xs">
                  .env.local
                </code>{" "}
                di root project:
                <pre className="mt-2 text-xs bg-[var(--color-muted)] rounded-lg p-3 overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
                </pre>
              </>
            }
          />

          <Step
            n={3}
            title="Jalankan migrasi SQL"
            body={
              <>
                Buka <strong>SQL Editor</strong> di dashboard, salin–tempel
                isi file{" "}
                <code className="bg-[var(--color-muted)] px-1.5 py-0.5 rounded text-xs">
                  supabase/migrations/0001_init.sql
                </code>{" "}
                lalu klik <strong>Run</strong>. Skema, policy RLS, dan bucket{" "}
                <code className="bg-[var(--color-muted)] px-1.5 py-0.5 rounded text-xs">
                  receipts
                </code>{" "}
                akan dibuat otomatis.
              </>
            }
          />
        </Card>

        <Card className="p-4 flex items-start gap-3">
          <span className="size-8 rounded-lg bg-[var(--color-muted)] grid place-items-center shrink-0 text-[var(--color-muted-foreground)]">
            <Terminal className="size-4" />
          </span>
          <div className="text-sm space-y-1">
            <p className="font-medium">Sudah selesai?</p>
            <p className="text-[var(--color-muted-foreground)]">
              Stop dev server (Ctrl+C) lalu jalankan{" "}
              <code className="bg-[var(--color-muted)] px-1.5 py-0.5 rounded text-xs">
                npm run dev
              </code>{" "}
              lagi supaya env-nya kebaca.
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-[var(--color-muted-foreground)] flex items-center justify-center gap-1">
          <Database className="size-3.5" />
          Lihat <Link href="/" className="underline">README.md</Link> untuk panduan lengkap & deploy ke Vercel.
        </p>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="size-7 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold grid place-items-center shrink-0 mt-0.5">
        {n}
      </span>
      <div className="space-y-1 flex-1 min-w-0">
        <h3 className="font-semibold leading-tight">{title}</h3>
        <div className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          {body}
        </div>
      </div>
    </div>
  );
}
