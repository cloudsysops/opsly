export interface KafkaMessagePayload {
  message: {
    key?: string;
    value?: Buffer;
    partition: number;
    offset: string;
  };
}

export interface OpslyKafkaClientConfig {
  brokers: string[];
  clientId?: string;
}

export class OpslyKafkaClient {
  private readonly brokers: string[];
  private readonly consumers = new Map<string, (payload: KafkaMessagePayload) => Promise<void>>();

  constructor(config: OpslyKafkaClientConfig) {
    this.brokers = config.brokers;
    void this.brokers;
  }

  async produce(topic: string, message: Record<string, unknown>, key?: string): Promise<void> {
    const payload = JSON.stringify(message);
    process.stdout.write(
      JSON.stringify({
        service: 'orchestrator',
        event: 'kafka_produce_stub',
        topic,
        key: key ?? '',
        size: payload.length,
      }) + '\n'
    );
  }

  async consume(
    topic: string,
    groupId: string,
    eachMessage: (payload: KafkaMessagePayload) => Promise<void>
  ): Promise<void> {
    this.consumers.set(`${topic}:${groupId}`, eachMessage);
  }

  async close(): Promise<void> {
    this.consumers.clear();
  }
}
