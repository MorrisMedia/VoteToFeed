import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AnalyticsHealthClient } from "@/components/admin/AnalyticsHealthClient";
import { getInternalAnalyticsDashboardData } from "@/lib/internal-analytics";

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const analytics = await getInternalAnalyticsDashboardData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <AdminSectionNav currentPath="/admin/analytics" />

      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-surface-500 mt-1">First-party traffic + paid reporting from VoteToFeed’s own stack.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Landings (14d)" value={analytics.overview.landings14d} />
        <MetricCard label="Signups (7d)" value={analytics.overview.signups7d} />
        <MetricCard label="Entries (7d)" value={analytics.overview.entries7d} />
        <MetricCard label="Votes (7d)" value={analytics.overview.votes7d} />
        <MetricCard label="Purchases (7d)" value={analytics.overview.purchases7d} />
        <MetricCard label="Revenue (7d)" value={`$${analytics.overview.revenue7d.toFixed(2)}`} />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-surface-900">Agent-facing results</h2>
            <p className="text-sm text-surface-500 mt-1">This page is now powered by VoteToFeed’s own database-backed analytics, so humans and agents can use the same source.</p>
          </div>
          <div className="text-xs font-bold uppercase tracking-wide text-emerald-600">Internal analytics live</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DataTable
          title="Traffic + paid summary (14d)"
          subtitle="Grouped by source / medium / campaign."
          headers={["Source", "Medium", "Campaign", "Landings", "Signups", "Entries", "Votes", "Checkouts", "Purchases"]}
          rows={analytics.trafficSummary.map((row) => [
            String(row.utm_source ?? ""),
            String(row.utm_medium ?? ""),
            String(row.utm_campaign ?? ""),
            String(row.landings ?? 0),
            String(row.signups ?? 0),
            String(row.pet_entries ?? 0),
            String(row.votes ?? 0),
            String(row.checkouts ?? 0),
            String(row.purchases ?? 0),
          ])}
        />

        <DataTable
          title="Funnel event totals (7d)"
          subtitle="How many times each tracked event fired and how many unique people triggered it."
          headers={["Event", "Total", "Unique people"]}
          rows={analytics.funnelSummary.map((row) => [
            String(row.event ?? ""),
            String(row.total_events ?? 0),
            String(row.unique_people ?? 0),
          ])}
          monoFirstColumn
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DataTable
          title="Recent paid conversions (14d)"
          subtitle="Latest checkout completions with campaign data."
          headers={["Time (UTC)", "Source", "Campaign", "Tier", "$", "Votes"]}
          rows={analytics.recentPurchases.map((row) => [
            String(row.happened_at_utc ?? ""),
            String(row.utm_source ?? ""),
            String(row.utm_campaign ?? ""),
            String(row.package_tier ?? ""),
            String(row.amount_dollars ?? ""),
            String(row.votes ?? ""),
          ])}
        />

        <DataTable
          title="Recent tracked events (3d)"
          subtitle="Useful for debugging what traffic is doing right now."
          headers={["Time (UTC)", "Event", "Source", "Campaign", "Type", "Tier"]}
          rows={analytics.recentEvents.map((row) => [
            String(row.happened_at_utc ?? ""),
            String(row.event ?? ""),
            String(row.utm_source ?? ""),
            String(row.utm_campaign ?? ""),
            String(row.event_type ?? ""),
            String(row.package_tier ?? ""),
          ])}
          monoSecondColumn
        />
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

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-surface-900 mt-2">{value}</p>
    </div>
  );
}

function DataTable({
  title,
  subtitle,
  headers,
  rows,
  monoFirstColumn,
  monoSecondColumn,
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
  monoFirstColumn?: boolean;
  monoSecondColumn?: boolean;
}) {
  return (
    <div className="card p-5 overflow-hidden">
      <h2 className="text-lg font-bold text-surface-900">{title}</h2>
      <p className="text-sm text-surface-500 mt-1">{subtitle}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-surface-400 border-b border-surface-100">
              {headers.map((header) => (
                <th key={header} className="py-2 pr-4">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`} className="border-b border-surface-50 text-surface-700">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${title}-${rowIndex}-${cellIndex}`}
                    className={`py-2 pr-4 ${
                      (monoFirstColumn && cellIndex === 0) || (monoSecondColumn && cellIndex === 1)
                        ? "font-mono text-xs"
                        : ""
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={headers.length} className="py-6 text-sm text-surface-400">No data yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
