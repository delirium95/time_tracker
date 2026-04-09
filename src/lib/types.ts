export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntry {
  id: string;
  taskName: string;
  projectId: string | null;
  project: Project | null;
  startTime: Date;
  endTime: Date | null;
  durationSec: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTimeEntryInput {
  taskName: string;
  projectId?: string | null;
  startTime: Date;
  endTime?: Date | null;
  durationSec?: number | null;
}

export interface UpdateTimeEntryInput {
  taskName?: string;
  projectId?: string | null;
  startTime?: Date;
  endTime?: Date | null;
  durationSec?: number | null;
}
