"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function MonthCalendar({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function toDateStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function isPast(d: number) {
    return new Date(year, month, d) < today;
  }

  function isWeekend(d: number) {
    const day = new Date(year, month, d).getDay();
    return day === 0 || day === 6;
  }

  const cells = Array.from({ length: firstDayOfWeek + daysInMonth }, (_, i) =>
    i < firstDayOfWeek ? null : i - firstDayOfWeek + 1
  );

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="font-semibold text-surface-900">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-surface-100 transition-colors"
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-surface-500 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;
          const dateStr = toDateStr(d);
          const disabled = isPast(d) || isWeekend(d);
          const isSelected = selected === dateStr;
          const isToday = new Date(year, month, d).getTime() === today.getTime();

          return (
            <button
              key={dateStr}
              disabled={disabled}
              onClick={() => !disabled && onSelect(dateStr)}
              className={[
                "h-9 w-full rounded-lg text-sm font-medium transition-colors relative",
                disabled
                  ? "text-surface-300 cursor-default"
                  : "hover:bg-brand-50 text-surface-800 cursor-pointer",
                isSelected
                  ? "!bg-brand-500 !text-white hover:!bg-brand-600"
                  : "",
                isToday && !isSelected
                  ? "ring-1 ring-brand-400 ring-inset"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Slot = { time: string; iso: string };

export default function BookPage() {
  const router = useRouter();
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    purpose: "",
    notes: "",
  });

  const fetchSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/bookings/slots?date=${date}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  function formatSelectedDate(dateStr: string) {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          purpose: form.purpose || undefined,
          notes: form.notes || undefined,
          startISO: selectedSlot.iso,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      router.push(`/book/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-900">Book an Appointment</h1>
        <p className="text-surface-600 mt-1.5">
          Pick a date and time — we&apos;ll get back to you with a confirmation.
        </p>
      </div>

      {/* Step: Pick date & time */}
      {step === "pick" && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div className="card p-6">
              <h2 className="text-base font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Select a Date
              </h2>
              <MonthCalendar selected={selectedDate} onSelect={setSelectedDate} />
              <p className="text-xs text-surface-400 mt-3">Weekends unavailable · Mon–Fri only</p>
            </div>

            {/* Time slots */}
            <div className="card p-6">
              <h2 className="text-base font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {selectedDate
                  ? `Times for ${formatSelectedDate(selectedDate)}`
                  : "Available Times"}
              </h2>

              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center h-36 text-surface-400">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p className="text-sm">Pick a date first</p>
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center gap-2 text-surface-500 text-sm h-36 justify-center">
                  <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  Checking availability…
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-surface-400">
                  <p className="text-sm">No available slots for this date.</p>
                  <p className="text-xs mt-1">Try a different day.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1 hide-scrollbar">
                  {slots.map((slot) => (
                    <button
                      key={slot.iso}
                      onClick={() => setSelectedSlot(slot)}
                      className={[
                        "py-2 px-2 rounded-lg text-sm font-medium transition-all border",
                        selectedSlot?.iso === slot.iso
                          ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                          : "border-surface-200 text-surface-700 hover:border-brand-300 hover:bg-brand-50",
                      ].join(" ")}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Continue button */}
          {selectedDate && selectedSlot && (
            <div className="mt-6 flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-brand-900">
                  {formatSelectedDate(selectedDate)} at {selectedSlot.time}
                </p>
                <p className="text-xs text-brand-700 mt-0.5">30-minute appointment</p>
              </div>
              <button
                onClick={() => setStep("form")}
                className="btn-primary"
              >
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14m0 0l-7-7m7 7l-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* Step: Fill in details */}
      {step === "form" && (
        <div className="max-w-xl">
          <button
            onClick={() => setStep("pick")}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mb-6 font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5m0 0l7 7m-7-7l7 7" />
            </svg>
            Change date or time
          </button>

          {/* Selected slot summary */}
          <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-5 py-3.5 mb-6">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-brand-900">
                {selectedDate && formatSelectedDate(selectedDate)}
              </p>
              <p className="text-xs text-brand-700">{selectedSlot?.time} · 30 minutes</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5" htmlFor="booking-name">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="booking-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5" htmlFor="booking-email">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="booking-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input-field"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5" htmlFor="booking-phone">
                Phone <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <input
                id="booking-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="input-field"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5" htmlFor="booking-purpose">
                Purpose of meeting <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <input
                id="booking-purpose"
                type="text"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                className="input-field"
                placeholder="e.g. Contest inquiry, sponsorship, general question…"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5" htmlFor="booking-notes">
                Additional notes <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="booking-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field resize-none"
                placeholder="Anything else you'd like to share…"
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Confirming booking…
                </>
              ) : (
                "Confirm Booking"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
