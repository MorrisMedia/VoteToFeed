import { google } from "googleapis";

const TIMEZONE = process.env.BOOKING_TIMEZONE || "America/New_York";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";
const SLOT_MINUTES = Number(process.env.BOOKING_SLOT_MINUTES) || 30;
const DAY_START = Number(process.env.BOOKING_DAY_START_HOUR) || 9;
const DAY_END = Number(process.env.BOOKING_DAY_END_HOUR) || 17;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) return null;
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
}

/**
 * Convert a wall-clock time in TIMEZONE to a UTC Date.
 * e.g. "2026-03-27", 9, 0 in "America/New_York" → 2026-03-27T13:00:00Z
 */
function wallToUTC(date: string, hour: number, minute: number): Date {
  // Treat the wall-clock time as if it were UTC to create a reference point
  const ref = new Date(
    Date.UTC(
      parseInt(date.slice(0, 4)),
      parseInt(date.slice(5, 7)) - 1,
      parseInt(date.slice(8, 10)),
      hour,
      minute,
      0
    )
  );

  // Get what `ref` (a UTC time) looks like in TIMEZONE
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(ref)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, parseInt(p.value)])
  ) as Record<string, number>;

  // Build the "local-clock-as-UTC" from those parts
  const localAsUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second
  );

  // offset = localTime - UTCTime  →  actualUTC = wallClock - offset
  const offsetMs = localAsUTC - ref.getTime();
  return new Date(ref.getTime() - offsetMs);
}

function isWeekend(date: string): boolean {
  const d = new Date(date + "T12:00:00Z");
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(d);
  return weekday === "Sat" || weekday === "Sun";
}

export { isWeekend, TIMEZONE, SLOT_MINUTES };

export async function getAvailableSlots(
  date: string
): Promise<{ time: string; iso: string }[]> {
  if (isWeekend(date)) return [];

  // Generate all possible time slots for the day
  const slots: { time: string; iso: string; utcDate: Date }[] = [];
  for (let h = DAY_START; h < DAY_END; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const utcDate = wallToUTC(date, h, m);
      const timeLabel = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(utcDate);
      slots.push({ time: timeLabel, iso: utcDate.toISOString(), utcDate });
    }
  }

  const auth = getAuth();
  if (!auth) {
    // No Google credentials – return all slots as available
    return slots.map(({ time, iso }) => ({ time, iso }));
  }

  const calendar = google.calendar({ version: "v3", auth });
  const dayStart = wallToUTC(date, DAY_START, 0);
  const dayEnd = wallToUTC(date, DAY_END, 0);

  let busy: { start?: string | null; end?: string | null }[] = [];
  try {
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: CALENDAR_ID }],
      },
    });
    busy = fb.data.calendars?.[CALENDAR_ID]?.busy || [];
  } catch {
    // If calendar API fails, return all slots
    return slots.map(({ time, iso }) => ({ time, iso }));
  }

  return slots
    .filter(({ utcDate }) => {
      const slotEnd = new Date(utcDate.getTime() + SLOT_MINUTES * 60000);
      return !busy.some((b) => {
        if (!b.start || !b.end) return false;
        const busyStart = new Date(b.start);
        const busyEnd = new Date(b.end);
        return utcDate < busyEnd && slotEnd > busyStart;
      });
    })
    .map(({ time, iso }) => ({ time, iso }));
}

export async function createCalendarEvent(params: {
  summary: string;
  description: string;
  startISO: string;
  endISO: string;
  attendeeEmail: string;
  attendeeName: string;
}): Promise<string | null> {
  const auth = getAuth();
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth });
  try {
    const event = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      sendNotifications: true,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startISO, timeZone: TIMEZONE },
        end: { dateTime: params.endISO, timeZone: TIMEZONE },
        attendees: [
          { email: params.attendeeEmail, displayName: params.attendeeName },
        ],
      },
    });
    return event.data.id || null;
  } catch {
    return null;
  }
}
