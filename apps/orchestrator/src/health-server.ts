import { createServer, type Server } from 'node:http';
import { parseControlMode, setLocalControlMode } from './control-mode.js';
import { Router } from './http/router.js';
import {
  handleHealthCheck,
  handleOpenclawJobStatus,
  handleJobById,
  handleJobStatusAlias,
  handleEnqueueOllama,
  handleEnqueueWebhook,
  handleEnqueueSandbox,
  handleEnqueueJcode,
  handleHiveObjective,
  handleHiveObjectiveStatus,
  handleHiveRetrySubtask,
  handleHiveBots,
  handleHiveStats,
  handleHiveShutdown,
  handleHiveInit,
  handleEnqueueAgentFarm,
  handleOpenClawImproveDocumentation,
  handleMetaOptimizerMetrics,
  handleStartTerminalTask,
  handleTerminalStatus,
  handleTerminalStop,
  handleTerminalListSessions,
  handleTerminalSessionOutput,
  handleTerminalSessionStop,
  handleLocalControlMode,
  handleLocalState,
  handleLocalPromptSubmit,
  handleExternalAgentsRegistry,
  handleValidationMetrics,
  handleValidationMetricsByAgent,
  handleValidationMetricsByIntent,
  handleValidationExport,
  handleMaiaCallback,
  handleMaiaSelfHeal,
  handleRuntimeHealth,
  handleRuntimeListSessions,
  handleRuntimeCreateSession,
  handleRuntimeSessionLogs,
  handleRuntimeSessionSend,
  handleRuntimeSessionStop,
  handleRuntimeSessionResume,
  handleRuntimeSessionCheckpoint,
  handleRuntimeNodesStatus,
  handleRuntimeStream,
  handleRuntimeCapabilities,
  handleRuntimePoppingSubagents,
  handleMissionControlChat,
  handleGovernorStatus,
  handleGovernorSweepIdle,
  handleGitBranchPlan,
  handleGitBranchAssign,
  handleGitBranchRegistry,
  handleGitBranchHygiene,
  handleGitChatOpsDispatch,
  handleGitIntegrationMergeAdvisor,
  handleGitBranchMergeAdvisor,
  handleInitiateCall,
  handleListCalls,
  handleGetCallDetails,
  handleUpdateCallState,
  handleRecordVoiceMessage,
  handleGetVoiceMessage,
  handleSubmitTranscription,
  handleGetTranscriptions,
  handlePaniniChat,
} from './http/routes/index.js';

const DEFAULT_PORT = 3011;

function parsePort(): number {
  const raw = process.env.ORCHESTRATOR_HEALTH_PORT;
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }
  const trimmed = raw.trim();
  if (trimmed === '0') {
    return 0;
  }
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

function buildRouter(): Router {
  const r = new Router();

  r.get('/health', handleHealthCheck);

  r.get('/internal/openclaw-job', handleOpenclawJobStatus);

  r.post('/internal/enqueue-webhook', handleEnqueueWebhook);
  r.post('/internal/enqueue-ollama', handleEnqueueOllama);
  r.post('/internal/enqueue-sandbox', handleEnqueueSandbox);
  r.post('/internal/jcode', handleEnqueueJcode);

  r.post('/internal/hive/objective', handleHiveObjective);
  r.get('/internal/hive/objective/:taskId', handleHiveObjectiveStatus);
  r.post('/internal/hive/task/:taskId/retry/:subtaskId', handleHiveRetrySubtask);
  r.get('/internal/hive/bots', handleHiveBots);
  r.get('/internal/hive/stats', handleHiveStats);
  r.post('/internal/hive/shutdown', handleHiveShutdown);
  r.post('/internal/hive/init', handleHiveInit);

  r.post('/internal/enqueue-agent-farm', handleEnqueueAgentFarm);
  r.post('/internal/openclaw/improve-documentation', handleOpenClawImproveDocumentation);

  r.post('/internal/terminal/start', handleStartTerminalTask);
  r.get('/internal/terminal/status/:agentId', handleTerminalStatus);
  r.get('/internal/terminal/:agentId/sessions', handleTerminalListSessions);
  r.get('/internal/terminal/:agentId/session/:sessionId/output', handleTerminalSessionOutput);
  r.post('/internal/terminal/:agentId/session/:sessionId/stop', handleTerminalSessionStop);
  r.post('/internal/terminal/stop/:agentId', handleTerminalStop);

  r.get('/internal/runtime/health', handleRuntimeHealth);
  r.get('/internal/runtime/sessions', handleRuntimeListSessions);
  r.post('/internal/runtime/sessions', handleRuntimeCreateSession);
  r.get('/internal/runtime/sessions/:sessionId/logs', handleRuntimeSessionLogs);
  r.post('/internal/runtime/sessions/:sessionId/send', handleRuntimeSessionSend);
  r.post('/internal/runtime/sessions/:sessionId/stop', handleRuntimeSessionStop);
  r.post('/internal/runtime/sessions/:sessionId/resume', handleRuntimeSessionResume);
  r.post('/internal/runtime/sessions/:sessionId/checkpoint', handleRuntimeSessionCheckpoint);

  r.get('/internal/runtime/nodes/status', handleRuntimeNodesStatus);
  r.get('/internal/runtime/stream', handleRuntimeStream);
  r.get('/internal/runtime/capabilities', handleRuntimeCapabilities);
  r.get('/internal/runtime/popping-subagents', handleRuntimePoppingSubagents);
  r.post('/internal/runtime/popping-subagents', handleRuntimePoppingSubagents);

  r.post('/internal/mission-control/chat', handleMissionControlChat);

  r.get('/internal/runtime/governor/status', handleGovernorStatus);
  r.post('/internal/runtime/governor/sweep-idle', handleGovernorSweepIdle);

  r.post('/api/git/branches/plan', handleGitBranchPlan);
  r.post('/api/git/branches/assign', handleGitBranchAssign);
  r.get('/api/git/branches/registry', handleGitBranchRegistry);
  r.get('/api/git/branches/hygiene', handleGitBranchHygiene);
  r.post('/api/git/chatops/dispatch', handleGitChatOpsDispatch);
  r.get('/api/git/integration/:initiative/merge-advisor', handleGitIntegrationMergeAdvisor);
  r.get('/api/git/branches/:id/merge-advisor', handleGitBranchMergeAdvisor);

  r.get('/internal/job/:jobId', handleJobById);

  r.get('/internal/meta-optimizer/metrics', handleMetaOptimizerMetrics);

  r.post('/api/local/prompt-submit', handleLocalPromptSubmit);
  r.post('/api/local/control-mode', handleLocalControlMode);
  r.get('/api/local/state', handleLocalState);
  r.get('/api/local/external-agents', handleExternalAgentsRegistry);
  r.get('/internal/external-agents/registry', handleExternalAgentsRegistry);

  r.get('/api/job-status/:jobId', handleJobStatusAlias);

  r.get('/api/validation/metrics', handleValidationMetrics);
  r.get('/api/validation/metrics/agents/:agentRole', handleValidationMetricsByAgent);
  r.get('/api/validation/metrics/intents/:intent', handleValidationMetricsByIntent);
  r.get('/api/validation/export', handleValidationExport);

  // Maia Life Systems loop endpoints
  r.post('/api/maia/callback', handleMaiaCallback);
  r.post('/api/maia/self-heal', handleMaiaSelfHeal);

  // Voice messaging endpoints
  r.post('/internal/voice/calls', handleInitiateCall);
  r.get('/internal/voice/calls', handleListCalls);
  r.get('/internal/voice/calls/:callId', handleGetCallDetails);
  r.patch('/internal/voice/calls/:callId', handleUpdateCallState);
  r.post('/internal/voice/messages/voice', handleRecordVoiceMessage);
  r.get('/internal/voice/messages/:messageId', handleGetVoiceMessage);
  r.post('/internal/voice/transcriptions', handleSubmitTranscription);
  r.get('/internal/voice/transcriptions/:callId', handleGetTranscriptions);

  // Panini Lab sticker chat endpoint
  r.post('/api/chat', handlePaniniChat);

  return r;
}

export function startOrchestratorHealthServer(): Server {
  setLocalControlMode(parseControlMode(process.env.OPSLY_LOCAL_CONTROL_MODE));
  const port = parsePort();
  const router = buildRouter();
  const server = createServer(async (req, res) => {
    await router.dispatch(req, res);
  });
  server.listen(port, '0.0.0.0', () => {
    process.stdout.write(
      JSON.stringify({ service: 'orchestrator', http: 'listening', port, path: '/health' }) + '\n'
    );
  });
  return server;
}
