/**
 * Elevenlabs Text-to-Speech Rendering Service
 * Generates high-quality audio from text
 */

import axios from "axios";
import * as fs from "fs";
import * as path from "path";

interface ElevenLabsRequest {
  text: string;
  voice_id?: string; // Default: "21m00Tcm4TlvDq8ikWAM" (Rachel)
  model_id?: string; // Default: "eleven_monolingual_v1"
  stability?: number; // 0-1, default 0.5
  similarity_boost?: number; // 0-1, default 0.75
}

interface ElevenLabsResponse {
  audio_base64: string;
  audio_file: string;
  duration_seconds: number;
  latency_ms: number;
}

export class ElevenLabsRenderer {
  private api_key: string;
  private api_url: string;
  private output_dir: string;

  constructor(
    api_key: string,
    output_dir: string = "./generated/audio"
  ) {
    this.api_key = api_key;
    this.api_url = "https://api.elevenlabs.io/v1";
    this.output_dir = output_dir;

    if (!fs.existsSync(output_dir)) {
      fs.mkdirSync(output_dir, { recursive: true });
    }
  }

  async synthesize(request: ElevenLabsRequest): Promise<ElevenLabsResponse> {
    const startTime = Date.now();

    try {
      const voiceId = request.voice_id || "21m00Tcm4TlvDq8ikWAM"; // Rachel
      const modelId = request.model_id || "eleven_monolingual_v1";

      const payload = {
        text: request.text,
        voice_settings: {
          stability: request.stability || 0.5,
          similarity_boost: request.similarity_boost || 0.75,
        },
      };

      const response = await axios.post(
        `${this.api_url}/text-to-speech/${voiceId}`,
        payload,
        {
          headers: {
            "xi-api-key": this.api_key,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 60000,
        }
      );

      const latency = Date.now() - startTime;
      const audioBuffer = Buffer.from(response.data);
      const audioBase64 = audioBuffer.toString("base64");

      // Save audio file
      const filename = `${Date.now()}.mp3`;
      const filepath = path.join(this.output_dir, filename);
      fs.writeFileSync(filepath, audioBuffer);

      // Estimate duration (rough: ~50 chars per second)
      const estimatedDuration = Math.ceil(request.text.length / 50);

      console.log(`✅ Synthesized audio (${estimatedDuration}s) in ${latency}ms`);

      return {
        audio_base64: audioBase64,
        audio_file: filepath,
        duration_seconds: estimatedDuration,
        latency_ms: latency,
      };
    } catch (error) {
      console.error("ElevenLabs error:", error);
      throw error;
    }
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.api_url}/voices`, {
        headers: {
          "xi-api-key": this.api_key,
        },
      });

      return response.data.voices;
    } catch (error) {
      console.error("Get voices error:", error);
      return [];
    }
  }

  /**
   * Check API availability
   */
  async health(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.api_url}/models`, {
        headers: {
          "xi-api-key": this.api_key,
        },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error("ElevenLabs health check failed:", error);
      return false;
    }
  }
}
