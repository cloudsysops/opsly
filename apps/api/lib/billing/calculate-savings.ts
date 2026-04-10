export interface SavingsResult {
  /** Porcentaje ahorrado respecto al costo “mercado” (0–100). */
  readonly percentSaved: number;
  /** Diferencia en USD: rawCost − opslyCost. */
  readonly amountSavedUsd: number;
}

/**
 * Calcula ahorro para mostrar al cliente (“Te ahorraste $X…”).
 * Si `rawCost` ≤ 0, no hay base de comparación: devuelve 0 % y 0 USD.
 */
export function calculateSavings(rawCost: number, opslyCost: number): SavingsResult {
  if (!Number.isFinite(rawCost) || !Number.isFinite(opslyCost)) {
    return { percentSaved: 0, amountSavedUsd: 0 };
  }
  if (rawCost <= 0) {
    return { percentSaved: 0, amountSavedUsd: 0 };
  }
  const amountSavedUsd = rawCost - opslyCost;
  const percentSaved = Math.max(0, Math.min(100, (amountSavedUsd / rawCost) * 100));
  return {
    percentSaved: Math.round(percentSaved * 100) / 100,
    amountSavedUsd: Math.round(amountSavedUsd * 100) / 100,
  };
}
