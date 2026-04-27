/**
 * skill-validator.ts — Validador mejorado de skills
 * Valida: manifest.json, triggers, cross-references, ejemplos
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ValidationError {
  skill: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ValidationResult {
  ok: boolean;
  skills: string[];
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
}

const REQUIRED_MANIFEST_FIELDS = ['name', 'version', 'description', 'triggers'];
const SUGGESTED_FIELDS = ['inputSchema', 'outputSchema', 'crossReferences', 'examples'];

export function validateManifest(manifestPath: string, skillName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!existsSync(manifestPath)) {
    errors.push({
      skill: skillName,
      field: 'manifest.json',
      message: 'manifest.json no existe',
      severity: 'error',
    });
    return errors;
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    for (const field of REQUIRED_MANIFEST_FIELDS) {
      if (!manifest[field]) {
        errors.push({
          skill: skillName,
          field,
          message: `Campo requerido '${field}' falta en manifest.json`,
          severity: 'error',
        });
      }
    }

    for (const field of SUGGESTED_FIELDS) {
      if (!manifest[field]) {
        errors.push({
          skill: skillName,
          field,
          message: `Campo sugerido '${field}' no presente`,
          severity: 'warning',
        });
      }
    }

    if (manifest.triggers && !Array.isArray(manifest.triggers)) {
      errors.push({
        skill: skillName,
        field: 'triggers',
        message: 'triggers debe ser un array',
        severity: 'error',
      });
    }

    if (manifest.triggers && manifest.triggers.length < 3) {
      errors.push({
        skill: skillName,
        field: 'triggers',
        message: `Solo ${manifest.triggers.length} triggers — mínimo recomendado: 5`,
        severity: 'warning',
      });
    }

    if (manifest.crossReferences && !Array.isArray(manifest.crossReferences)) {
      errors.push({
        skill: skillName,
        field: 'crossReferences',
        message: 'crossReferences debe ser un array',
        severity: 'error',
      });
    }

    if (manifest.examples && !Array.isArray(manifest.examples)) {
      errors.push({
        skill: skillName,
        field: 'examples',
        message: 'examples debe ser un array',
        severity: 'error',
      });
    }
  } catch (e) {
    errors.push({
      skill: skillName,
      field: 'manifest.json',
      message: `JSON inválido: ${e instanceof Error ? e.message : String(e)}`,
      severity: 'error',
    });
  }

  return errors;
}

export function validateSkillMd(mdPath: string, skillName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!existsSync(mdPath)) {
    errors.push({
      skill: skillName,
      field: 'SKILL.md',
      message: 'SKILL.md no existe',
      severity: 'error',
    });
    return errors;
  }

  const content = readFileSync(mdPath, 'utf-8');

  if (content.length < 200) {
    errors.push({
      skill: skillName,
      field: 'SKILL.md',
      message: 'SKILL.md muy corto (<200 chars)',
      severity: 'warning',
    });
  }

  const requiredSections = ['Cuándo usar', 'Reglas'];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push({
        skill: skillName,
        field: 'SKILL.md',
        message: `Sección '${section}' no encontrada`,
        severity: 'warning',
      });
    }
  }

  if (!content.includes('> **Triggers:**')) {
    errors.push({
      skill: skillName,
      field: 'SKILL.md',
      message: 'Encabezado con triggers no encontrado (formato: > **Triggers:** ...)',
      severity: 'warning',
    });
  }

  return errors;
}

export function validateCrossReferences(
  manifest: Record<string, unknown>,
  allSkills: string[],
  skillName: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!manifest.crossReferences || !Array.isArray(manifest.crossReferences)) {
    return errors;
  }

  for (const ref of manifest.crossReferences) {
    if (!allSkills.includes(ref)) {
      errors.push({
        skill: skillName,
        field: 'crossReferences',
        message: `Referencia '${ref}' no existe en el índice de skills`,
        severity: 'error',
      });
    }
  }

  return errors;
}

export function validateAllSkills(skillsRoot: string, indexPath?: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const suggestions: string[] = [];
  const skills: string[] = [];

  let allSkillNames: string[] = [];
  if (indexPath && existsSync(indexPath)) {
    try {
      const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
      allSkillNames = index.skills?.map((s: { name: string }) => s.name) || [];
    } catch {
      suggestions.push('No se pudo leer skills/index.json');
    }
  }

  if (!existsSync(skillsRoot)) {
    return {
      ok: false,
      skills: [],
      errors: [
        {
          skill: '',
          field: '',
          message: `Skills root no existe: ${skillsRoot}`,
          severity: 'error',
        },
      ],
      warnings: [],
      suggestions: [],
    };
  }

  const entries = readdirSync(skillsRoot);
  for (const name of entries) {
    const dir = join(skillsRoot, name);
    if (!statSync(dir).isDirectory()) continue;

    skills.push(name);

    const manifestPath = join(dir, 'manifest.json');
    const mdPath = join(dir, 'SKILL.md');

    const manifestErrors = validateManifest(manifestPath, name);
    const mdErrors = validateSkillMd(mdPath, name);

    for (const e of [...manifestErrors, ...mdErrors]) {
      if (e.severity === 'error') errors.push(e);
      else warnings.push(e);
    }

    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        const refErrors = validateCrossReferences(manifest, allSkillNames, name);
        errors.push(...refErrors);
      } catch {}
    }
  }

  if (skills.length < 10) {
    suggestions.push(`Solo ${skills.length} skills — esperado: 15+`);
  }

  return {
    ok: errors.length === 0,
    skills,
    errors,
    warnings,
    suggestions,
  };
}

export function generateReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('\n' + '═'.repeat(60));
  lines.push('REPORTE DE VALIDACIÓN DE SKILLS');
  lines.push('═'.repeat(60));

  lines.push(`\n📦 Skills encontrados: ${result.skills.length}`);
  lines.push(`✅ Estado: ${result.ok ? 'VÁLIDO' : 'CON ERRORES'}`);

  if (result.errors.length > 0) {
    lines.push(`\n❌ Errores (${result.errors.length}):`);
    for (const e of result.errors) {
      lines.push(`   • [${e.skill}] ${e.field}: ${e.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`\n⚠️  Warnings (${result.warnings.length}):`);
    for (const w of result.warnings) {
      lines.push(`   • [${w.skill}] ${w.field}: ${w.message}`);
    }
  }

  if (result.suggestions.length > 0) {
    lines.push(`\n💡 Sugerencias:`);
    for (const s of result.suggestions) {
      lines.push(`   • ${s}`);
    }
  }

  lines.push('\n' + '═'.repeat(60));

  return lines.join('\n');
}

// CLI
if (import.meta.url.endsWith(process.argv[1]?.replace(/^file:\/\//, '') || '')) {
  const skillsRoot = join(__dirname, '..', '..', '..', 'skills', 'user');
  const indexPath = join(__dirname, '..', '..', '..', 'skills', 'index.json');

  const result = validateAllSkills(skillsRoot, indexPath);
  console.log(generateReport(result));

  process.exit(result.ok ? 0 : 1);
}
