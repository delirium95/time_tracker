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

const { GET, POST } = await import("@/app/api/projects/route");
const { PUT, DELETE } = await import("@/app/api/projects/[id]/route");

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/projects", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Projects API", () => {
  beforeAll(() => {
    const result = createTestDb();
    testPrisma = result.prisma;
    cleanup = result.cleanup;
  });

  afterAll(() => cleanup());

  beforeEach(async () => {
    await testPrisma.project.deleteMany();
  });

  describe("GET /api/projects", () => {
    it("returns empty array when no projects exist", async () => {
      const res = await GET();
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("returns all projects sorted by name", async () => {
      await testPrisma.project.createMany({
        data: [
          { name: "Zebra", color: "#000" },
          { name: "Alpha", color: "#fff" },
        ],
      });
      const res = await GET();
      const data = await res.json();
      expect(data.map((p: { name: string }) => p.name)).toEqual(["Alpha", "Zebra"]);
    });
  });

  describe("POST /api/projects", () => {
    it("creates a project with default color", async () => {
      const res = await POST(makeReq("POST", { name: "My Project" }));
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.name).toBe("My Project");
      expect(data.color).toBe("#6366f1");
      expect(data.id).toBeDefined();
    });

    it("creates a project with custom color", async () => {
      const res = await POST(makeReq("POST", { name: "Fancy", color: "#ef4444" }));
      const data = await res.json();
      expect(data.color).toBe("#ef4444");
    });

    it("returns 400 when name is empty", async () => {
      const res = await POST(makeReq("POST", { name: "" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when name is whitespace only", async () => {
      const res = await POST(makeReq("POST", { name: "   " }));
      expect(res.status).toBe(400);
    });

    it("returns 409 on duplicate name", async () => {
      await testPrisma.project.create({ data: { name: "Dup", color: "#000" } });
      const res = await POST(makeReq("POST", { name: "Dup" }));
      expect(res.status).toBe(409);
    });

    it("trims whitespace from name", async () => {
      const res = await POST(makeReq("POST", { name: "  Trimmed  " }));
      const data = await res.json();
      expect(data.name).toBe("Trimmed");
    });
  });

  describe("PUT /api/projects/[id]", () => {
    it("updates project name and color", async () => {
      const p = await testPrisma.project.create({ data: { name: "Old", color: "#000" } });
      const req = new NextRequest(`http://localhost/api/projects/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New", color: "#fff" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: p.id }) });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.name).toBe("New");
      expect(data.color).toBe("#fff");
    });

    it("returns 404 for non-existent project", async () => {
      const req = new NextRequest("http://localhost/api/projects/ghost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "X", color: "#000" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: "ghost" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/projects/[id]", () => {
    it("deletes existing project", async () => {
      const p = await testPrisma.project.create({ data: { name: "ToDelete", color: "#000" } });
      const req = new NextRequest(`http://localhost/api/projects/${p.id}`, { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: p.id }) });
      expect(res.status).toBe(204);
      const found = await testPrisma.project.findUnique({ where: { id: p.id } });
      expect(found).toBeNull();
    });

    it("returns 404 for non-existent project", async () => {
      const req = new NextRequest("http://localhost/api/projects/ghost", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "ghost" }) });
      expect(res.status).toBe(404);
    });
  });
});
