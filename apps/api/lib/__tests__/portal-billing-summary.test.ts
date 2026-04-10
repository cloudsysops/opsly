import { describe, expect, it } from "vitest";

import {
    getBillingMonthBoundsUtc,
    roundUsd2,
} from "../portal-billing-summary";

describe("getBillingMonthBoundsUtc", () => {
  it("devuelve abril 2026 y 9 días transcurridos el día 9 UTC", () => {
    const d = new Date(Date.UTC(2026, 3, 9, 12, 0, 0));
    const b = getBillingMonthBoundsUtc(d);
    expect(b.periodStart).toBe("2026-04-01");
    expect(b.periodEnd).toBe("2026-04-30");
    expect(b.daysInMonth).toBe(30);
    expect(b.daysElapsedForRate).toBe(9);
    expect(b.recordedAtGteIso.startsWith("2026-04-01T")).toBe(true);
  });

  it("día 1 del mes: daysElapsedForRate es 1", () => {
    const d = new Date(Date.UTC(2026, 4, 1, 8, 0, 0));
    const b = getBillingMonthBoundsUtc(d);
    expect(b.daysElapsedForRate).toBe(1);
  });
});

describe("roundUsd2", () => {
  it("redondea a 2 decimales", () => {
    expect(roundUsd2(15.555)).toBe(15.56);
    expect(roundUsd2(12)).toBe(12);
  });
});
