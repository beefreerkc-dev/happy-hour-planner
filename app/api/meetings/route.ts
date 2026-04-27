import { NextResponse } from "next/server";
import { PARTICIPANTS } from "@/lib/constants";
import { getCurrentMonth } from "@/lib/calendar";
import { createMeeting } from "@/lib/storage";
import type { Meeting, Participant } from "@/lib/types";

function isParticipant(value: string): value is Participant {
  return PARTICIPANTS.includes(value as Participant);
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = String(body.title || "").trim();
  const durationMinutes = Number(body.durationMinutes);
  const participants = Array.isArray(body.participants)
    ? body.participants.filter(isParticipant)
    : [];

  if (!title || !durationMinutes || participants.length === 0) {
    return NextResponse.json(
      { error: "Нужны название, длительность и участники встречи." },
      { status: 400 },
    );
  }

  const { month, year } = getCurrentMonth();
  const meeting: Meeting = {
    id: crypto.randomUUID(),
    title,
    durationMinutes,
    participants,
    selectedSlot: null,
    createdAt: new Date().toISOString(),
    month,
    year,
  };

  await createMeeting(meeting);

  return NextResponse.json({ meeting });
}
