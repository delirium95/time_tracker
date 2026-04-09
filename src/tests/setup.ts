import { vi } from "vitest";

// Mock Next.js server internals for API route testing
vi.mock("next/server", async () => {
  const { NextRequest, NextResponse } = await import("next/server");
  return { NextRequest, NextResponse };
});
