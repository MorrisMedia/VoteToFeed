import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AnalyticsHealthClient } from "@/components/admin/AnalyticsHealthClient";

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <AdminSectionNav currentPath="/admin/analytics" />

      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-surface-500 mt-1">One page to verify config, client scripts, and attribution state.</p>
      </div>

      <AnalyticsHealthClient
        config={{
          appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://votetofeed.com",
          clarityConfigured: Boolean(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID),
          posthogConfigured: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
          metaConfigured: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
        }}
      />
    </div>
  );
}
