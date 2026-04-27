import { DAY_END_HOUR, DAY_START_HOUR, SLOT_STEP_MINUTES } from "./constants";
import type { DayModel, WeekModel } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTime(minutes: number) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function addMinutes(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number);
  return toTime(hours * 60 + minutes + minutesToAdd);
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getCurrentMonth() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function buildMonthWeeks(year: number, month: number): WeekModel[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay.getTime() - startOffset * MS_PER_DAY);
  const weeks: WeekModel[] = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const days: DayModel[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(start.getTime() + (weekIndex * 7 + dayIndex) * MS_PER_DAY);
      const day = date.getDay();

      days.push({
        date: toDateKey(date),
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === month - 1,
        isWeekend: day === 0 || day === 6,
      });
    }

    const first = days[0].date.slice(8);
    const last = days[6].date.slice(8);
    weeks.push({ label: `${first}-${last}`, days });

    if (days[6].date >= toDateKey(lastDay)) {
      break;
    }
  }

  return weeks;
}

export function buildRollingWeeks(fromDate = new Date(), weekCount = 8): WeekModel[] {
  const startOffset = (fromDate.getDay() + 6) % 7;
  const start = new Date(fromDate.getTime() - startOffset * MS_PER_DAY);
  const weeks: WeekModel[] = [];

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    const days: DayModel[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(start.getTime() + (weekIndex * 7 + dayIndex) * MS_PER_DAY);
      const day = date.getDay();

      days.push({
        date: toDateKey(date),
        day: date.getDate(),
        isCurrentMonth: true,
        isWeekend: day === 0 || day === 6,
      });
    }

    const first = days[0].date.slice(5).replace("-", ".");
    const last = days[6].date.slice(5).replace("-", ".");
    weeks.push({ label: `${first}-${last}`, days });
  }

  return weeks;
}

export function buildStartTimes(durationMinutes = SLOT_STEP_MINUTES) {
  const start = DAY_START_HOUR * 60;
  const end = DAY_END_HOUR * 60 - durationMinutes;
  const times: string[] = [];

  for (let minutes = start; minutes <= end; minutes += SLOT_STEP_MINUTES) {
    times.push(toTime(minutes));
  }

  return times;
}

export function buildSelectableSlots() {
  return buildStartTimes(SLOT_STEP_MINUTES).map((startTime) => ({
    startTime,
    endTime: addMinutes(startTime, SLOT_STEP_MINUTES),
  }));
}
