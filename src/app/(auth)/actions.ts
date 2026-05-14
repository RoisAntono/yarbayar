"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string; full_name?: string };
} | undefined;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<AuthState>["fieldErrors"] = {};
  if (!isValidEmail(email)) fieldErrors.email = "Email tidak valid";
  if (password.length < 6) fieldErrors.password = "Minimal 6 karakter";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
      return {
        error:
          "Email belum diverifikasi. Cek inbox kamu, atau matikan opsi 'Confirm email' di Supabase → Authentication → Providers → Email.",
      };
    }
    if (msg.includes("invalid login")) {
      return { error: "Email atau password salah" };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<AuthState>["fieldErrors"] = {};
  if (full_name.length < 2) fieldErrors.full_name = "Nama minimal 2 karakter";
  if (!isValidEmail(email)) fieldErrors.email = "Email tidak valid";
  if (password.length < 6) fieldErrors.password = "Minimal 6 karakter";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Email sudah terdaftar, silakan masuk" };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
