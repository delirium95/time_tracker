import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });
  logger.info({ count: projects.length }, "projects.list");
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, color } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: { name: name.trim(), color: color || "#6366f1" },
    });
    logger.info({ id: project.id, name: project.name }, "projects.create");
    return NextResponse.json(project, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.warn({ name }, "projects.create.duplicate");
      return NextResponse.json({ error: "Project name already exists" }, { status: 409 });
    }
    logger.error({ err, name }, "projects.create.error");
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
