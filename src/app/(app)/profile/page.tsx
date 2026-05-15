import { ChevronRight, Coins, LogOut, Mail } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { logoutAction } from "@/app/(auth)/actions";
import { getCurrentUser, getProfile } from "@/lib/data";

export const metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await getProfile(user.id);

  return (
    <>
      <PageHeader title="Saya" />
      <div className="space-y-5 px-4 py-4">
        {/* Identity card with aurora */}
        <Card className="aurora grain relative overflow-hidden border-0 p-6 text-center text-[var(--color-on-ink)] float-in">
          <div className="relative z-[2] flex flex-col items-center">
            <Avatar
              name={profile?.full_name ?? user.email ?? "U"}
              size="lg"
              className="mb-3 size-20 text-2xl shadow-[var(--shadow-pop)] ring-4 ring-white/10"
            />
            <h2 className="text-xl tracking-tight">
              <span className="font-display-italic">Halo,</span>{" "}
              <span className="font-medium">
                {(profile?.full_name ?? "Pengguna").split(" ")[0]}
              </span>
            </h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs opacity-75">
              <Mail className="size-3.5" />
              {user.email}
            </p>
          </div>
        </Card>

        {/* Settings rows */}
        <Card className="overflow-hidden">
          <SettingsRow
            icon={<Coins className="size-4" />}
            label="Mata uang"
            value={profile?.currency ?? "IDR"}
          />
        </Card>

        {/* Logout */}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="w-full gap-2 text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
          >
            <LogOut className="size-4" />
            Keluar
          </Button>
        </form>

        <p className="text-center font-display-italic text-xs text-[var(--color-muted-foreground)]/70">
          Yarbayar · v0.1.0
        </p>
      </div>
    </>
  );
}

function SettingsRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="tabular text-sm text-[var(--color-muted-foreground)]">{value}</p>
      <ChevronRight className="size-4 text-[var(--color-muted-foreground)]/50" />
    </div>
  );
}
