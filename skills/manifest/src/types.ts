/**
 * Metadata opcional por skill: manifest.json y/o frontmatter en SKILL.md.
 * Los esquemas son JSON Schema genéricos (objeto JSON).
 */
export interface SkillMetadata {
  /** Identificador; suele coincidir con el directorio bajo skills/user/ */
  name: string;
  version?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface LoadedSkillMetadata {
  metadata: SkillMetadata;
  /** Contenido SKILL.md tras el bloque frontmatter (si hubo). */
  bodyMarkdown: string;
  paths: {
    skillMd: string;
    manifestJson?: string;
  };
}
