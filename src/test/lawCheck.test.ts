import { describe, it, expect } from "vitest";
import {
  daysSince,
  checkPerceptionDeath,
  checkJudgmentDeath,
  checkLaw,
  LAW_LAST_UPDATED,
  PERCEPTION_DEATH_DAYS,
  JUDGMENT_DEATH_DAYS,
} from "@/lib/lawCheck";

const today = new Date("2026-06-23T12:00:00");

describe("daysSince", () => {
  it("counts calendar days back", () => {
    expect(daysSince("2026-06-20", today)).toBe(3);
    expect(daysSince("2026-06-23", today)).toBe(0);
  });
  it("returns null for empty/invalid", () => {
    expect(daysSince(null, today)).toBeNull();
    expect(daysSince("not-a-date", today)).toBeNull();
  });
});

describe("checkPerceptionDeath (感知死)", () => {
  it("ok when recently recorded", () => {
    expect(checkPerceptionDeath("2026-06-22", today).level).toBe("ok");
  });
  it("warns within 7 days of threshold", () => {
    const d = new Date("2026-06-23");
    d.setDate(d.getDate()); // base
    const last = "2026-06-08"; // 15 days before 2026-06-23 → within warn band (>=14)
    expect(checkPerceptionDeath(last, today).level).toBe("warn");
  });
  it("dead at/after threshold", () => {
    const sig = checkPerceptionDeath("2026-06-01", today); // 22 days
    expect(sig.value).toBeGreaterThanOrEqual(PERCEPTION_DEATH_DAYS);
    expect(sig.level).toBe("dead");
  });
  it("never dead when there is no record at all", () => {
    expect(checkPerceptionDeath(null, today).level).toBe("ok");
  });
});

describe("checkJudgmentDeath (判断死)", () => {
  it("ok right after a law update", () => {
    const sig = checkJudgmentDeath(new Date(LAW_LAST_UPDATED + "T12:00:00"));
    expect(sig.value).toBe(0);
    expect(sig.level).toBe("ok");
  });
  it("dead after a year without changes", () => {
    const oneYearLater = new Date(LAW_LAST_UPDATED + "T12:00:00");
    oneYearLater.setDate(oneYearLater.getDate() + JUDGMENT_DEATH_DAYS);
    expect(checkJudgmentDeath(oneYearLater).level).toBe("dead");
  });
});

describe("checkLaw", () => {
  it("returns both clauses", () => {
    const signals = checkLaw("2026-06-22", today);
    expect(signals.map((s) => s.clause)).toEqual(["感知死", "判断死"]);
  });
});
