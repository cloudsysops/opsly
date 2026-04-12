/** Configuración GCP / Vertex (sin secretos en runtime tipado). */
export interface GCloudConfig {
  projectId: string;
  region: string;
  model: string;
}

export interface VertexEmbeddingPredictBody {
  instances: Array<{
    content: string;
  }>;
}

/** Respuesta mínima del endpoint :predict de embeddings en Vertex. */
export interface VertexEmbeddingResponse {
  predictions?: Array<{
    embeddings?: {
      values?: number[];
    };
  }>;
}

export interface VertexBatchRequest {
  instances: Array<{
    content: string;
  }>;
  parameters?: Record<string, unknown>;
}
