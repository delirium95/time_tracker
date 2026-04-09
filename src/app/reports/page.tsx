"use client";

import { useEffect, useState } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TimeEntry } from "@/lib/types";
import { formatHM } from "@/lib/formatDuration";
import { toast } from "sonner";

type Period = "day" | "week" | "month";

function getRangeDates(period: Period): { from: string; to: string } {
  const now = new Date();
  if (period === "day")
    return {
      from: format(startOfDay(now), "yyyy-MM-dd"),
      to: format(endOfDay(now), "yyyy-MM-dd"),
    };
  if (period === "week")
    return {
      from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

function buildDailyChart(entries: TimeEntry[], from: string, to: string) {
  const days = eachDayOfInterval({ start: new Date(from), end: new Date(to) });
  return days.map((day) => {
    const label = format(day, "EEE d");
    const total = entries
      .filter((e) => format(new Date(e.startTime), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"))
      .reduce((s, e) => s + (e.durationSec || 0), 0);
    return { label, hours: Math.round((total / 3600) * 10) / 10 };
  });
}

const PROJECT_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#22c55e", "#14b8a6"];

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const { from, to } = getRangeDates(period);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [from, to]);

  const totalSec = entries.reduce((s, e) => s + (e.durationSec || 0), 0);

  const byProject = entries.reduce<
    Record<string, { name: string; color: string; total: number; index: number }>
  >((acc, e) => {
    const key = e.project?.name || "No Project";
    if (!acc[key])
      acc[key] = {
        name: key,
        color: e.project?.color || "#94a3b8",
        total: 0,
        index: Object.keys(acc).length,
      };
    acc[key].total += e.durationSec || 0;
    return acc;
  }, {});

  const chartData = buildDailyChart(entries, from, to);
  const maxHours = Math.max(...chartData.map((d) => d.hours), 1);

  const handleExport = () => {
    window.open(`/api/reports?from=${from}&to=${to}&export=csv`, "_blank");
    toast.success("CSV export started");
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Reports</h1>
        <button
          onClick={handleExport}
          className="text-sm bg-white border rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              period === p
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p === "day" ? "Today" : p === "week" ? "This week" : "This month"}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400 self-center">
          {from === to ? from : `${from} → ${to}`}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-bold text-indigo-600">{formatHM(totalSec)}</div>
              <div className="text-xs text-gray-500 mt-1">Total tracked</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-bold text-gray-800">{entries.length}</div>
              <div className="text-xs text-gray-500 mt-1">Entries</div>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <div className="text-2xl font-bold text-gray-800">
                {Object.keys(byProject).length}
              </div>
              <div className="text-xs text-gray-500 mt-1">Projects</div>
            </div>
          </div>

          {/* Daily bar chart */}
          {period !== "day" && chartData.length > 0 && (
            <div className="bg-white rounded-xl border p-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily breakdown</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}h`}
                    domain={[0, Math.ceil(maxHours)]}
                  />
                  <Tooltip
                    formatter={(v) => [`${v}h`, "Hours"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.hours > 0 ? "#6366f1" : "#e5e7eb"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By project */}
          <div className="bg-white rounded-xl border overflow-hidden mb-6">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-700">By project</h2>
            </div>
            {Object.values(byProject).length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No data for this period.
              </div>
            ) : (
              Object.values(byProject)
                .sort((a, b) => b.total - a.total)
                .map((g, i) => {
                  const pct = totalSec > 0 ? Math.round((g.total / totalSec) * 100) : 0;
                  return (
                    <div key={g.name} className="px-4 py-3 border-b last:border-0">
                      <div className="flex items-center gap-3 mb-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] }}
                        />
                        <span className="flex-1 text-sm text-gray-800">{g.name}</span>
                        <span className="text-sm font-semibold text-gray-700">{formatHM(g.total)}</span>
                        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                      <div className="ml-5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Entry log */}
          {entries.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h2 className="text-sm font-semibold text-gray-700">Entry log</h2>
              </div>
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="px-4 py-3 flex items-center gap-3 border-b last:border-0 text-sm"
                >
                  <span className="text-gray-400 w-16 flex-shrink-0 text-xs">
                    {format(new Date(e.startTime), "MMM d")}
                  </span>
                  <span className="flex-1 text-gray-800">{e.taskName}</span>
                  {e.project && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0"
                      style={{ backgroundColor: e.project.color }}
                    >
                      {e.project.name}
                    </span>
                  )}
                  <span className="text-gray-500 w-12 text-right font-mono text-xs flex-shrink-0">
                    {e.durationSec ? formatHM(e.durationSec) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
