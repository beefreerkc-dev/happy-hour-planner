import { NextResponse } from "next/server";
import { selectFinalSlot } from "@/lib/storage";
import type { SlotCandidate } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const selectedSlot = body.selectedSlot ? (body.selectedSlot as SlotCandidate) : null;
  const meeting = await selectFinalSlot(id, selectedSlot);

  if (!meeting) {
    return NextResponse.json({ error: "Встреча не найдена." }, { status: 404 });
  }

  return NextResponse.json({ meeting });
}
