/**
 * Context Builder — sesiones Redis + Repo-First RAG (índice local, sin vector DB).
 */
export { buildContextForLLM, getSessionContext, saveSessionContext } from "./builder.js";
export type { SessionContext } from "./builder.js";
export { loadIndex, search, searchInIndex } from "./indexer.js";
export { buildContextFromQuery } from "./knowledge-context.js";
export type { BuildContextResult } from "./knowledge-context.js";
import { startContextBuilderServer } from "./server.js";

export { startContextBuilderServer };

startContextBuilderServer();
