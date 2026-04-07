import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AdminEngagementManagement } from "./AdminEngagementManagement";

export default async function AdminEngagementPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <AdminSectionNav currentPath="/admin/engagement" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <AdminEngagementManagement />
      </div>
    </>
  );
}
