import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AdminEmailsClient } from "./AdminEmailsClient";

export default async function AdminEmailsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <AdminSectionNav currentPath="/admin/emails" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <AdminEmailsClient />
      </div>
    </>
  );
}
