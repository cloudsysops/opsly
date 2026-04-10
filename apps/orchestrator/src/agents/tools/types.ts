/**
 * Contrato base de una herramienta para agentes.
 * Nota: usamos `unknown` en vez de `any` por política strict TS del repo.
 */
export interface ToolManifest {
  readonly name: string;
  readonly description: string;
  readonly capabilities: string[];
  readonly riskLevel: "low" | "medium" | "high";
  execute(input: unknown): Promise<unknown>;
}

export interface ToolRegistry {
  register(manifest: ToolManifest): void;
  get(name: string): ToolManifest | undefined;
  search(query: string): ToolManifest[];
  listToolNames(): string[];
}
