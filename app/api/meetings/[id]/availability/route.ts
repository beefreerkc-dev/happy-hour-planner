import { NextResponse } from "next/server";
import { PARTICIPANTS, SLOT_STEP_MINUTES } from "@/lib/constants";
import { addMinutes } from "@/lib/calendar";
import { getMeeting, replaceAvailability } from "@/lib/storage";
import type { AvailabilitySlot, Participant } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type IncomingSlot = {
  date: string;
  startTime: string;
};

function isParticipant(value: string): value is Participant {
  return PARTICIPANTS.includes(value as Participant);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const meeting = await getMeeting(id);

  if (!meeting) {
    return NextResponse.json({ error: "Встреча не найдена." }, { status: 404 });
  }

  const body = await request.json();
  const participant = String(body.participant || "");
  const selected: IncomingSlot[] = Array.isArray(body.slots) ? body.slots : [];

  if (!isParticipant(participant) || !meeting.participants.includes(participant)) {
    return NextResponse.json({ error: "Участник не приглашен на эту встречу." }, { status: 400 });
  }

  const slots: AvailabilitySlot[] = selected.map((slot) => ({
    meetingId: id,
    participant,
    date: String(slot.date),
    startTime: String(slot.startTime),
    endTime: addMinutes(String(slot.startTime), SLOT_STEP_MINUTES),
  }));

  await replaceAvailability(id, participant, slots);

  return NextResponse.json({ ok: true });
}
