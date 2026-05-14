import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <>
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <div className="size-14 rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] grid place-items-center text-2xl shadow-[var(--shadow-pop)] mb-5">
            💸
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Selamat datang kembali</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            Masuk ke Yarbayar untuk lanjut catat pengeluaran bareng teman.
          </p>
        </div>
        <LoginForm />
      </div>
      <p className="text-center text-sm text-[var(--color-muted-foreground)] py-6">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--color-primary)]"
        >
          Daftar
        </Link>
      </p>
    </>
  );
}
