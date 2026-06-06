---
title: "@intcloudsysops/evaluation"
description: "Testing, validation, and quality metrics framework"
---
# @intcloudsysops/evaluation

Testing, validation, and quality metrics framework for agent outputs. Provides automated QA gates, safety checks, and regression detection.

## Features

- ✅ **Input/Output Validators** — Schema validation, required fields
- 🔐 **Safety Checks** — PII detection, hallucination detection, toxicity filtering
- 📊 **Quality Metrics** — BLEU, ROUGE, custom scoring
- 🧪 **Test Runners** — Smoke tests, regression tests, integration tests
- 📈 **Performance Metrics** — Latency, token usage, cost per inference

## Usage

### Validate Input

```typescript
import { validateInput } from '@intcloudsysops/evaluation';

const result = validateInput(userInput, agentSchema);
if (!result.valid) {
  console.error('Invalid input:', result.errors);
}
```

### Check Safety

```typescript
import { checkForPII, checkForHallucinations } from '@intcloudsysops/evaluation';

const piiErrors = checkForPII(agentOutput);
const hallErrors = checkForHallucinations(generated, context);

if (piiErrors.length > 0 || hallErrors.length > 0) {
  // Block output, log violation
}
```

### Calculate Quality

```typescript
import { scoreQuality } from '@intcloudsysops/evaluation';

const metrics = scoreQuality(referenceOutput, generatedOutput);
console.log(`BLEU: ${metrics.bleu}, ROUGE: ${metrics.rouge}`);
```

### Run Tests

```typescript
import { runSmokeTests, runRegressionTests } from '@intcloudsysops/evaluation';

const tests = [
  { name: 'test-1', input: { query: 'hello' }, expectedOutput: 'greeting' },
];

const results = await runSmokeTests(tests);
const passed = results.filter(r => r.passed).length;
console.log(`Passed ${passed}/${results.length} tests`);
```

## Integration by Service

### Orchestrator

```typescript
import { validateInput, runSmokeTests } from '@intcloudsysops/evaluation';

async function executeAgent(input: unknown) {
  const validation = validateInput(input, agentSchema);
  if (!validation.valid) throw new Error('Invalid input');

  const output = await agent.execute(input);
  return output;
}
```

### API

```typescript
import { checkForPII, scoreQuality } from '@intcloudsysops/evaluation';

app.post('/api/agents/:id/execute', async (req, res) => {
  const { input } = req.body;
  const output = await agent.execute(input);

  const pii = checkForPII(output);
  if (pii.length > 0) return res.status(400).json({ error: 'Safety check failed' });

  res.json({ output });
});
```

## Quality Baselines

Set per-agent baselines to catch regressions:

```typescript
const baseline = {
  bleu: 0.45,     // Minimum BLEU score
  rouge: 0.50,    // Minimum ROUGE score
  latency: 500,   // Maximum latency (ms)
  tokensUsed: 500, // Maximum tokens
};

// Check regression
if (metrics.bleu < baseline.bleu) {
  alert('Quality regression detected');
}
```

## Test Datasets

### Golden Dataset

Reference outputs for regression testing:

```
datasets/golden/
├── agent-automation-v1.json    # 50 test cases
├── agent-automation-v2.json    # 50 test cases (updated)
└── README.md                   # Dataset version notes
```

### Adversarial Dataset

Edge cases and attack vectors:

```
datasets/adversarial/
├── prompt-injection.json       # Jailbreak attempts (canonical: lib/prompt-guard/datasets/adversarial/)
├── pii-leak.json               # PII in prompts
└── hallucination.json          # Factually incorrect inputs
```

## See Also

- `GOVERNANCE.md` — Quality standards, SLOs
- `__tests__/` — Integration tests, examples
- `config/modules.json` — Module registry

---

## Enlaces relacionados

- [[lib/evaluation/README|evaluation]]
- [[README|Inicio]]
