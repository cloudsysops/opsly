#!/usr/bin/env node
/**
 * Golden Path: scaffolding de herramientas del orchestrator (ToolManifest + Zod + tests).
 * Uso: npm run create-tool -- <slug-kebab>
 * Ejemplo: npm run create-tool -- browserbase
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const TOOLS_ROOT = path.join(REPO_ROOT, 'apps', 'orchestrator', 'src', 'agents', 'tools');
const REGISTRY_PATH = path.join(TOOLS_ROOT, 'registry.ts');

function die(msg) {
  console.error(`create-tool: ${msg}`);
  process.exit(1);
}

/**
 * @param {string} raw
 * @returns {string}
 */
function normalizeSlug(raw) {
  return raw.trim().toLowerCase();
}

/**
 * slug "my-tool" -> "MyTool"
 * @param {string} slug
 * @returns {string}
 */
function slugToPascal(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * @param {string} slug
 * @returns {string}
 */
function toolNameFromSlug(slug) {
  return slug.replace(/-/g, '_');
}

/**
 * @param {string} slug
 * @param {string} pascal
 * @param {string} toolName
 */
function writeToolFiles(slug, pascal, toolName) {
  const dir = path.join(TOOLS_ROOT, slug);
  if (fs.existsSync(dir)) {
    die(`el directorio ya existe: ${path.relative(REPO_ROOT, dir)}`);
  }
  fs.mkdirSync(dir, { recursive: true });

  const className = `${pascal}Tool`;
  const schemaName = `${pascal}InputSchema`;

  const toolTs = `import type { ToolManifest } from "../types.js";
import { ${schemaName} } from "./${slug}.schema.js";

/**
 * Herramienta generada por \`npm run create-tool -- ${slug}\`.
 * Camino dorado: ajusta descripción, capabilities y lógica en execute().
 */
export class ${className} implements ToolManifest {
  readonly name = "${toolName}";
  readonly description =
    "TODO: describe qué hace esta herramienta (una frase clara para el agente).";
  readonly capabilities = ["integration", "${toolName}"];
  readonly riskLevel = "low" as const;

  async execute(input: unknown): Promise<unknown> {
    const parsed = ${schemaName}.safeParse(
      typeof input === "object" && input !== null ? input : {},
    );
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        issues: parsed.error.flatten(),
      };
    }

    // TODO: implementar integración real usando parsed.data
    return {
      ok: true,
      message: "stub: implementar lógica",
      received: parsed.data,
    };
  }
}
`;

  const schemaTs = `import { z } from "zod";

/** Entrada validada antes de ejecutar ${className}. */
export const ${schemaName} = z.object({
  /** Ejemplo: sustituir por campos reales */
  query: z.string().min(1).optional().describe("Texto de ejemplo para la herramienta"),
});

export type ${pascal}Input = z.infer<typeof ${schemaName}>;
`;

  const testTs = `import { describe, expect, it } from "vitest";

import { ${className} } from "./${slug}.tool.js";
import { ${schemaName} } from "./${slug}.schema.js";

describe("${className}", () => {
  it("rechaza tipos inválidos en el esquema", () => {
    const bad = ${schemaName}.safeParse({ query: "" });
    expect(bad.success).toBe(false);
  });

  it("ejecuta y devuelve resultado estructurado", async () => {
    const tool = new ${className}();
    const out = await tool.execute({ query: "hello" });
    expect(out).toEqual(
      expect.objectContaining({
        ok: true,
      }),
    );
  });
});
`;

  const readme = `# ${className}

Generado con \`npm run create-tool -- ${slug}\`.

## Contrato

- **Nombre en runtime:** \`${toolName}\`
- **Esquema:** \`${slug}.schema.ts\` (${schemaName})
- **Registro:** \`createDefaultToolRegistry()\` en \`../registry.ts\`

## Siguientes pasos

1. Ajustar \`description\`, \`capabilities\`, \`riskLevel\` en \`${slug}.tool.ts\`.
2. Definir campos reales en \`${slug}.schema.ts\`.
3. Implementar la lógica en \`execute()\`.
4. \`npm run type-check --workspace=@intcloudsysops/orchestrator\` y \`npm run test:tools\`.
`;

  fs.writeFileSync(path.join(dir, `${slug}.tool.ts`), toolTs, 'utf8');
  fs.writeFileSync(path.join(dir, `${slug}.schema.ts`), schemaTs, 'utf8');
  fs.writeFileSync(path.join(dir, `${slug}.test.ts`), testTs, 'utf8');
  fs.writeFileSync(path.join(dir, 'README.md'), readme, 'utf8');
}

/**
 * @param {string} slug
 * @param {string} pascal
 */
function patchRegistry(slug, pascal) {
  const className = `${pascal}Tool`;
  const importLine = `import { ${className} } from "./${slug}/${slug}.tool.js";`;
  let content = fs.readFileSync(REGISTRY_PATH, 'utf8');

  if (content.includes(importLine)) {
    die(`registry.ts ya importa ${className}`);
  }

  const afterTavily = `import { TavilyTool } from "./tavily-tool.js";`;
  if (!content.includes(afterTavily)) {
    die(
      'no se encontró el ancla de import en registry.ts (import TavilyTool); actualiza create-tool.js'
    );
  }

  content = content.replace(afterTavily, `${afterTavily}\n${importLine}`);

  const afterBuiltin = `    new TavilyTool(),`;
  if (!content.includes(afterBuiltin)) {
    die(
      'no se encontró el ancla builtins en registry.ts (new TavilyTool()); actualiza create-tool.js'
    );
  }

  content = content.replace(afterBuiltin, `${afterBuiltin}\n    new ${className}(),`);

  fs.writeFileSync(REGISTRY_PATH, content, 'utf8');
}

function main() {
  const raw = process.argv[2];
  if (!raw || !String(raw).trim()) {
    die('pasá un nombre: npm run create-tool -- <slug-kebab>  (ej: browserbase)');
  }

  const slug = normalizeSlug(raw);
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug)) {
    die('slug inválido: solo minúsculas, números y guiones (ej: browserbase, my-integration)');
  }

  const pascal = slugToPascal(slug);
  if (!pascal) {
    die('no se pudo derivar el nombre de clase');
  }

  const toolName = toolNameFromSlug(slug);

  writeToolFiles(slug, pascal, toolName);
  patchRegistry(slug, pascal);

  console.log('');
  console.log(`✓ Camino dorado: herramienta ${pascal} creada en`);
  console.log(`  apps/orchestrator/src/agents/tools/${slug}/`);
  console.log('');
  console.log('Siguiente: revisar description/capabilities, implementar execute(), luego:');
  console.log('  npm run type-check --workspace=@intcloudsysops/orchestrator');
  console.log('  npm run test:tools');
  console.log('');
}

main();
