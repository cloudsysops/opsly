# Skills API

> Documentación de la API de skills para integración

## Funciones Exportadas

### findSkills(query: string): SkillMatch[]

Busca skills por query con fuzzy matching.

```typescript
import { findSkills } from './skill-finder.js';

const matches = findSkills('crear api route');
// [{ name: 'opsly-api', score: 45, triggers: [...] }]
```

### suggestChain(query: string): string[]

Sugiere una cadena de skills para una query.

```typescript
import { suggestChain } from './skill-finder.js';

const chain = suggestChain('crear api route');
// ['opsly-context', 'opsly-api', 'opsly-supabase']
```

### loadSkillContent(name: string): SkillContent

Carga el contenido de un skill.

```typescript
import { loadSkillContent } from './skill-finder.js';

const skill = loadSkillContent('opsly-api');
// { name: 'opsly-api', content: '...', manifest: {...} }
```

### loadSkillsChain(chain: string[]): SkillContent[]

Carga múltiples skills en una cadena.

```typescript
import { loadSkillsChain } from './skill-finder.js';

const skills = loadSkillsChain(['opsly-context', 'opsly-api']);
```

## Tipos

```typescript
interface SkillMatch {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  triggers: string[];
  crossReferences: string[];
  path: string;
}

interface SkillContent {
  name: string;
  content: string;
  manifest: SkillManifest | null;
}

interface SkillManifest {
  name: string;
  version: string;
  description: string;
  triggers: string[];
  inputSchema?: object;
  outputSchema?: object;
  crossReferences?: string[];
  examples?: Array<{ input: object; output: object }>;
}
```

## CLI

```bash
# Buscar skills
node scripts/skill-finder.js "mi query"

# Modo autónomo
node scripts/skill-finder.js "mi query" --autonomous

# JSON output
node scripts/skill-finder.js "mi query" --json

# Auto-cargar
node scripts/skill-loader.js --context "mi query"

# Validar todos
bash scripts/skill-autoload.sh validate
```
