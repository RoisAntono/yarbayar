import { LogOut, Mail, User as UserIcon } from "lucide-react";
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
      <PageHeader title="Profil" />
      <div className="px-4 py-4 space-y-5">
        <Card className="p-5 flex flex-col items-center text-center">
          <Avatar
            name={profile?.full_name ?? user.email ?? "U"}
            size="lg"
            className="size-20 text-2xl mb-3"
          />
          <h2 className="font-semibold text-lg">{profile?.full_name ?? "Pengguna"}</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] flex items-center gap-1 mt-0.5">
            <Mail className="size-3.5" />
            {user.email}
          </p>
        </Card>

        <Card className="divide-y divide-[var(--color-border)]">
          <Row icon={<UserIcon className="size-4" />} label="Mata uang" value={profile?.currency ?? "IDR"} />
        </Card>

        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="lg" className="w-full">
            <LogOut className="size-4" />
            Keluar
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--color-muted-foreground)]">
          Yarbayar · v0.1.0
        </p>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="size-8 rounded-lg bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)]">
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm">{label}</p>
      </div>
      <p className="text-sm text-[var(--color-muted-foreground)]">{value}</p>
    </div>
  );
}
