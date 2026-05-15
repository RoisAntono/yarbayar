import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 float-in">
          <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-[var(--color-ink)] text-[var(--color-on-ink)] text-2xl shadow-[var(--shadow-pop)]">
            💸
          </div>
          <h1 className="text-4xl tracking-tight">
            <span className="font-display-italic">Selamat datang</span>
            <br />
            <span className="font-medium">kembali.</span>
          </h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            Masuk ke Yarbayar untuk lanjut catat pengeluaran bareng teman.
          </p>
        </div>
        <LoginForm />
      </div>
      <p className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-semibold text-[var(--color-foreground)] underline-offset-4 hover:underline"
        >
          Daftar
        </Link>
      </p>
    </>
  );
}
