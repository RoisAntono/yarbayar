import { PageHeader } from "@/components/layout/page-header";
import { CreateGroupForm } from "./create-group-form";

export const metadata = { title: "Buat Grup" };

export default function NewGroupPage() {
  return (
    <>
      <PageHeader title="Buat grup baru" back />
      <div className="px-4 py-4">
        <CreateGroupForm />
      </div>
    </>
  );
}
