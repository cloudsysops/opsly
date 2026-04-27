export interface BlogPostInput {
  niche: string;
  audience: string;
  title: string;
  primaryKeyword: string;
  callToAction: string;
}

export interface BlogPostOutput {
  markdown: string;
  tags: string[];
  assistedByAi: true;
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body}\n`;
}

export function generateBlogPost(input: BlogPostInput): BlogPostOutput {
  const markdown = [
    `# ${input.title}`,
    '',
    '_Asistido por IA_',
    '',
    `Opsly ayuda a ${input.audience} en el nicho ${input.niche} con un enfoque operativo pragmatico y orientado a resultados.`,
    '',
    section(
      'Problema',
      `Muchos equipos tienen friccion en automatizacion y operacion diaria. El costo de coordinacion sube y la ejecucion baja.`
    ),
    section(
      'Enfoque Opsly',
      `Estandarizar despliegues multi-tenant, observabilidad y ejecucion de agentes para reducir tiempos de entrega y errores.`
    ),
    section(
      'Resultado esperado',
      `Con una adopcion incremental, el equipo mejora velocidad operativa y calidad de servicio sin aumentar complejidad tecnica.`
    ),
    section('Palabra clave', `Keyword principal: **${input.primaryKeyword}**`),
    `**CTA:** ${input.callToAction}`,
    '',
  ].join('\n');

  return {
    markdown,
    tags: ['opsly', 'growth', input.niche, input.primaryKeyword],
    assistedByAi: true,
  };
}
