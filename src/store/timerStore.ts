import { create } from "zustand";
import { Project, TimeEntry } from "@/lib/types";

interface TimerState {
  isRunning: boolean;
  startTime: Date | null;
  elapsed: number;
  taskName: string;
  selectedProjectId: string | null;
  activeEntryId: string | null;

  projects: Project[];
  todayEntries: TimeEntry[];

  setTaskName: (name: string) => void;
  setSelectedProjectId: (id: string | null) => void;
  setProjects: (projects: Project[]) => void;
  setTodayEntries: (entries: TimeEntry[]) => void;
  startTimer: (entryId: string) => void;
  stopTimer: () => void;
  tickTimer: () => void;
}

export const useTimerStore = create<TimerState>((set) => ({
  isRunning: false,
  startTime: null,
  elapsed: 0,
  taskName: "",
  selectedProjectId: null,
  activeEntryId: null,
  projects: [],
  todayEntries: [],

  setTaskName: (name) => set({ taskName: name }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setProjects: (projects) => set({ projects }),
  setTodayEntries: (entries) => set({ todayEntries: entries }),

  startTimer: (entryId) =>
    set({ isRunning: true, startTime: new Date(), elapsed: 0, activeEntryId: entryId }),

  stopTimer: () =>
    set({ isRunning: false, startTime: null, elapsed: 0, activeEntryId: null, taskName: "", selectedProjectId: null }),

  tickTimer: () =>
    set((state) =>
      state.startTime
        ? { elapsed: Math.floor((Date.now() - state.startTime.getTime()) / 1000) }
        : {}
    ),
}));
