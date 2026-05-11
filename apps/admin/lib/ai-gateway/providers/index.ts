import { AiGatewayError, type AiGatewayProvider, type AiGatewayProviderName } from '../types';
import { NvidiaProvider } from './nvidia';

function providerName(): AiGatewayProviderName {
  const raw = process.env.AI_GATEWAY_PROVIDER?.trim().toLowerCase() || 'nvidia';
  if (raw === 'nvidia') return raw;
  throw new AiGatewayError(`Unsupported AI gateway provider: ${raw}`, 500);
}

export function createAiGatewayProvider(): AiGatewayProvider {
  switch (providerName()) {
    case 'nvidia':
      return new NvidiaProvider();
  }
}
