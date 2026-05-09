/**
 * Stable Diffusion Rendering Service
 * Generates high-quality images from text prompts
 */

import axios from "axios";
import * as fs from "fs";
import * as path from "path";

interface SDRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
}

interface SDResponse {
  images: string[]; // Base64 encoded
  seed: number;
  latency_ms: number;
}

export class StableDiffusionRenderer {
  private api_url: string;
  private output_dir: string;

  constructor(
    api_url: string = "http://localhost:7860",
    output_dir: string = "./generated/images"
  ) {
    this.api_url = api_url;
    this.output_dir = output_dir;

    // Create output directory if it doesn't exist
    if (!fs.existsSync(output_dir)) {
      fs.mkdirSync(output_dir, { recursive: true });
    }
  }

  async generate(request: SDRequest): Promise<SDResponse> {
    const startTime = Date.now();

    try {
      const payload = {
        prompt: request.prompt,
        negative_prompt: request.negative_prompt || "",
        steps: request.num_inference_steps || 25,
        width: request.width || 768,
        height: request.height || 768,
        cfg_scale: request.guidance_scale || 7.5,
        seed: request.seed || Math.floor(Math.random() * 1000000),
        sampler_name: "DPM++ 2M Karras",
        scheduler: "karras",
      };

      const response = await axios.post(`${this.api_url}/sdapi/v1/txt2img`, payload, {
        timeout: 120000,
      });

      const latency = Date.now() - startTime;
      const images = response.data.images || [];

      // Save images to disk
      const saved_paths: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const filename = `${Date.now()}_${i}.png`;
        const filepath = path.join(this.output_dir, filename);
        const buffer = Buffer.from(images[i], "base64");
        fs.writeFileSync(filepath, buffer);
        saved_paths.push(filepath);
      }

      console.log(`✅ Generated ${images.length} image(s) in ${latency}ms`);

      return {
        images,
        seed: payload.seed,
        latency_ms: latency,
      };
    } catch (error) {
      console.error("Stable Diffusion error:", error);
      throw error;
    }
  }

  /**
   * Image to Image (img2img) - Modify existing image
   */
  async imageToImage(
    image_base64: string,
    prompt: string,
    strength: number = 0.75
  ): Promise<SDResponse> {
    const startTime = Date.now();

    try {
      const payload = {
        prompt,
        init_images: [image_base64],
        denoising_strength: strength,
        steps: 25,
        cfg_scale: 7.5,
        sampler_name: "DPM++ 2M Karras",
      };

      const response = await axios.post(`${this.api_url}/sdapi/v1/img2img`, payload, {
        timeout: 120000,
      });

      const latency = Date.now() - startTime;
      const images = response.data.images || [];

      console.log(`✅ Modified image in ${latency}ms`);

      return {
        images,
        seed: 0,
        latency_ms: latency,
      };
    } catch (error) {
      console.error("Image-to-image error:", error);
      throw error;
    }
  }

  /**
   * Upscale image
   */
  async upscale(image_base64: string, scale: number = 2): Promise<string> {
    try {
      const payload = {
        upscaling_resize: scale,
        upscaler_1: "R-ESRGAN 4x+",
        image: image_base64,
      };

      const response = await axios.post(`${this.api_url}/sdapi/v1/upscalers`, payload, {
        timeout: 60000,
      });

      return response.data.images[0];
    } catch (error) {
      console.error("Upscale error:", error);
      throw error;
    }
  }

  /**
   * Check Stable Diffusion API availability
   */
  async health(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.api_url}/sdapi/v1/sd-models`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error("Stable Diffusion health check failed:", error);
      return false;
    }
  }
}
