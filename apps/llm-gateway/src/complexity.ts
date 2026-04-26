export type ComplexityLevel = 1 | 2 | 3;

export interface ComplexityAnalysis {
  level: ComplexityLevel;
  reasoning: string;
  signals: string[];
  should_decompose: boolean;
  estimated_tokens: number;
}

const SIGNALS = {
  level1: [
    { pattern: /clasifica|categoriza|es spam|sentimiento|etiqueta/i, weight: 2 },
    { pattern: /extrae|lista|dame los|enumera|parsea/i, weight: 2 },
    { pattern: /sí o no|true o false|boolean/i, weight: 3 },
    { pattern: /formato json|formato csv|convierte a/i, weight: 2 },
  ],
  level3: [
    { pattern: /diseña|arquitectura|sistema complejo|decide/i, weight: 2 },
    { pattern: /refactoriza|optimiza este código|debug profundo/i, weight: 2 },
    { pattern: /estrategia|planifica|roadmap|propuesta/i, weight: 2 },
    { pattern: /explica por qué|razona|análisis profundo/i, weight: 1 },
  ],
};

export function analyzeComplexity(
  prompt: string,
  options?: {
    is_customer_facing?: boolean;
    has_code?: boolean;
    context_length?: number;
  }
): ComplexityAnalysis {
  let score1 = 0;
  let score3 = 0;
  const signals: string[] = [];

  for (const sig of SIGNALS.level1) {
    if (sig.pattern.test(prompt)) {
      score1 += sig.weight;
      signals.push(`simple: ${sig.pattern.source}`);
    }
  }
  for (const sig of SIGNALS.level3) {
    if (sig.pattern.test(prompt)) {
      score3 += sig.weight;
      signals.push(`complex: ${sig.pattern.source}`);
    }
  }

  if (prompt.length < 150) score1 += 2;
  else if (prompt.length > 1200) score3 += 2;

  if (options?.is_customer_facing) score3 += 1;
  if (options?.has_code) score3 += 1;
  if ((options?.context_length ?? 0) > 4000) score3 += 2;

  let level: ComplexityLevel;
  if (score3 >= 4) level = 3;
  else if (score1 >= 4) level = 1;
  else level = 2;

  const estimated_tokens = Math.ceil(prompt.length / 4);
  const should_decompose = level === 3 && estimated_tokens > 500;

  return {
    level,
    reasoning: `score1=${score1} score3=${score3}`,
    signals,
    should_decompose,
    estimated_tokens,
  };
}
