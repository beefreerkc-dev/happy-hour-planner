import { describe, expect, it } from "vitest";
import { buildRollingWeeks } from "./calendar";
import { calculateOptimalSlots } from "./intersections";
import type { AvailabilitySlot, Meeting } from "./types";

describe("calculateOptimalSlots", () => {
  it("returns slots available for every submitted participant", () => {
    const date = buildRollingWeeks()[0].days[0].date;
    const meeting: Meeting = {
      id: "meeting-1",
      title: "Planning",
      durationMinutes: 60,
      participants: ["Яна", "Влад"],
      selectedSlot: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      month: 1,
      year: 2026,
    };
    const availability: AvailabilitySlot[] = [
      { meetingId: meeting.id, participant: "Яна", date, startTime: "10:00", endTime: "10:30" },
      { meetingId: meeting.id, participant: "Яна", date, startTime: "10:30", endTime: "11:00" },
      { meetingId: meeting.id, participant: "Яна", date, startTime: "11:00", endTime: "11:30" },
      { meetingId: meeting.id, participant: "Влад", date, startTime: "10:00", endTime: "10:30" },
      { meetingId: meeting.id, participant: "Влад", date, startTime: "10:30", endTime: "11:00" },
    ];

    expect(calculateOptimalSlots(meeting, availability)).toEqual([
      {
        date,
        startTime: "10:00",
        endTime: "11:00",
        participantCount: 2,
      },
    ]);
  });
});
