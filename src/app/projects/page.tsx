"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/types";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const load = async () => {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }
    setName("");
    setColor("#6366f1");
    load();
  };

  const handleSaveEdit = async (id: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, color: editColor }),
    });
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? Existing entries won't be removed.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Projects</h1>

      <form onSubmit={handleCreate} className="bg-white rounded-xl border p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Project name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="e.g. Client Work"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Color</label>
          <div className="flex gap-1 flex-wrap max-w-[160px]">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "#1e1b4b" : "transparent",
                }}
              />
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <div className="space-y-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3"
            style={{ borderLeftColor: p.color, borderLeftWidth: 4 }}
          >
            {editingId === p.id ? (
              <>
                <input
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <div className="flex gap-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: editColor === c ? "#1e1b4b" : "transparent",
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => handleSaveEdit(p.id)}
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
              </>
            ) : (
              <>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 text-sm font-medium text-gray-800">{p.name}</span>
                <button
                  onClick={() => { setEditingId(p.id); setEditName(p.name); setEditColor(p.color); }}
                  className="text-xs text-gray-400 hover:text-indigo-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No projects yet.</p>
        )}
      </div>
    </main>
  );
}
