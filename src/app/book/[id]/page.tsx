import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { TIMEZONE } from "@/lib/google-calendar";

export default async function BookingConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      startTime: true,
      endTime: true,
      purpose: true,
      status: true,
    },
  });

  if (!booking) notFound();

  const dateStr = booking.startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: TIMEZONE,
  });

  const startStr = booking.startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  });

  const endStr = booking.endTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  });

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: booking.name },
    { label: "Email", value: booking.email },
    { label: "Date", value: dateStr },
    { label: "Time", value: `${startStr} – ${endStr}` },
    ...(booking.purpose ? [{ label: "Purpose", value: booking.purpose }] : []),
    { label: "Booking ID", value: booking.id },
  ];

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      {/* Success icon */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">
          You&apos;re booked!
        </h1>
        <p className="text-surface-600 text-sm leading-relaxed">
          A calendar invite has been sent to{" "}
          <span className="font-semibold text-surface-800">{booking.email}</span>.
          We look forward to speaking with you.
        </p>
      </div>

      {/* Booking details */}
      <div className="card p-5 mb-6 divide-y divide-surface-100">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-start py-3 first:pt-0 last:pb-0 gap-4">
            <span className="text-sm text-surface-500 flex-shrink-0">{label}</span>
            <span
              className={[
                "text-sm font-medium text-surface-900 text-right",
                label === "Booking ID" ? "font-mono text-xs text-surface-500 break-all" : "",
              ].join(" ")}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="btn-primary flex-1 justify-center">
          Back to VoteToFeed
        </Link>
        <Link href="/book" className="btn-secondary flex-1 justify-center">
          Book another
        </Link>
      </div>
    </div>
  );
}
