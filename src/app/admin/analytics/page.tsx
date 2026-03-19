import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { AnalyticsHealthClient } from "@/components/admin/AnalyticsHealthClient";
import { getAdminAnalyticsData } from "@/lib/posthog-admin";

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const analytics = await getAdminAnalyticsData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <AdminSectionNav currentPath="/admin/analytics" />

      <div>
        <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Analytics</h1>
        <p className="text-sm text-surface-500 mt-1">One page to verify config, client scripts, and traffic results.</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-surface-900">Agent-facing results</h2>
            <p className="text-sm text-surface-500 mt-1">This is the same summary layer the agent should use for traffic and paid performance.</p>
          </div>
          <div className={`text-xs font-bold uppercase tracking-wide ${analytics.enabled ? "text-emerald-600" : "text-amber-600"}`}>
            {analytics.enabled ? "Live PostHog data" : "Waiting on PostHog admin API"}
          </div>
        </div>

        {!analytics.enabled ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p><strong>PostHog aggregate queries are not active yet.</strong></p>
            <p className="mt-1">{analytics.reason}</p>
            <p className="mt-1">Expected host: {analytics.host}</p>
          </div>
        ) : null}
      </div>

      {analytics.enabled && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card p-5 overflow-hidden">
              <h2 className="text-lg font-bold text-surface-900">Traffic + paid summary (14d)</h2>
              <p className="text-sm text-surface-500 mt-1">Grouped by source / medium / campaign.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-surface-400 border-b border-surface-100">
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4">Medium</th>
                      <th className="py-2 pr-4">Campaign</th>
                      <th className="py-2 pr-4 text-right">Landings</th>
                      <th className="py-2 pr-4 text-right">Signups</th>
                      <th className="py-2 pr-4 text-right">Entries</th>
                      <th className="py-2 pr-4 text-right">Votes</th>
                      <th className="py-2 pr-4 text-right">Checkouts</th>
                      <th className="py-2 text-right">Purchases</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.trafficSummary.map((row, index) => (
                      <tr key={`${row.utm_source}-${row.utm_campaign}-${index}`} className="border-b border-surface-50 text-surface-700">
                        <td className="py-2 pr-4">{String(row.utm_source ?? "")}</td>
                        <td className="py-2 pr-4">{String(row.utm_medium ?? "")}</td>
                        <td className="py-2 pr-4">{String(row.utm_campaign ?? "")}</td>
                        <td className="py-2 pr-4 text-right">{String(row.landings ?? 0)}</td>
                        <td className="py-2 pr-4 text-right">{String(row.signups ?? 0)}</td>
                        <td className="py-2 pr-4 text-right">{String(row.pet_entries ?? 0)}</td>
                        <td className="py-2 pr-4 text-right">{String(row.votes ?? 0)}</td>
                        <td className="py-2 pr-4 text-right">{String(row.checkouts ?? 0)}</td>
                        <td className="py-2 text-right font-semibold text-surface-900">{String(row.purchases ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-5 overflow-hidden">
              <h2 className="text-lg font-bold text-surface-900">Funnel event totals (7d)</h2>
              <p className="text-sm text-surface-500 mt-1">How many times each tracked event fired and how many unique people triggered it.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-surface-400 border-b border-surface-100">
                      <th className="py-2 pr-4">Event</th>
                      <th className="py-2 pr-4 text-right">Total</th>
                      <th className="py-2 text-right">Unique people</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.funnelSummary.map((row, index) => (
                      <tr key={`${row.event}-${index}`} className="border-b border-surface-50 text-surface-700">
                        <td className="py-2 pr-4 font-mono text-xs">{String(row.event ?? "")}</td>
                        <td className="py-2 pr-4 text-right">{String(row.total_events ?? 0)}</td>
                        <td className="py-2 text-right">{String(row.unique_people ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card p-5 overflow-hidden">
              <h2 className="text-lg font-bold text-surface-900">Recent paid conversions (14d)</h2>
              <p className="text-sm text-surface-500 mt-1">Latest `checkout_completed` events with campaign data.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-surface-400 border-b border-surface-100">
                      <th className="py-2 pr-4">Time (UTC)</th>
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4">Campaign</th>
                      <th className="py-2 pr-4">Tier</th>
                      <th className="py-2 pr-4 text-right">$</th>
                      <th className="py-2 text-right">Votes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentPurchases.map((row, index) => (
                      <tr key={`${row.happened_at_utc}-${row.distinct_id}-${index}`} className="border-b border-surface-50 text-surface-700">
                        <td className="py-2 pr-4">{String(row.happened_at_utc ?? "")}</td>
                        <td className="py-2 pr-4">{String(row.utm_source ?? "")}</td>
                        <td className="py-2 pr-4">{String(row.utm_campaign ?? "")}</td>
                        <td className="py-2 pr-4">{String(row.package_tier ?? "")}</td>
                        <td className="py-2 pr-4 text-right">{String(row.amount_dollars ?? "")}</td>
                        <td className="py-2 text-right">{String(row.votes ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-5 overflow-hidden">
              <h2 className="text-lg font-bold text-surface-900">Recent tracked events (3d)</h2>
              <p className="text-sm text-surface-500 mt-1">Useful for debugging what traffic is doing right now.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-surface-400 border-b border-surface-100">
                      <th className="py-2 pr-4">Time (UTC)</th>
                      <th className="py-2 pr-4">Event</th>
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4">Campaign</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentEvents.map((row, index) => (
                      <tr key={`${row.happened_at_utc}-${row.event}-${index}`} className="border-b border-surface-50 text-surface-700">
                        <td className="py-2 pr-4">{String(row.happened_at_utc ?? "")}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{String(row.event ?? "")}</td>
                        <td className="py-2 pr-4">{String(row.utm_source ?? "")}</td>
                        <td className="py-2 pr-4">{String(row.utm_campaign ?? "")}</td>
                        <td className="py-2 pr-4">{String(row.vote_type || row.pet_type || "")}</td>
                        <td className="py-2">{String(row.package_tier ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

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
