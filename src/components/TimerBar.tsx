"use client";

import { useEffect, useRef, useState } from "react";
import { useTimerStore } from "@/store/timerStore";
import { formatDuration } from "@/lib/formatDuration";

export default function TimerBar({
  onStop,
}: {
  onStop: () => void;
}) {
  const {
    isRunning,
    elapsed,
    taskName,
    selectedProjectId,
    projects,
    tickTimer,
    setTaskName,
    setSelectedProjectId,
  } = useTimerStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [taskSuggestions, setTaskSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tickTimer, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, tickTimer]);

  const handleTaskInput = async (value: string) => {
    setTaskName(value);
    if (value.length < 2) {
      setTaskSuggestions([]);
      return;
    }
    const res = await fetch(`/api/time-entries?date=${new Date().toISOString().slice(0, 10)}`);
    const entries = await res.json();
    const names: string[] = Array.from(
      new Set(
        (entries as { taskName: string }[])
          .map((e) => e.taskName)
          .filter((n: string) => n.toLowerCase().includes(value.toLowerCase()))
      )
    );
    setTaskSuggestions(names.slice(0, 5));
    setShowSuggestions(names.length > 0);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="bg-white border-b shadow-sm px-6 py-3 flex items-center gap-4">
      <div className="relative flex-1">
        <input
          className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="What are you working on?"
          value={taskName}
          onChange={(e) => handleTaskInput(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          disabled={isRunning}
        />
        {showSuggestions && (
          <ul className="absolute z-10 w-full bg-white border rounded-lg shadow mt-1 text-sm">
            {taskSuggestions.map((s) => (
              <li
                key={s}
                className="px-4 py-2 hover:bg-indigo-50 cursor-pointer"
                onMouseDown={() => {
                  setTaskName(s);
                  setShowSuggestions(false);
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <select
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={selectedProjectId || ""}
        onChange={(e) => setSelectedProjectId(e.target.value || null)}
        disabled={isRunning}
      >
        <option value="">No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {isRunning && (
        <span className="font-mono text-lg font-semibold text-indigo-600 min-w-[80px] text-center">
          {formatDuration(elapsed)}
        </span>
      )}

      {isRunning ? (
        <button
          onClick={onStop}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Stop
        </button>
      ) : (
        <StartButton disabled={!taskName.trim()} selectedProject={selectedProject?.name} />
      )}
    </div>
  );
}

function StartButton({
  disabled,
  selectedProject,
}: {
  disabled: boolean;
  selectedProject?: string;
}) {
  const { startTimer, taskName, selectedProjectId } = useTimerStore();

  const handleStart = async () => {
    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskName,
        projectId: selectedProjectId,
        startTime: new Date().toISOString(),
      }),
    });
    const entry = await res.json();
    startTimer(entry.id);
  };

  return (
    <button
      data-start-btn
      onClick={handleStart}
      disabled={disabled}
      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      {selectedProject ? `Start · ${selectedProject}` : "Start"}
    </button>
  );
}
