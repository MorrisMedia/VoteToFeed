import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createCalendarEvent, SLOT_MINUTES } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    purpose?: string;
    notes?: string;
    startISO?: string;
    endISO?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, email, phone, purpose, notes, startISO } = body;

  if (!name?.trim() || !email?.trim() || !startISO) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const startTime = new Date(startISO);
  if (isNaN(startTime.getTime())) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  const endTime = new Date(startTime.getTime() + SLOT_MINUTES * 60 * 1000);

  // Check for conflicting bookings in the database
  const conflict = await prisma.booking.findFirst({
    where: {
      status: { not: "CANCELLED" },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "This time slot is no longer available. Please choose another." },
      { status: 409 }
    );
  }

  // Create Google Calendar event (non-blocking if credentials missing)
  const googleEventId = await createCalendarEvent({
    summary: `Booking: ${name.trim()}`,
    description: [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      phone ? `Phone: ${phone.trim()}` : null,
      purpose ? `Purpose: ${purpose.trim()}` : null,
      notes ? `Notes: ${notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    startISO: startTime.toISOString(),
    endISO: endTime.toISOString(),
    attendeeEmail: email.trim().toLowerCase(),
    attendeeName: name.trim(),
  });

  const booking = await prisma.booking.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      purpose: purpose?.trim() || null,
      notes: notes?.trim() || null,
      startTime,
      endTime,
      status: "CONFIRMED",
      googleEventId,
    },
  });

  return NextResponse.json({ id: booking.id }, { status: 201 });
}
