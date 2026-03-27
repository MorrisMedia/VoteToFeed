import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json(booking);
}
