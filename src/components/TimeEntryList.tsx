"use client";

import { useState } from "react";
import { TimeEntry, Project } from "@/lib/types";
import { formatDuration, formatHM } from "@/lib/formatDuration";
import { format } from "date-fns";

interface Props {
  entries: TimeEntry[];
  projects: Project[];
  onUpdate: (id: string, data: Partial<TimeEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function groupByProject(entries: TimeEntry[]) {
  const groups = new Map<string, { name: string; color: string; entries: TimeEntry[]; total: number }>();

  for (const e of entries) {
    const key = e.projectId || "__none__";
    const name = e.project?.name || "No Project";
    const color = e.project?.color || "#94a3b8";
    if (!groups.has(key)) groups.set(key, { name, color, entries: [], total: 0 });
    const g = groups.get(key)!;
    g.entries.push(e);
    g.total += e.durationSec || 0;
  }

  return Array.from(groups.values());
}

export default function TimeEntryList({ entries, projects, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const startEdit = (e: TimeEntry) => {
    setEditingId(e.id);
    setEditValues({
      taskName: e.taskName,
      projectId: e.projectId || "",
      startTime: e.startTime ? format(new Date(e.startTime), "HH:mm") : "",
      endTime: e.endTime ? format(new Date(e.endTime), "HH:mm") : "",
    });
  };

  const saveEdit = async (entry: TimeEntry) => {
    const today = format(new Date(entry.startTime), "yyyy-MM-dd");
    const [startH, startM] = editValues.startTime.split(":").map(Number);
    const [endH, endM] = editValues.endTime.split(":").map(Number);
    const startTime = new Date(`${today}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`);
    const endTime = editValues.endTime
      ? new Date(`${today}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`)
      : null;
    const durationSec = endTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : null;

    await onUpdate(entry.id, {
      taskName: editValues.taskName,
      projectId: editValues.projectId || null,
      startTime,
      endTime,
      durationSec,
    });
    setEditingId(null);
  };

  const groups = groupByProject(entries);
  const totalToday = entries.reduce((s, e) => s + (e.durationSec || 0), 0);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No time entries yet. Start tracking above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today</h2>
        <span className="text-sm font-semibold text-gray-700">{formatHM(totalToday)} total</span>
      </div>

      {groups.map((group) => (
        <div key={group.name} className="bg-white rounded-xl border overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-2 border-b"
            style={{ borderLeftColor: group.color, borderLeftWidth: 3 }}
          >
            <span className="text-sm font-semibold" style={{ color: group.color }}>
              {group.name}
            </span>
            <span className="text-xs text-gray-500">{formatHM(group.total)}</span>
          </div>

          {group.entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              {editingId === entry.id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    className="flex-1 min-w-32 border rounded px-2 py-1 text-sm text-gray-900 bg-white"
                    value={editValues.taskName}
                    onChange={(e) => setEditValues((v) => ({ ...v, taskName: e.target.value }))}
                  />
                  <select
                    className="border rounded px-2 py-1 text-sm text-gray-900 bg-white"
                    value={editValues.projectId}
                    onChange={(e) => setEditValues((v) => ({ ...v, projectId: e.target.value }))}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    className="border rounded px-2 py-1 text-sm text-gray-900 bg-white"
                    value={editValues.startTime}
                    onChange={(e) => setEditValues((v) => ({ ...v, startTime: e.target.value }))}
                  />
                  <span className="text-gray-400">→</span>
                  <input
                    type="time"
                    className="border rounded px-2 py-1 text-sm text-gray-900 bg-white"
                    value={editValues.endTime}
                    onChange={(e) => setEditValues((v) => ({ ...v, endTime: e.target.value }))}
                  />
                  <button
                    onClick={() => saveEdit(entry)}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-500 px-3 py-1 rounded text-sm hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{entry.taskName}</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(entry.startTime), "HH:mm")}
                      {entry.endTime && ` → ${format(new Date(entry.endTime), "HH:mm")}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-600">
                      {entry.durationSec ? formatDuration(entry.durationSec) : "—"}
                    </span>
                    <button
                      onClick={() => startEdit(entry)}
                      className="text-gray-400 hover:text-indigo-600 transition-colors text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
