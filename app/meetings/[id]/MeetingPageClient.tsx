"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addMinutes, buildRollingWeeks, buildSelectableSlots, timeToMinutes } from "@/lib/calendar";
import { isSlotInsideCandidate } from "@/lib/intersections";
import type { AvailabilitySlot, Meeting, Participant, SlotCandidate } from "@/lib/types";
import styles from "./meeting.module.css";

type MeetingBundle = {
  meeting: Meeting;
  availability: AvailabilitySlot[];
  optimalSlots: SlotCandidate[];
  submittedParticipants: Participant[];
};

type Props = {
  id: string;
};

type Interval = {
  startTime: string;
  endTime: string;
};

function slotKey(date: string, startTime: string) {
  return `${date}|${startTime}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
  }).format(new Date(`${date}T00:00:00`));
}

function getTodayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function MeetingPageClient({ id }: Props) {
  const [bundle, setBundle] = useState<MeetingBundle | null>(null);
  const [participant, setParticipant] = useState<Participant | "">("");
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [draftIntervals, setDraftIntervals] = useState<Record<string, Interval[]>>({});
  const [weekIndex, setWeekIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMeeting = useCallback(async () => {
    const response = await fetch(`/api/meetings/${id}`, { cache: "no-store" });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Не удалось загрузить встречу.");
      return;
    }

    setBundle(result);
    setParticipant((current) => current || result.meeting.participants[0] || "");
  }, [id]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  useEffect(() => {
    if (!bundle || !participant) {
      return;
    }

    const participantSlots = bundle.availability
      .filter((slot) => slot.participant === participant)
      .map((slot) => slotKey(slot.date, slot.startTime));
    setSelectedSlots(new Set(participantSlots));
  }, [bundle, participant]);

  const weeks = useMemo(() => {
    if (!bundle) {
      return [];
    }

    return buildRollingWeeks();
  }, [bundle]);
  const visibleWeek = weeks[weekIndex] || weeks[0];
  const selectableSlots = useMemo(() => buildSelectableSlots(), []);
  const timeOptions = useMemo(() => {
    const firstSlot = selectableSlots[0];
    return firstSlot ? [firstSlot.startTime, ...selectableSlots.map((slot) => slot.endTime)] : [];
  }, [selectableSlots]);

  useEffect(() => {
    if (weeks.length === 0) {
      return;
    }

    const today = getTodayKey();
    const currentWeekIndex = weeks.findIndex((week) =>
      week.days.some((day) => day.date === today && day.isCurrentMonth),
    );

    setWeekIndex(currentWeekIndex >= 0 ? currentWeekIndex : 0);
  }, [weeks]);

  if (!bundle) {
    return (
      <main className="page">
        <div className="card">{error || "Загружаю встречу..."}</div>
      </main>
    );
  }

  const { meeting, optimalSlots, submittedParticipants } = bundle;
  const isEveryoneSubmitted = submittedParticipants.length === meeting.participants.length;

  function createDefaultDraftInterval(): Interval {
    return { startTime: "08:00", endTime: "09:00" };
  }

  function getDraftIntervals(date: string) {
    return draftIntervals[date] || [createDefaultDraftInterval()];
  }

  function updateDraftInterval(date: string, index: number, changes: Partial<Interval>) {
    setDraftIntervals((current) => {
      const intervals = current[date] || [createDefaultDraftInterval()];

      return {
        ...current,
        [date]: intervals.map((interval, itemIndex) =>
          itemIndex === index
            ? {
                ...interval,
                ...changes,
              }
            : interval,
        ),
      };
    });
  }

  function addDraftInterval(date: string) {
    setDraftIntervals((current) => {
      const intervals = current[date] || [createDefaultDraftInterval()];

      return {
        ...current,
        [date]: [...intervals, createDefaultDraftInterval()],
      };
    });
  }

  function removeDraftInterval(date: string, index: number) {
    setDraftIntervals((current) => {
      const intervals = current[date] || [createDefaultDraftInterval()];
      const nextIntervals = intervals.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...current,
        [date]: nextIntervals.length > 0 ? nextIntervals : [createDefaultDraftInterval()],
      };
    });
  }

  function addIntervals(date: string) {
    const intervals = getDraftIntervals(date);

    for (const interval of intervals) {
      if (timeToMinutes(interval.startTime) >= timeToMinutes(interval.endTime)) {
        setError("Время окончания должно быть позже времени начала.");
        return;
      }
    }

    setError("");
    setSelectedSlots((current) => {
      const next = new Set(current);

      for (const interval of intervals) {
        let currentTime = interval.startTime;
        const end = timeToMinutes(interval.endTime);

        while (timeToMinutes(currentTime) < end) {
          next.add(slotKey(date, currentTime));
          currentTime = addMinutes(currentTime, 30);
        }
      }

      return next;
    });
  }

  function getSelectedIntervals(date: string) {
    const starts = Array.from(selectedSlots)
      .map((key) => {
        const [slotDate, startTime] = key.split("|");
        return { date: slotDate, startTime };
      })
      .filter((slot) => slot.date === date)
      .map((slot) => slot.startTime)
      .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));

    const intervals: Interval[] = [];
    let currentStart = "";
    let previousStart = "";

    for (const startTime of starts) {
      if (!currentStart) {
        currentStart = startTime;
        previousStart = startTime;
        continue;
      }

      if (timeToMinutes(startTime) === timeToMinutes(previousStart) + 30) {
        previousStart = startTime;
        continue;
      }

      intervals.push({ startTime: currentStart, endTime: addMinutes(previousStart, 30) });
      currentStart = startTime;
      previousStart = startTime;
    }

    if (currentStart) {
      intervals.push({ startTime: currentStart, endTime: addMinutes(previousStart, 30) });
    }

    return intervals;
  }

  function removeInterval(date: string, interval: Interval) {
    const end = timeToMinutes(interval.endTime);

    setSelectedSlots((current) => {
      const next = new Set(current);
      let currentTime = interval.startTime;

      while (timeToMinutes(currentTime) < end) {
        next.delete(slotKey(date, currentTime));
        currentTime = addMinutes(currentTime, 30);
      }

      return next;
    });
  }

  async function saveAvailability() {
    if (!participant) {
      return;
    }

    setMessage("");
    setError("");

    const response = await fetch(`/api/meetings/${id}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant,
        slots: Array.from(selectedSlots).map((key) => {
          const [date, startTime] = key.split("|");
          return { date, startTime };
        }),
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Не удалось сохранить доступность.");
      return;
    }

    setMessage("Доступность сохранена.");
    await loadMeeting();
  }

  async function selectSlot(selectedSlot: SlotCandidate | null) {
    const response = await fetch(`/api/meetings/${id}/selected-slot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedSlot }),
    });

    if (!response.ok) {
      const result = await response.json();
      setError(result.error || "Не удалось выбрать финальный слот.");
      return;
    }

    await loadMeeting();
  }

  function isOptimal(date: string, startTime: string) {
    return optimalSlots.some((candidate) => isSlotInsideCandidate(date, startTime, candidate));
  }

  function isFinal(date: string, startTime: string) {
    return Boolean(
      meeting.selectedSlot && isSlotInsideCandidate(date, startTime, meeting.selectedSlot),
    );
  }

  function dayHasOptimal(date: string) {
    return optimalSlots.some((candidate) => candidate.date === date);
  }

  function dayHasFinal(date: string) {
    return Boolean(meeting.selectedSlot && meeting.selectedSlot.date === date);
  }

  return (
    <main className="page">
      <div className={styles.topbar}>
        <Link className="button secondary" href="/">
          Новая встреча
        </Link>
        <span className="muted">Ссылка на эту страницу подходит для команды</span>
      </div>

      <section className={styles.grid}>
        <div className="card">
          <h1 className={styles.title}>{meeting.title}</h1>
          <p className="muted">
            {meeting.durationMinutes} минут, текущая неделя. Сетка: 08:00-21:00.
          </p>

          {meeting.selectedSlot ? (
            <p className={`${styles.bestSlot} ${styles.final}`}>
              <strong>Финальный слот</strong>
              <span>
                {formatDate(meeting.selectedSlot.date)}, {meeting.selectedSlot.startTime}-
                {meeting.selectedSlot.endTime}
              </span>
            </p>
          ) : null}

          <label>
            <span className="muted">Кто заполняет доступность</span>
            <select
              className="select"
              value={participant}
              onChange={(event) => setParticipant(event.target.value as Participant)}
            >
              {meeting.participants.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.actions}>
            <button className="button" onClick={saveAvailability}>
              Сохранить доступность
            </button>
            {meeting.selectedSlot ? (
              <button className="button secondary" onClick={() => selectSlot(null)}>
                Сбросить финальный слот
              </button>
            ) : null}
          </div>

          {message ? <p>{message}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.calendar}>
            {visibleWeek ? (
              <section className={styles.week}>
                <div className={styles.weekHeader}>
                  <span>Неделя {visibleWeek.label}</span>
                  <div className={styles.weekNav}>
                    <button
                      className="button secondary"
                      disabled={weekIndex === 0}
                      onClick={() => setWeekIndex((current) => Math.max(0, current - 1))}
                      type="button"
                    >
                      Назад
                    </button>
                    <button
                      className="button secondary"
                      disabled={weekIndex >= weeks.length - 1}
                      onClick={() =>
                        setWeekIndex((current) => Math.min(weeks.length - 1, current + 1))
                      }
                      type="button"
                    >
                      Следующая неделя
                    </button>
                  </div>
                </div>
                <div className={styles.days}>
                  {visibleWeek.days.map((day) => (
                    <div
                      className={[
                        styles.day,
                        day.isWeekend ? styles.weekend : "",
                        dayHasOptimal(day.date) ? styles.dayOptimal : "",
                        dayHasFinal(day.date) ? styles.dayFinal : "",
                        day.isCurrentMonth ? "" : styles.outside,
                      ].join(" ")}
                      key={day.date}
                    >
                      <div className={styles.dayTitle}>{formatDate(day.date)}</div>
                      {dayHasFinal(day.date) ? (
                        <div className={styles.dayBadge}>Финальный слот</div>
                      ) : null}
                      {dayHasOptimal(day.date) ? (
                        <div className={styles.dayBadge}>Есть пересечение</div>
                      ) : null}
                      <div className={styles.intervalForm}>
                        {getDraftIntervals(day.date).map((interval, intervalIndex) => (
                          <div
                            className={styles.draftInterval}
                            key={`${day.date}-${intervalIndex}`}
                          >
                            <label>
                              <span>С</span>
                              <select
                                className="select"
                                disabled={!day.isCurrentMonth}
                                value={interval.startTime}
                                onChange={(event) =>
                                  updateDraftInterval(day.date, intervalIndex, {
                                    startTime: event.target.value,
                                  })
                                }
                              >
                                {timeOptions.slice(0, -1).map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>До</span>
                              <select
                                className="select"
                                disabled={!day.isCurrentMonth}
                                value={interval.endTime}
                                onChange={(event) =>
                                  updateDraftInterval(day.date, intervalIndex, {
                                    endTime: event.target.value,
                                  })
                                }
                              >
                                {timeOptions.slice(1).map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {getDraftIntervals(day.date).length > 1 ? (
                              <button
                                className={styles.removeDraft}
                                onClick={() => removeDraftInterval(day.date, intervalIndex)}
                                type="button"
                              >
                                Удалить
                              </button>
                            ) : null}
                          </div>
                        ))}
                        <button
                          className="button secondary"
                          disabled={!day.isCurrentMonth}
                          onClick={() => addDraftInterval(day.date)}
                          type="button"
                        >
                          + Еще период
                        </button>
                        <button
                          className="button secondary"
                          disabled={!day.isCurrentMonth}
                          onClick={() => addIntervals(day.date)}
                          type="button"
                        >
                          Добавить периоды
                        </button>
                      </div>
                      <div className={styles.intervals}>
                        {getSelectedIntervals(day.date).map((interval) => (
                          <div
                            className={[
                              styles.interval,
                              isOptimal(day.date, interval.startTime) ? styles.optimal : "",
                              isFinal(day.date, interval.startTime) ? styles.final : "",
                            ].join(" ")}
                            key={`${day.date}-${interval.startTime}-${interval.endTime}`}
                          >
                            <span>
                              {interval.startTime}-{interval.endTime}
                            </span>
                            <button
                              onClick={() => removeInterval(day.date, interval)}
                              type="button"
                            >
                              Удалить
                            </button>
                          </div>
                        ))}
                        {getSelectedIntervals(day.date).length === 0 ? (
                          <p className="muted">Интервалы не добавлены</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <aside className={`card ${styles.panel}`}>
          <section>
            <h2>Участники</h2>
            <p className="muted">
              Заполнили {submittedParticipants.length} из {meeting.participants.length}
              {isEveryoneSubmitted ? ". Можно выбирать финальный слот." : "."}
            </p>
            <ul className={styles.statusList}>
              {meeting.participants.map((item) => {
                const done = submittedParticipants.includes(item);
                return (
                  <li className={`${styles.pill} ${done ? styles.done : ""}`} key={item}>
                    <span>{item}</span>
                    <strong>{done ? "готово" : "ждем"}</strong>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <h2>Лучшие слоты</h2>
            <p className="muted">
              Считаются по тем приглашенным участникам, которые уже заполнили доступность.
            </p>
            <ul className={styles.bestList}>
              {optimalSlots.slice(0, 12).map((slot) => (
                <li className={styles.bestSlot} key={`${slot.date}-${slot.startTime}`}>
                  <span>
                    {formatDate(slot.date)}, {slot.startTime}-{slot.endTime}
                  </span>
                  <button className="button secondary" onClick={() => selectSlot(slot)}>
                    Выбрать
                  </button>
                </li>
              ))}
            </ul>
            {optimalSlots.length === 0 ? (
              <p className="muted">Пока нет общего пересечения.</p>
            ) : null}
          </section>
        </aside>
      </section>
    </main>
  );
}
