"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PARTICIPANTS } from "@/lib/constants";
import type { Participant } from "@/lib/types";
import styles from "./page.module.css";

const DURATIONS = [30, 60, 90, 120, 150, 180];

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [participants, setParticipants] = useState<Participant[]>(PARTICIPANTS);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allSelected = participants.length === PARTICIPANTS.length;

  const selectedLabel = useMemo(() => {
    if (allSelected) {
      return "Выбрана вся команда";
    }

    return `Выбрано: ${participants.length}`;
  }, [allSelected, participants.length]);

  function toggleParticipant(participant: Participant) {
    setParticipants((current) =>
      current.includes(participant)
        ? current.filter((item) => item !== participant)
        : [...current, participant],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, durationMinutes, participants }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Не удалось создать встречу.");
        return;
      }

      router.push(`/meetings/${result.meeting.id}`);
    } catch {
      setError("Не удалось создать встречу. Проверь настройки Google Sheets в Vercel.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className={styles.hero}>
        <div>
          <p className="muted">Планировщик встреч команды</p>
          <h1 className={styles.title}>Счастливый час</h1>
          <p className={styles.subtitle}>
            Создай запрос на встречу, отправь ссылку команде и выбери общий слот из пересечений.
          </p>
        </div>

        <form className={`card ${styles.form}`} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Название встречи</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: синхронизация по запуску"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Длительность</span>
            <select
              className="select"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
            >
              {DURATIONS.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} минут
                </option>
              ))}
            </select>
          </label>

          <div className={styles.field}>
            <div className={styles.participantsHeader}>
              <span className={styles.label}>Участники</span>
              <button
                className="button secondary"
                type="button"
                onClick={() => setParticipants(allSelected ? [] : PARTICIPANTS)}
              >
                {allSelected ? "Снять всех" : "Выбрать всех"}
              </button>
            </div>
            <span className="muted">{selectedLabel}</span>
            <div className={styles.participantGrid}>
              {PARTICIPANTS.map((participant) => (
                <label className={styles.checkbox} key={participant}>
                  <input
                    checked={participants.includes(participant)}
                    onChange={() => toggleParticipant(participant)}
                    type="checkbox"
                  />
                  {participant}
                </label>
              ))}
            </div>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className="button" disabled={isSubmitting || participants.length === 0}>
            {isSubmitting ? "Создаю..." : "Создать встречу"}
          </button>
        </form>
      </section>
    </main>
  );
}
