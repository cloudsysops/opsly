import { describe, expect, it } from "vitest";

import { calculateSavings } from "../calculate-savings";

describe("calculateSavings", () => {
  it("calcula porcentaje y monto ahorrado", () => {
    const r = calculateSavings(100, 40);
    expect(r.amountSavedUsd).toBe(60);
    expect(r.percentSaved).toBe(60);
  });

  it("devuelve 0 si rawCost no es positivo", () => {
    expect(calculateSavings(0, 0).percentSaved).toBe(0);
    expect(calculateSavings(-10, 5).amountSavedUsd).toBe(0);
  });

  it("limita porcentaje a 100 cuando opslyCost es negativo", () => {
    const r = calculateSavings(100, -50);
    expect(r.percentSaved).toBe(100);
    expect(r.amountSavedUsd).toBe(150);
  });

  it("maneja NaN", () => {
    const r = calculateSavings(Number.NaN, 1);
    expect(r.percentSaved).toBe(0);
    expect(r.amountSavedUsd).toBe(0);
  });
});
