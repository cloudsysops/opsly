import type { AiGateway } from './gateway.js';
import type { AiProviderKind } from '../types/index.js';
import { createGeminiGateway } from './gemini-provider.js';
import { createMockGateway } from './mock-provider.js';
import { createStubAiGateway } from './stub-provider.js';

export interface AiGatewayOptions {
  provider: AiProviderKind;
  geminiApiKey?: string;
  geminiModel?: string;
}

const STUB_PROVIDERS: readonly AiProviderKind[] = [
  'openai',
  'anthropic',
  'openrouter',
  'ollama',
];

export function createAiGateway(options: AiGatewayOptions): AiGateway {
  if (options.provider === 'gemini') {
    return createGeminiGateway({
      apiKey: options.geminiApiKey,
      model: options.geminiModel,
    });
  }
  if (STUB_PROVIDERS.includes(options.provider)) {
    return createStubAiGateway(options.provider);
  }
  return createMockGateway();
}

export type { AiGateway } from './gateway.js';
export { createGeminiGateway } from './gemini-provider.js';
export { createMockGateway } from './mock-provider.js';
export {
  AiProviderNotConfiguredError,
  createStubAiGateway,
} from './stub-provider.js';
