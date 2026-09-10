import routingConfig from '../../config/pc-gamer-model-routing.json';

export type PcGamerTaskType =
  | 'code'
  | 'research'
  | 'technical-reasoning'
  | 'summary'
  | 'classify'
  | 'support'
  | 'qa'
  | 'vision'
  | 'fallback'
  | 'smoke';

type ModelConfig = {
  role: string;
  taskTypes: PcGamerTaskType[];
  heavy: boolean;
  fallbacks: string[];
};

type RoutingConfig = {
  provider: string;
  costUsdPerRequest: number;
  defaultModel: string;
  maxConcurrentHeavyJobs: number;
  vramBusyThresholdPct: number;
  minimumFreeVramGbForHeavyJob: number;
  models: Record<string, ModelConfig>;
};

const config = routingConfig as RoutingConfig;

export class PcGamerModelRoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PcGamerModelRoutingError';
  }
}

export function canonicalModelName(model: string): string {
  const trimmed = model.trim();
  if (!trimmed) throw new PcGamerModelRoutingError('model must not be empty');
  return trimmed.startsWith('ollama/') ? trimmed : `ollama/${trimmed}`;
}

export function isApprovedModel(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(config.models, canonicalModelName(model));
}

export function modelForTask(taskType?: PcGamerTaskType): string {
  if (!taskType) return config.defaultModel;
  const match = Object.entries(config.models).find(([, value]) =>
    value.taskTypes.includes(taskType)
  );
  return match?.[0] ?? config.defaultModel;
}

export function resolvePcGamerModel(input: {
  requestedModel?: string;
  taskType?: PcGamerTaskType;
  environmentModel?: string;
}): { model: string; role: string; explicit: boolean; fallback: string[] } {
  const candidate = input.requestedModel?.trim()
    ? canonicalModelName(input.requestedModel)
    : input.taskType
      ? modelForTask(input.taskType)
      : input.environmentModel?.trim()
        ? canonicalModelName(input.environmentModel)
        : config.defaultModel;

  const model = config.models[candidate];
  if (!model) {
    throw new PcGamerModelRoutingError(`model is not approved for PC gamer: ${candidate}`);
  }

  return {
    model: candidate,
    role: model.role,
    explicit: Boolean(input.requestedModel?.trim()),
    fallback: model.fallbacks,
  };
}

export function canScheduleHeavyJob(input: {
  model: string;
  activeHeavyJobs: number;
  vramTotalGb?: number;
  vramUsedGb?: number;
}): { ok: boolean; reason?: string } {
  const model = config.models[canonicalModelName(input.model)];
  if (!model?.heavy) return { ok: true };
  if (input.activeHeavyJobs >= config.maxConcurrentHeavyJobs) {
    return { ok: false, reason: 'heavy_model_concurrency_limit' };
  }
  if (typeof input.vramTotalGb === 'number' && typeof input.vramUsedGb === 'number') {
    const free = input.vramTotalGb - input.vramUsedGb;
    if (free < config.minimumFreeVramGbForHeavyJob) {
      return { ok: false, reason: 'insufficient_free_vram' };
    }
  }
  return { ok: true };
}

export function pcGamerRoutingConfig(): RoutingConfig {
  return config;
}
