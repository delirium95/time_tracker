import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { taskName, projectId, startTime, endTime, durationSec } = body;

  try {
    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        taskName: taskName?.trim(),
        projectId: projectId ?? null,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : null,
        durationSec: durationSec ?? null,
      },
      include: { project: true },
    });
    logger.info({ id, durationSec: entry.durationSec }, "timeEntries.update");
    return NextResponse.json(entry);
  } catch {
    logger.warn({ id }, "timeEntries.update.notFound");
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.timeEntry.delete({ where: { id } });
    logger.info({ id }, "timeEntries.delete");
    return new NextResponse(null, { status: 204 });
  } catch {
    logger.warn({ id }, "timeEntries.delete.notFound");
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
}
