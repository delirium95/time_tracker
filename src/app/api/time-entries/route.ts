import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  type WhereClause = {
    endTime?: { not: null; gte?: Date; lte?: Date };
    startTime?: { gte: Date; lte: Date };
  };

  let where: WhereClause = {};

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where = { startTime: { gte: start, lte: end } };
  } else if (from && to) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    where = { startTime: { gte: start, lte: end } };
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: { project: true },
    orderBy: { startTime: "desc" },
  });

  logger.info({ count: entries.length, date, from, to }, "timeEntries.list");
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { taskName, projectId, startTime, endTime, durationSec } = body;

  if (!taskName?.trim()) {
    return NextResponse.json({ error: "Task name is required" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      taskName: taskName.trim(),
      projectId: projectId || null,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      durationSec: durationSec || null,
    },
    include: { project: true },
  });

  logger.info({ id: entry.id, taskName: entry.taskName, projectId: entry.projectId }, "timeEntries.start");
  return NextResponse.json(entry, { status: 201 });
}
