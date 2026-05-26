import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z, ZodError } from 'zod';
import {
  generateAIContent,
  generateAIContentBilingual,
  createLLMClient,
  type AIGenerationParams,
} from '@intcloudsysops/content-studio';

const START_TIME = Date.now();

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.CONTENT_STUDIO_API_KEY;
  if (!apiKey) {
    // No key configured → open (dev mode)
    next();
    return;
  }
  const provided = req.headers['x-api-key'];
  if (provided !== apiKey) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }
  next();
}

// ─── Request schemas ──────────────────────────────────────────────────────────

const GenerateSchema = z.object({
  topic: z.enum(['opsly', 'technology', 'motivation']),
  tenant_slug: z.string().min(1).max(80),
  language: z.enum(['es', 'en', 'both']).default('both'),
  platforms: z
    .array(z.string())
    .min(1)
    .max(6)
    .default(['instagram', 'youtube', 'tiktok']),
  context: z.string().max(500).optional(),
  tone: z.enum(['technical', 'friendly', 'corporate', 'casual']).default('friendly'),
});

const BatchGenerateSchema = z.object({
  requests: z
    .array(GenerateSchema)
    .min(1)
    .max(5, { message: 'Max 5 requests per batch' }),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function startServer(port: number): Promise<void> {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── Health ──────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'content-studio-service',
      version: '1.0.0',
      uptime_ms: Date.now() - START_TIME,
      provider: process.env.LLM_PROVIDER ?? 'anthropic',
    });
  });

  // ── Generate single draft ───────────────────────────────────────────────────
  app.post('/generate', requireApiKey, async (req, res) => {
    let params: AIGenerationParams;
    try {
      params = GenerateSchema.parse(req.body) as AIGenerationParams;
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ ok: false, error: 'Validation error', issues: err.issues });
        return;
      }
      throw err;
    }

    const client = createLLMClient(params.tenant_slug);

    if (params.language === 'both') {
      const result = await generateAIContentBilingual(params, client);
      res.json({ ok: true, result });
    } else {
      const draft = await generateAIContent(params, client);
      res.json({ ok: true, draft });
    }
  });

  // ── Generate batch ──────────────────────────────────────────────────────────
  app.post('/generate/batch', requireApiKey, async (req, res) => {
    let parsed: z.infer<typeof BatchGenerateSchema>;
    try {
      parsed = BatchGenerateSchema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ ok: false, error: 'Validation error', issues: err.issues });
        return;
      }
      throw err;
    }

    const results = await Promise.allSettled(
      parsed.requests.map(async (params) => {
        const client = createLLMClient(params.tenant_slug);
        if (params.language === 'both') {
          return generateAIContentBilingual(params as AIGenerationParams, client);
        }
        return generateAIContent(params as AIGenerationParams, client);
      })
    );

    const drafts = results.map((r, i) =>
      r.status === 'fulfilled'
        ? { ok: true, index: i, data: r.value }
        : { ok: false, index: i, error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
    );

    res.json({ ok: true, drafts });
  });

  // ── Error handler ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[content-studio-service] Unhandled error:', err);
    res.status(500).json({ ok: false, error: message });
  });

  await new Promise<void>((resolve) => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`[content-studio-service] Listening on port ${port}`);
      console.log(`[content-studio-service] Provider: ${process.env.LLM_PROVIDER ?? 'anthropic'}`);
      resolve();
    });
  });
}
