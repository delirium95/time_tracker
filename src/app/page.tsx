"use client";

import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useTimerStore } from "@/store/timerStore";
import TimerBar from "@/components/TimerBar";
import TimeEntryList from "@/components/TimeEntryList";
import { TimeEntry } from "@/lib/types";
import { formatDuration } from "@/lib/formatDuration";

const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export default function Home() {
  const {
    projects,
    todayEntries,
    activeEntryId,
    isRunning,
    elapsed,
    taskName,
    setProjects,
    setTodayEntries,
    stopTimer,
  } = useTimerStore();

  const today = new Date().toISOString().slice(0, 10);
  const lastActivityRef = useRef<number>(Date.now());
  const idleToastShownRef = useRef(false);

  const loadEntries = useCallback(async () => {
    const res = await fetch(`/api/time-entries?date=${today}`);
    const data = await res.json();
    setTodayEntries(data);
  }, [today, setTodayEntries]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects);
    loadEntries();
  }, [loadEntries, setProjects]);

  // --- Browser tab title ---
  useEffect(() => {
    if (isRunning) {
      document.title = `⏱ ${formatDuration(elapsed)} — TimeTracker`;
    } else {
      document.title = "TimeTracker";
    }
  }, [isRunning, elapsed]);

  // --- Idle detection ---
  useEffect(() => {
    const resetIdle = () => {
      lastActivityRef.current = Date.now();
      idleToastShownRef.current = false;
    };
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);

    const idleCheck = setInterval(() => {
      if (!isRunning || idleToastShownRef.current) return;
      if (Date.now() - lastActivityRef.current > IDLE_THRESHOLD_MS) {
        idleToastShownRef.current = true;
        toast.warning("Timer is still running — are you still working?", {
          duration: Infinity,
          action: { label: "Stop timer", onClick: handleStop },
        });
      }
    }, 30_000);

    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
      clearInterval(idleCheck);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (isRunning) {
          handleStop();
        } else {
          document.querySelector<HTMLButtonElement>("[data-start-btn]")?.click();
        }
      }
      if (e.code === "Escape" && isRunning) {
        handleStop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, activeEntryId]);

  const handleStop = async () => {
    if (!activeEntryId) return;
    const endTime = new Date();
    const entry = todayEntries.find((e) => e.id === activeEntryId);
    const durationSec = entry
      ? Math.floor((endTime.getTime() - new Date(entry.startTime).getTime()) / 1000)
      : elapsed;

    await fetch(`/api/time-entries/${activeEntryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endTime: endTime.toISOString(), durationSec }),
    });
    stopTimer();
    loadEntries();
    toast.success(`Logged ${formatDuration(durationSec)}`);
  };

  const handleUpdate = async (id: string, data: Partial<TimeEntry>) => {
    await fetch(`/api/time-entries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadEntries();
    toast.success("Entry updated");
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    loadEntries();
    toast.success("Entry deleted");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TimerBar onStop={handleStop} />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <TimeEntryList
          entries={todayEntries}
          projects={projects}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
