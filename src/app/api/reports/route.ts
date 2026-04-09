import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { TimeEntry } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const exportCsv = searchParams.get("export") === "csv";

  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to are required" },
      { status: 400 }
    );
  }

  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  const entries = await prisma.timeEntry.findMany({
    where: {
      startTime: { gte: start, lte: end },
      endTime: { not: null },
    },
    include: { project: true },
    orderBy: { startTime: "asc" },
  });

  if (exportCsv) {
    const rows = [
      ["Date", "Task", "Project", "Start", "End", "Duration (min)"],
      ...entries.map((e: TimeEntry) => [
        format(e.startTime, "yyyy-MM-dd"),
        e.taskName,
        e.project?.name || "",
        format(e.startTime, "HH:mm"),
        e.endTime ? format(e.endTime, "HH:mm") : "",
        e.durationSec ? String(Math.round(e.durationSec / 60)) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="time-report-${from}-${to}.csv"`,
      },
    });
  }

  return NextResponse.json(entries);
}
