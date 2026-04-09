import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createTestDb } from "../testDb";

let testPrisma: PrismaClient;
let cleanup: () => void;

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return testPrisma;
  },
}));

const { GET, POST } = await import("@/app/api/time-entries/route");
const { PUT, DELETE } = await import("@/app/api/time-entries/[id]/route");

function req(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Time Entries API", () => {
  let projectId: string;

  beforeAll(() => {
    const result = createTestDb();
    testPrisma = result.prisma;
    cleanup = result.cleanup;
  });

  afterAll(() => cleanup());

  beforeEach(async () => {
    await testPrisma.timeEntry.deleteMany();
    await testPrisma.project.deleteMany();
    const p = await testPrisma.project.create({ data: { name: "Test Project", color: "#000" } });
    projectId = p.id;
  });

  describe("POST /api/time-entries", () => {
    it("creates a time entry without end time", async () => {
      const start = new Date("2026-04-09T09:00:00Z");
      const res = await POST(
        req("http://localhost/api/time-entries", "POST", {
          taskName: "Deep work",
          projectId,
          startTime: start.toISOString(),
        })
      );
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.taskName).toBe("Deep work");
      expect(data.endTime).toBeNull();
      expect(data.project.name).toBe("Test Project");
    });

    it("creates a completed entry with duration", async () => {
      const res = await POST(
        req("http://localhost/api/time-entries", "POST", {
          taskName: "Meeting",
          projectId,
          startTime: new Date("2026-04-09T09:00:00Z").toISOString(),
          endTime: new Date("2026-04-09T10:00:00Z").toISOString(),
          durationSec: 3600,
        })
      );
      const data = await res.json();
      expect(data.durationSec).toBe(3600);
      expect(data.endTime).not.toBeNull();
    });

    it("creates entry without project", async () => {
      const res = await POST(
        req("http://localhost/api/time-entries", "POST", {
          taskName: "Misc task",
          startTime: new Date().toISOString(),
        })
      );
      const data = await res.json();
      expect(data.projectId).toBeNull();
      expect(data.project).toBeNull();
    });

    it("returns 400 when taskName is empty", async () => {
      const res = await POST(
        req("http://localhost/api/time-entries", "POST", {
          taskName: "",
          startTime: new Date().toISOString(),
        })
      );
      expect(res.status).toBe(400);
    });

    it("trims whitespace from taskName", async () => {
      const res = await POST(
        req("http://localhost/api/time-entries", "POST", {
          taskName: "  Padded  ",
          startTime: new Date().toISOString(),
        })
      );
      const data = await res.json();
      expect(data.taskName).toBe("Padded");
    });
  });

  describe("GET /api/time-entries", () => {
    beforeEach(async () => {
      await testPrisma.timeEntry.createMany({
        data: [
          { taskName: "Today task", startTime: new Date("2026-04-09T10:00:00Z"), projectId },
          { taskName: "Yesterday task", startTime: new Date("2026-04-08T10:00:00Z"), projectId },
        ],
      });
    });

    it("filters by date", async () => {
      const res = await GET(req("http://localhost/api/time-entries?date=2026-04-09", "GET"));
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].taskName).toBe("Today task");
    });

    it("filters by date range", async () => {
      const res = await GET(
        req("http://localhost/api/time-entries?from=2026-04-08&to=2026-04-09", "GET")
      );
      const data = await res.json();
      expect(data).toHaveLength(2);
    });

    it("returns all entries when no filter", async () => {
      const res = await GET(req("http://localhost/api/time-entries", "GET"));
      const data = await res.json();
      expect(data).toHaveLength(2);
    });
  });

  describe("PUT /api/time-entries/[id]", () => {
    it("updates task name and sets end time", async () => {
      const entry = await testPrisma.timeEntry.create({
        data: { taskName: "Original", startTime: new Date("2026-04-09T09:00:00Z"), projectId },
      });
      const res = await PUT(
        req(`http://localhost/api/time-entries/${entry.id}`, "PUT", {
          taskName: "Updated",
          endTime: new Date("2026-04-09T10:30:00Z").toISOString(),
          durationSec: 5400,
        }),
        { params: Promise.resolve({ id: entry.id }) }
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.taskName).toBe("Updated");
      expect(data.durationSec).toBe(5400);
    });

    it("returns 404 for non-existent entry", async () => {
      const res = await PUT(
        req("http://localhost/api/time-entries/ghost", "PUT", { taskName: "X" }),
        { params: Promise.resolve({ id: "ghost" }) }
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/time-entries/[id]", () => {
    it("deletes existing entry", async () => {
      const entry = await testPrisma.timeEntry.create({
        data: { taskName: "To delete", startTime: new Date(), projectId },
      });
      const res = await DELETE(
        req(`http://localhost/api/time-entries/${entry.id}`, "DELETE"),
        { params: Promise.resolve({ id: entry.id }) }
      );
      expect(res.status).toBe(204);
    });
  });
});
