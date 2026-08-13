export * from './types.js';
export { mapEventToStory, mapMultipleEventsToStory } from './mappers/runtime-to-story.js';
export {
  generateCaption,
  generateCaptions,
  enrichContentDraftWithCaptions,
  type Caption,
  type Platform,
} from './generators/caption-generator.js';
export {
  checkDraftCompliance,
  checkCaptionsCompliance,
  performFullCompliance,
  type ComplianceResult,
  type ComplianceViolation,
} from './checkers/compliance-checker.js';
export {
  ContentApprovalQueue,
  createApprovalQueue,
  type ApprovalQueueConfig,
  type ApprovalState,
  type ApprovalTask,
} from './adapters/content-approval-queue.js';
export { CopyPasteKit, type ExportedKit } from './adapters/copy-paste-kit.js';
export {
  getDraftListItemData,
  getCalendarData,
  getApprovalQueueData,
  getApprovalQueueItemData,
  getDraftStats,
  statusConfig,
  type DraftListItemData,
  type CalendarDay,
  type ApprovalQueueData,
  type ApprovalQueueItemData,
  type DraftStats,
} from './ui/draft-view-data.js';
// ─── AI Generation ────────────────────────────────────────────────────────────
export {
  generateAIContent,
  generateAIContentBilingual,
} from './generators/ai-content-generator.js';
export {
  createLLMClient,
  AnthropicDirectClient,
  GatewayClient,
  type LLMClient,
} from './llm/client.js';
export { generateAvatarPrompt, generateAvatarPrompts } from './generators/avatar-prompt.js';
export {
  getDefaultTenantContentPresets,
  resolveTenantContentPreset,
  getDefaultContentSurfaces,
} from './presets/tenant-content-presets.js';
export {
  MoneyPrinterTurboRenderClient,
  buildMoneyPrinterTurboPayload,
  type MoneyPrinterTurboPayload,
  type MoneyPrinterTurboRenderClientOptions,
} from './rendering/moneyprinterturbo.js';

// ─── Brand Content Production (Character Bible, Series, Episodes, Campaigns) ──
export {
  CharacterRegistry,
  loadCharacter,
  loadAllCharacters,
  type CharacterRegistryOptions,
} from './characters/CharacterRegistry.js';
export { CharacterProfileSchema, CharacterIdSchema } from './characters/schema.js';
export {
  SeriesRegistry,
  loadSeries,
  loadAllSeries,
  type SeriesRegistryOptions,
} from './series/SeriesRegistry.js';
export { SeriesSchema, SeriesIdSchema } from './series/schema.js';
export {
  EpisodeManager,
  loadEpisode,
  loadEpisodeScript,
  loadAllEpisodes,
  loadAllEpisodesForSeries,
  checkEpisodeCompliance,
  type EpisodeManagerOptions,
} from './episodes/EpisodeManager.js';
export { EpisodeSchema, LocalizedTextSchema } from './episodes/schema.js';
export {
  CampaignManager,
  loadCampaign,
  buildCalendarView,
  computeProductionStatus,
  type CampaignCalendarDay,
} from './campaigns/CampaignManager.js';
export { CampaignSchema } from './campaigns/schema.js';
export { buildEpisodeRenderPlan, type EpisodeRenderPlan } from './rendering/episode-render-plan.js';

// ─── YouTube Publishing ───────────────────────────────────────────────────────
export {
  YouTubePublisher,
  loadYouTubeCredentialsFromEnv,
} from './publishers/youtube.js';
