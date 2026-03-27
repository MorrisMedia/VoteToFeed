import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminSectionNav } from "@/components/admin/AdminSectionNav";
import { TIMEZONE } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const bookings = await prisma.booking.findMany({
    orderBy: { startTime: "desc" },
    take: 100,
  });

  const now = new Date();

  const upcoming = bookings.filter((b) => b.startTime >= now && b.status !== "CANCELLED");
  const past = bookings.filter((b) => b.startTime < now || b.status === "CANCELLED");

  function formatDT(d: Date) {
    return d.toLocaleString("en-US", {
      timeZone: TIMEZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function statusBadge(status: string, startTime: Date) {
    if (status === "CANCELLED") return { label: "Cancelled", cls: "bg-red-100 text-red-700" };
    if (startTime < now) return { label: "Completed", cls: "bg-surface-100 text-surface-600" };
    return { label: "Confirmed", cls: "bg-emerald-100 text-emerald-700" };
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <AdminSectionNav currentPath="/admin/bookings" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Bookings</h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {upcoming.length} upcoming · {past.length} past/cancelled
          </p>
        </div>
        <a
          href="/book"
          target="_blank"
          className="btn-secondary text-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open booking page
        </a>
      </div>

      {/* Upcoming */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="card p-8 text-center text-surface-400 text-sm">No upcoming bookings.</div>
        ) : (
          <div className="card divide-y divide-surface-100 overflow-hidden">
            {upcoming.map((b) => {
              const badge = statusBadge(b.status, b.startTime);
              return (
                <div key={b.id} className="flex items-start gap-4 px-5 py-4">
                  {/* Date block */}
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="text-xs font-semibold text-surface-400 uppercase">
                      {b.startTime.toLocaleDateString("en-US", { timeZone: TIMEZONE, month: "short" })}
                    </div>
                    <div className="text-2xl font-bold text-surface-900 leading-tight">
                      {b.startTime.toLocaleDateString("en-US", { timeZone: TIMEZONE, day: "numeric" })}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-surface-900">{b.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-sm text-surface-500 mt-0.5">{formatDT(b.startTime)}</div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-surface-600">
                      <a href={`mailto:${b.email}`} className="hover:text-brand-600 hover:underline">{b.email}</a>
                      {b.phone && <span>{b.phone}</span>}
                      {b.purpose && <span className="text-surface-400">· {b.purpose}</span>}
                    </div>
                    {b.notes && (
                      <div className="mt-1.5 text-xs text-surface-500 bg-surface-50 rounded-lg px-3 py-1.5 max-w-lg">
                        {b.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-2">
                    <a
                      href={`mailto:${b.email}?subject=Your booking on ${b.startTime.toLocaleDateString("en-US", { timeZone: TIMEZONE, month: "long", day: "numeric" })}`}
                      className="btn-secondary text-xs px-3 py-1.5 min-h-0"
                    >
                      Email
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past / Cancelled */}
      <section>
        <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-3">Past & Cancelled</h2>
        {past.length === 0 ? (
          <div className="card p-8 text-center text-surface-400 text-sm">No past bookings.</div>
        ) : (
          <div className="card divide-y divide-surface-100 overflow-hidden">
            {past.map((b) => {
              const badge = statusBadge(b.status, b.startTime);
              return (
                <div key={b.id} className="flex items-start gap-4 px-5 py-4 opacity-70">
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="text-xs font-semibold text-surface-400 uppercase">
                      {b.startTime.toLocaleDateString("en-US", { timeZone: TIMEZONE, month: "short" })}
                    </div>
                    <div className="text-2xl font-bold text-surface-700 leading-tight">
                      {b.startTime.toLocaleDateString("en-US", { timeZone: TIMEZONE, day: "numeric" })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-surface-700">{b.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-sm text-surface-400 mt-0.5">{formatDT(b.startTime)}</div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-surface-500">
                      <span>{b.email}</span>
                      {b.phone && <span>{b.phone}</span>}
                      {b.purpose && <span>· {b.purpose}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
