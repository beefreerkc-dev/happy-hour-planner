export type Participant =
  | "Яна"
  | "Лена Н"
  | "Лена Ю"
  | "Влад"
  | "Женя"
  | "Андрей"
  | "Антон"
  | "Вова"
  | "Саша"
  | "Никита";

export type Meeting = {
  id: string;
  title: string;
  durationMinutes: number;
  participants: Participant[];
  selectedSlot: SlotCandidate | null;
  createdAt: string;
  month: number;
  year: number;
};

export type AvailabilitySlot = {
  meetingId: string;
  participant: Participant;
  date: string;
  startTime: string;
  endTime: string;
};

export type SlotCandidate = {
  date: string;
  startTime: string;
  endTime: string;
  participantCount: number;
};

export type DayModel = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
};

export type WeekModel = {
  label: string;
  days: DayModel[];
};
