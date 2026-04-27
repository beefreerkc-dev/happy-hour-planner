import { SLOT_STEP_MINUTES } from "./constants";
import { addMinutes, buildRollingWeeks, buildStartTimes, timeToMinutes } from "./calendar";
import type { AvailabilitySlot, Meeting, Participant, SlotCandidate } from "./types";

function slotKey(date: string, startTime: string) {
  return `${date}|${startTime}`;
}

export function getSubmittedParticipants(
  meeting: Meeting,
  availability: AvailabilitySlot[],
) {
  const submitted = new Set(availability.map((slot) => slot.participant));
  return meeting.participants.filter((participant) => submitted.has(participant));
}

export function calculateOptimalSlots(
  meeting: Meeting,
  availability: AvailabilitySlot[],
): SlotCandidate[] {
  const submittedParticipants = getSubmittedParticipants(meeting, availability);

  if (submittedParticipants.length === 0) {
    return [];
  }

  const availabilityByParticipant = new Map<Participant, Set<string>>();

  for (const participant of submittedParticipants) {
    availabilityByParticipant.set(participant, new Set());
  }

  for (const slot of availability) {
    if (!availabilityByParticipant.has(slot.participant)) {
      continue;
    }

    availabilityByParticipant.get(slot.participant)?.add(slotKey(slot.date, slot.startTime));
  }

  const weeks = buildRollingWeeks();
  const dayKeys = weeks.flatMap((week) => week.days.map((day) => day.date));
  const starts = buildStartTimes(meeting.durationMinutes);
  const neededSteps = meeting.durationMinutes / SLOT_STEP_MINUTES;
  const candidates: SlotCandidate[] = [];

  for (const date of dayKeys) {
    for (const startTime of starts) {
      const requiredStartTimes = Array.from({ length: neededSteps }, (_, index) =>
        addMinutes(startTime, index * SLOT_STEP_MINUTES),
      );

      const everySubmittedParticipantAvailable = submittedParticipants.every((participant) => {
        const participantSlots = availabilityByParticipant.get(participant);
        return requiredStartTimes.every((time) => participantSlots?.has(slotKey(date, time)));
      });

      if (everySubmittedParticipantAvailable) {
        candidates.push({
          date,
          startTime,
          endTime: addMinutes(startTime, meeting.durationMinutes),
          participantCount: submittedParticipants.length,
        });
      }
    }
  }

  return candidates.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }

    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });
}

export function isSlotInsideCandidate(
  date: string,
  startTime: string,
  candidate: SlotCandidate,
) {
  const slotStart = timeToMinutes(startTime);
  return (
    date === candidate.date &&
    slotStart >= timeToMinutes(candidate.startTime) &&
    slotStart < timeToMinutes(candidate.endTime)
  );
}
