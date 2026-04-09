import { describe, it, expect } from "vitest";
import { formatDuration, formatHM } from "@/lib/formatDuration";

describe("formatDuration", () => {
  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("00:00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("00:02:05");
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("pads all components to 2 digits", () => {
    expect(formatDuration(3600)).toBe("01:00:00");
  });

  it("handles large values (10+ hours)", () => {
    expect(formatDuration(36000)).toBe("10:00:00");
  });
});

describe("formatHM", () => {
  it("shows only minutes when under an hour", () => {
    expect(formatHM(1800)).toBe("30m");
  });

  it("shows only hours when no remaining minutes", () => {
    expect(formatHM(7200)).toBe("2h");
  });

  it("shows hours and minutes", () => {
    expect(formatHM(5400)).toBe("1h 30m");
  });

  it("returns 0m for zero seconds", () => {
    expect(formatHM(0)).toBe("0m");
  });

  it("handles sub-minute values", () => {
    expect(formatHM(30)).toBe("0m");
  });
});
