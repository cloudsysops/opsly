import { Queue, Worker, type JobsOptions } from 'bullmq';
import { OpslyKafkaClient, type KafkaMessagePayload } from './kafka-client.js';
import { connection } from '../queue.js';

export interface KafkaBullBridgeConfig {
  kafkaBrokers: string[];
  queueName?: string;
}

export class KafkaBullMQBridge {
  private readonly kafkaClient: OpslyKafkaClient;
  private readonly bullQueue: Queue;
  private worker: Worker | null = null;

  constructor(config: KafkaBullBridgeConfig) {
    this.kafkaClient = new OpslyKafkaClient({
      brokers: config.kafkaBrokers,
      clientId: 'opsly-orchestrator-bridge',
    });
    this.bullQueue = new Queue(config.queueName ?? 'opsly-kafka-jobs', { connection });
  }

  async startKafkaToBullBridge(topic: string, groupId: string): Promise<void> {
    await this.kafkaClient.consume(topic, groupId, async ({ message }: KafkaMessagePayload) => {
      const value = message.value?.toString();
      if (!value) {
        return;
      }
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const jobName = typeof parsed.type === 'string' ? parsed.type : 'kafka-event';
      const opts: JobsOptions = {
        attempts: 2,
        backoff: { type: 'fixed', delay: 1500 },
      };
      await this.bullQueue.add(jobName, {
        ...parsed,
        metadata: {
          source: 'kafka-bridge',
          kafka_topic: topic,
          kafka_partition: message.partition,
          kafka_offset: message.offset,
        },
      }, opts);
    });
  }

  startBullToKafkaBridge(topic = 'opsly.job.completed'): void {
    this.worker = new Worker(
      this.bullQueue.name,
      async (job) => {
        await this.kafkaClient.produce(topic, {
          job_id: String(job.id),
          job_name: job.name,
          status: 'completed',
          timestamp: Date.now(),
          payload: job.data,
        });
        return job.data;
      },
      { connection }
    );
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    await this.kafkaClient.close();
    await this.bullQueue.close();
  }
}
