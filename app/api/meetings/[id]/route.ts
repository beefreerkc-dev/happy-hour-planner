import { NextResponse } from "next/server";
import { calculateOptimalSlots, getSubmittedParticipants } from "@/lib/intersections";
import { getMeetingBundle } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { meeting, availability } = await getMeetingBundle(id);

  if (!meeting) {
    return NextResponse.json({ error: "Встреча не найдена." }, { status: 404 });
  }

  return NextResponse.json({
    meeting,
    availability,
    optimalSlots: calculateOptimalSlots(meeting, availability),
    submittedParticipants: getSubmittedParticipants(meeting, availability),
  });
}
