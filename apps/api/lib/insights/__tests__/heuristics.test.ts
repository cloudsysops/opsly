import { describe, expect, it } from "vitest";
import {
  churnRiskFromLastUsage,
  linearForecastNext,
  zScoreAnomaly,
} from "../heuristics";

describe("churnRiskFromLastUsage", () => {
  it("returns null when recent activity", () => {
    const now = "2026-04-12T12:00:00.000Z";
    const r = churnRiskFromLastUsage({
      lastUsageAt: "2026-04-10T12:00:00.000Z",
      nowIso: now,
      inactiveDaysThreshold: 7,
    });
    expect(r).toBeNull();
  });

  it("returns elevated risk when inactive beyond threshold", () => {
    const now = "2026-04-12T12:00:00.000Z";
    const r = churnRiskFromLastUsage({
      lastUsageAt: "2026-04-01T12:00:00.000Z",
      nowIso: now,
      inactiveDaysThreshold: 7,
    });
    expect(r).not.toBeNull();
    expect(r?.risk).toBeGreaterThan(0.45);
  });
});

describe("linearForecastNext", () => {
  it("returns null for short series", () => {
    expect(linearForecastNext([1, 2])).toBeNull();
  });

  it("extrapolates next positive value", () => {
    const r = linearForecastNext([1, 2, 3, 4, 5]);
    expect(r).not.toBeNull();
    expect(r?.next).toBeGreaterThan(0);
  });
});

describe("zScoreAnomaly", () => {
  it("returns null when series too short", () => {
    expect(zScoreAnomaly([1, 2, 3, 4, 5, 6])).toBeNull();
  });

  it("detects spike in last value", () => {
    const base = Array.from({ length: 20 }, () => 5);
    const series = [...base, 80];
    const z = zScoreAnomaly(series);
    expect(z).not.toBeNull();
    expect(z?.z).toBeGreaterThan(2);
  });
});
