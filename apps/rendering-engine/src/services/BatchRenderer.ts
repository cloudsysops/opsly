/**
 * Batch Rendering Service
 * Process multiple rendering jobs efficiently in parallel
 */

import * as Bull from "bull";
import { FFmpegRenderer } from "./FFmpegRenderer";
import { StableDiffusionRenderer } from "./StableDiffusionRenderer";
import { ElevenLabsRenderer } from "./ElevenLabsRenderer";

interface BatchJob {
  job_id: string;
  type: "video" | "image" | "audio" | "mixed";
  items: RenderingItem[];
  priority: "low" | "normal" | "high";
  max_concurrent: number; // How many to process at once
}

interface RenderingItem {
  item_id: string;
  type: string;
  params: any;
  retry_count?: number;
}

interface BatchResult {
  job_id: string;
  status: "completed" | "failed" | "partial";
  total_items: number;
  successful: number;
  failed: number;
  results: any[];
  duration_ms: number;
}

export class BatchRenderer {
  private video_queue: Bull.Queue;
  private image_queue: Bull.Queue;
  private audio_queue: Bull.Queue;

  private ffmpeg_renderer: FFmpegRenderer;
  private sd_renderer: StableDiffusionRenderer;
  private tts_renderer: ElevenLabsRenderer;

  constructor(redis_url: string) {
    // Initialize queues
    this.video_queue = new Bull("batch-video-render", redis_url);
    this.image_queue = new Bull("batch-image-render", redis_url);
    this.audio_queue = new Bull("batch-audio-render", redis_url);

    // Initialize renderers
    this.ffmpeg_renderer = new FFmpegRenderer();
    this.sd_renderer = new StableDiffusionRenderer();
    this.tts_renderer = new ElevenLabsRenderer(
      process.env.ELEVENLABS_API_KEY || ""
    );

    // Setup queue processors
    this.setupProcessors();
  }

  private setupProcessors() {
    // Video processing
    this.video_queue.process(
      async (job) => {
        return await this.ffmpeg_renderer.render(job.data.params);
      }
    );

    // Image processing
    this.image_queue.process(
      async (job) => {
        return await this.sd_renderer.generate(job.data.params);
      }
    );

    // Audio processing
    this.audio_queue.process(
      async (job) => {
        return await this.tts_renderer.synthesize(job.data.params);
      }
    );
  }

  /**
   * Submit a batch job for processing
   */
  async submitBatch(batch: BatchJob): Promise<string> {
    console.log(`📦 Batch job ${batch.job_id} submitted with ${batch.items.length} items`);

    for (const item of batch.items) {
      let queue: Bull.Queue;

      if (batch.type === "video" || item.type === "video") {
        queue = this.video_queue;
      } else if (batch.type === "image" || item.type === "image") {
        queue = this.image_queue;
      } else {
        queue = this.audio_queue;
      }

      // Add to queue with metadata
      await queue.add(
        {
          batch_id: batch.job_id,
          item_id: item.item_id,
          params: item.params,
        },
        {
          priority: batch.priority === "high" ? 10 : batch.priority === "normal" ? 5 : 1,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: true,
        }
      );
    }

    return batch.job_id;
  }

  /**
   * Get batch progress
   */
  async getBatchProgress(batch_id: string): Promise<any> {
    const videoCount = await this.video_queue.count();
    const imageCount = await this.image_queue.count();
    const audioCount = await this.audio_queue.count();

    return {
      batch_id,
      total_queued: videoCount + imageCount + audioCount,
      video_queue: videoCount,
      image_queue: imageCount,
      audio_queue: audioCount,
    };
  }

  /**
   * Wait for batch to complete
   */
  async waitForBatch(batch_id: string, timeout_ms: number = 300000): Promise<BatchResult> {
    const startTime = Date.now();
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    // Poll for completion
    while (Date.now() - startTime < timeout_ms) {
      const progress = await this.getBatchProgress(batch_id);

      if (progress.total_queued === 0) {
        // All items processed
        const duration = Date.now() - startTime;
        return {
          job_id: batch_id,
          status: failed === 0 ? "completed" : "partial",
          total_items: successful + failed,
          successful,
          failed,
          results,
          duration_ms: duration,
        };
      }

      // Wait 1 second before polling again
      await new Promise((r) => setTimeout(r, 1000));
    }

    return {
      job_id: batch_id,
      status: "failed",
      total_items: successful + failed,
      successful,
      failed,
      results,
      duration_ms: timeout_ms,
    };
  }

  /**
   * Parallel batch processing example
   */
  async processBatch(batch: BatchJob): Promise<BatchResult> {
    const jobId = await this.submitBatch(batch);
    return await this.waitForBatch(jobId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const videoStats = await this.video_queue.getJobCounts();
    const imageStats = await this.image_queue.getJobCounts();
    const audioStats = await this.audio_queue.getJobCounts();

    return {
      video: videoStats,
      image: imageStats,
      audio: audioStats,
      total_pending: videoStats.wait + imageStats.wait + audioStats.wait,
      total_active: videoStats.active + imageStats.active + audioStats.active,
    };
  }

  /**
   * Estimate batch completion time
   */
  async estimateCompletionTime(batch: BatchJob): Promise<number> {
    const stats = await this.getQueueStats();

    // Average processing times (in ms)
    const avgTimes = {
      video: 10000, // 10 seconds
      image: 5000, // 5 seconds
      audio: 2000, // 2 seconds
    };

    let totalTime = 0;
    for (const item of batch.items) {
      const itemType = batch.type === "mixed" ? item.type : batch.type;
      const timePerItem = avgTimes[itemType as keyof typeof avgTimes] || 5000;
      totalTime += timePerItem;
    }

    // Factor in queue wait time
    const queueWaitTime = stats.total_pending * 1000; // Rough estimate

    return queueWaitTime + totalTime;
  }
}
