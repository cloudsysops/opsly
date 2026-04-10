import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks deben declararse antes de los imports del módulo bajo prueba.
const mockGet = vi.fn().mockResolvedValue(null);
const mockSet = vi.fn().mockResolvedValue("OK");
const mockDel = vi.fn().mockResolvedValue(1);

vi.mock("ioredis", () => ({
  default: vi.fn(() => ({ get: mockGet, set: mockSet, del: mockDel })),
}));

import { withCircuitBreaker, getCircuitState, resetCircuit, CircuitOpenError } from "../circuit-breaker.js";

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(null); // CLOSED por defecto
  mockSet.mockResolvedValue("OK");
  mockDel.mockResolvedValue(1);
});



describe("withCircuitBreaker", () => {
  it("ejecuta la función cuando el circuito está CLOSED", async () => {
    mockGet.mockResolvedValue(null); // sin estado → CLOSED
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withCircuitBreaker("test", fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cuenta fallos y no abre antes del threshold", async () => {
    // 2 fallos previos (< 3 threshold)
    mockGet.mockResolvedValue(JSON.stringify({ state: "CLOSED", failures: 2, openedAt: 0 }));
    const fn = vi.fn().mockRejectedValue(new Error("fallo"));
    await expect(withCircuitBreaker("test", fn)).rejects.toThrow("fallo");
    // El estado persistido debe ser OPEN (failures=3 === threshold)
    const setCall = mockSet.mock.calls[0];
    const saved = JSON.parse(setCall[1] as string);
    expect(saved.state).toBe("OPEN");
    expect(saved.failures).toBe(3);
  });

  it("lanza CircuitOpenError cuando el circuito está OPEN y no ha expirado", async () => {
    const recentOpen = Date.now() - 1_000; // abierto hace 1s
    mockGet.mockResolvedValue(
      JSON.stringify({ state: "OPEN", failures: 3, openedAt: recentOpen }),
    );
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withCircuitBreaker("test", fn)).rejects.toThrow(CircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
  });

  it("pasa a HALF_OPEN cuando el timeout OPEN ha expirado", async () => {
    const expiredOpen = Date.now() - 70_000; // hace 70s > 60s OPEN_DURATION
    mockGet.mockResolvedValue(
      JSON.stringify({ state: "OPEN", failures: 3, openedAt: expiredOpen }),
    );
    const fn = vi.fn().mockResolvedValue("recovered");
    const result = await withCircuitBreaker("test", fn);
    expect(result).toBe("recovered");
    // Verificar que se guardó CLOSED tras el éxito
    const setCall = mockSet.mock.calls[mockSet.mock.calls.length - 1];
    const saved = JSON.parse(setCall[1] as string);
    expect(saved.state).toBe("CLOSED");
  });

  it("vuelve a OPEN si la llamada HALF_OPEN falla", async () => {
    const expiredOpen = Date.now() - 70_000;
    mockGet.mockResolvedValue(
      JSON.stringify({ state: "HALF_OPEN", failures: 3, openedAt: expiredOpen }),
    );
    const fn = vi.fn().mockRejectedValue(new Error("todavía roto"));
    await expect(withCircuitBreaker("test", fn)).rejects.toThrow("todavía roto");
    const setCall = mockSet.mock.calls[mockSet.mock.calls.length - 1];
    const saved = JSON.parse(setCall[1] as string);
    expect(saved.state).toBe("OPEN");
  });

  it("resetCircuit escribe snapshot CLOSED", async () => {
    mockGet.mockResolvedValue(null);
    await resetCircuit("test");
    const setCall = mockSet.mock.calls[0];
    const saved = JSON.parse(setCall[1] as string);
    expect(saved.state).toBe("CLOSED");
    expect(saved.failures).toBe(0);
  });

  it("getCircuitState retorna CLOSED cuando no hay estado", async () => {
    mockGet.mockResolvedValue(null);
    const state = await getCircuitState("test");
    expect(state).toBe("CLOSED");
  });
});
