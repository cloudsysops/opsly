import Fastify from 'fastify';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const fastify = Fastify({ logger: true });

interface RenderRequest {
  task_id: string;
  type: 'music' | 'image' | 'video';
  prompt: string;
  duration?: number;
  style?: string;
  resolution?: string;
  bpm?: number;
  format?: string;
  output_path?: string;
}

interface RenderResult {
  task_id: string;
  type: string;
  status: 'success' | 'failed';
  output_path?: string;
  duration_ms?: number;
  error?: string;
}

const RENDER_CACHE = '/tmp/hermes-renders';

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'OK', service: 'rendering-engine', timestamp: new Date().toISOString() };
});

// Music rendering endpoint
fastify.post<{ Body: RenderRequest }>(
  '/render/music',
  async (request, reply) => {
    const { task_id, prompt, duration = 60, style = 'background', bpm = 128, format = 'mp3' } = request.body;

    const startTime = Date.now();
    
    try {
      console.log(`🎵 Rendering music: "${prompt}" (${duration}s, ${bpm}BPM)`);

      // Use sox + TTS for music generation
      const outputPath = path.join(RENDER_CACHE, `music-${task_id}.${format}`);
      
      // Create cache directory if needed
      await fs.mkdir(RENDER_CACHE, { recursive: true });

      // Simulate rendering (in production, use actual music generation API)
      const result = await renderMusicSox({
        prompt,
        duration,
        style,
        bpm,
        format,
        outputPath,
      });

      const durationMs = Date.now() - startTime;

      return reply.send({
        task_id,
        type: 'music',
        status: 'success',
        output_path: outputPath,
        duration_ms: durationMs,
        message: `Music rendered in ${(durationMs / 1000).toFixed(2)}s`,
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return reply.status(500).send({
        task_id,
        type: 'music',
        status: 'failed',
        duration_ms: durationMs,
        error: (error as Error).message,
      });
    }
  }
);

// Image rendering endpoint
fastify.post<{ Body: RenderRequest }>(
  '/render/image',
  async (request, reply) => {
    const { task_id, prompt, style = 'realistic', resolution = '1024x1024', format = 'png' } = request.body;

    const startTime = Date.now();

    try {
      console.log(`🖼️  Rendering image: "${prompt}" (${resolution}, ${style})`);

      const outputPath = path.join(RENDER_CACHE, `image-${task_id}.${format}`);
      
      await fs.mkdir(RENDER_CACHE, { recursive: true });

      // Use Stable Diffusion or similar
      const result = await renderImageStableDiffusion({
        prompt,
        style,
        resolution,
        format,
        outputPath,
      });

      const durationMs = Date.now() - startTime;

      return reply.send({
        task_id,
        type: 'image',
        status: 'success',
        output_path: outputPath,
        duration_ms: durationMs,
        message: `Image rendered in ${(durationMs / 1000).toFixed(2)}s`,
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return reply.status(500).send({
        task_id,
        type: 'image',
        status: 'failed',
        duration_ms: durationMs,
        error: (error as Error).message,
      });
    }
  }
);

// Video rendering endpoint
fastify.post<{ Body: RenderRequest }>(
  '/render/video',
  async (request, reply) => {
    const { task_id, prompt, duration = 30, style = 'cinematic', format = 'mp4' } = request.body;

    const startTime = Date.now();

    try {
      console.log(`🎬 Rendering video: "${prompt}" (${duration}s, ${style})`);

      const outputPath = path.join(RENDER_CACHE, `video-${task_id}.${format}`);
      
      await fs.mkdir(RENDER_CACHE, { recursive: true });

      // Use FFmpeg + image generation pipeline
      const result = await renderVideoFFmpeg({
        prompt,
        duration,
        style,
        format,
        outputPath,
      });

      const durationMs = Date.now() - startTime;

      return reply.send({
        task_id,
        type: 'video',
        status: 'success',
        output_path: outputPath,
        duration_ms: durationMs,
        message: `Video rendered in ${(durationMs / 1000).toFixed(2)}s`,
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      return reply.status(500).send({
        task_id,
        type: 'video',
        status: 'failed',
        duration_ms: durationMs,
        error: (error as Error).message,
      });
    }
  }
);

// Helper: Render music with sox
async function renderMusicSox(options: {
  prompt: string;
  duration: number;
  style: string;
  bpm: number;
  format: string;
  outputPath: string;
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // In production: call actual music generation API
    // For demo: create silence with sox
    const sox = spawn('sox', [
      '-n',
      options.outputPath,
      'synth',
      options.duration.toString(),
      'sine',
      '440',
    ]);

    sox.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`sox failed with code ${code}`));
      }
    });

    sox.on('error', (error) => {
      reject(error);
    });
  });
}

// Helper: Render image with Stable Diffusion
async function renderImageStableDiffusion(options: {
  prompt: string;
  style: string;
  resolution: string;
  format: string;
  outputPath: string;
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // In production: call Stable Diffusion API or local model
    // For demo: create placeholder image
    const [width, height] = options.resolution.split('x').map(Number);
    
    const ffmpeg = spawn('ffmpeg', [
      '-f',
      'lavfi',
      '-i',
      `color=c=blue:s=${width}x${height}:d=1`,
      '-y',
      options.outputPath,
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`ffmpeg failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(error);
    });
  });
}

// Helper: Render video with FFmpeg
async function renderVideoFFmpeg(options: {
  prompt: string;
  duration: number;
  style: string;
  format: string;
  outputPath: string;
}): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // In production: orchestrate image + music + effects
    // For demo: create color gradient video
    const ffmpeg = spawn('ffmpeg', [
      '-f',
      'lavfi',
      '-i',
      `color=c=green:s=1920x1080:d=${options.duration}`,
      '-f',
      'lavfi',
      '-i',
      `sine=f=440:d=${options.duration}`,
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-y',
      options.outputPath,
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`ffmpeg failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(error);
    });
  });
}

// Get render status/result
fastify.get<{ Params: { task_id: string } }>(
  '/render/:task_id',
  async (request, reply) => {
    const { task_id } = request.params;

    try {
      const cacheDir = await fs.readdir(RENDER_CACHE);
      const matches = cacheDir.filter(f => f.includes(task_id));

      if (matches.length === 0) {
        return reply.status(404).send({ error: 'Render not found' });
      }

      const file = matches[0];
      const stats = await fs.stat(path.join(RENDER_CACHE, file));

      return reply.send({
        task_id,
        file,
        size_bytes: stats.size,
        created_at: stats.birthtime,
        path: path.join(RENDER_CACHE, file),
      });
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  }
);

// List all renders
fastify.get('/renders', async (request, reply) => {
  try {
    await fs.mkdir(RENDER_CACHE, { recursive: true });
    const files = await fs.readdir(RENDER_CACHE);

    const renders = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(RENDER_CACHE, file);
        const stats = await fs.stat(filePath);
        return {
          filename: file,
          size_bytes: stats.size,
          created_at: stats.birthtime,
          path: filePath,
        };
      })
    );

    return reply.send({
      count: renders.length,
      renders: renders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    });
  } catch (error) {
    return reply.status(500).send({ error: (error as Error).message });
  }
});

// Start server
fastify.listen({ port: 3005, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`✅ Rendering Engine listening on ${address}`);
});
