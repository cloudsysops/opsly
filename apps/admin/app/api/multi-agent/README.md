# Multi-Agent Orchestrator API Routes

REST API endpoints for the Multi-Agent Orchestrator integrated with Opsly Moon dashboard.

---

## Endpoints

### 1. Status API
**GET** `/api/multi-agent/status`

Returns current status of orchestrator, agents, and metrics.

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-08-07T12:34:56.000Z",
  "orchestrator": {
    "status": {
      "agents": [
        {
          "id": "claude_remote",
          "type": "claude_remote",
          "isAvailable": true,
          "costPerTask": 0.5,
          "metrics": {
            "agentId": "claude_remote",
            "tasksCompleted": 5,
            "tasksFailed": 0,
            "tokensUsed": 30000,
            "totalExecutionTime": 4500000,
            "averageTokensPerTask": 6000,
            "costTotal": 2.50
          }
        }
      ],
      "executingTasks": 2,
      "queuedTasks": 3,
      "aggregated": {
        "totalTasksCompleted": 23,
        "totalTasksFailed": 2,
        "totalTokensUsed": 138000,
        "totalCost": 6.90,
        "averageSuccessRate": 0.92,
        "agentsCount": 4,
        "executingTasksCount": 2,
        "queuedTasksCount": 3
      },
      "registry": {
        "total": 4,
        "enabled": 3,
        "installed": 3,
        "available": 2,
        "agents": [...]
      }
    },
    "metrics": {...}
  },
  "tokens": {
    "usage": {
      "totalTokensUsed": 138000,
      "totalCostSpent": 6.90,
      "byAgent": [
        {
          "agentId": "claude_remote",
          "tokensUsed": 30000,
          "cost": 0.30,
          "percentageOfBudget": 30
        }
      ],
      "prediction": {
        "projectedTokensByEndOfMonth": 414000,
        "projectedCostByEndOfMonth": 20.70,
        "remainingBudgetPercentage": 79.3
      }
    },
    "recommendations": [
      "✅ Oportunidad: Cursor local está disponible (gratis) y no se está usando",
      "💡 Hay desbalance de costos. Considera distribuir más tareas a agentes más económicos"
    ]
  },
  "agents": {
    "total": 4,
    "enabled": 3,
    "installed": 3,
    "available": 2,
    "agents": [...]
  }
}
```

---

### 2. Dispatch API
**POST** `/api/multi-agent/dispatch`

Dispatches tasks to agents for execution.

**Request:**
```json
{
  "source": "api",
  "taskIds": ["PESKIDS-1.1", "PESKIDS-1.2", "PESKIDS-1.3"],
  "preferredAgents": ["claude_remote", "cursor_local"],
  "metadata": {
    "userId": "user_123",
    "sessionId": "session_456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "dispatchId": "dispatch_1691401200000_abc123def",
  "taskIds": ["PESKIDS-1.1", "PESKIDS-1.2", "PESKIDS-1.3"],
  "estimatedCompletionTime": 2700,
  "estimatedCost": 0.30,
  "estimatedTokens": 18000,
  "message": "✅ 3 task(s) dispatched from api. Estimated completion: 45 minutes"
}
```

**Parameters:**
- `source` (enum): `"api"`, `"dashboard"`, `"cli"`, `"webhook"`, `"chat"`
- `taskIds` (array): Task IDs to execute
- `preferredAgents` (array, optional): Preferred agent IDs for task execution
- `metadata` (object, optional): Additional metadata (userId, sessionId, etc.)

---

### 3. Chat Dispatch API
**POST** `/api/multi-agent/dispatch-chat`

Parses natural language messages and dispatches tasks.

**Request:**
```json
{
  "message": "Ejecuta PESKIDS-1.1 a PESKIDS-1.4",
  "userId": "user_123",
  "sessionId": "session_456"
}
```

**Response:**
```json
{
  "success": true,
  "dispatchId": "dispatch_1691401200000_xyz789",
  "taskIds": ["PESKIDS-1.1", "PESKIDS-1.2", "PESKIDS-1.3", "PESKIDS-1.4"],
  "estimatedCompletionTime": 3600,
  "estimatedCost": 0.40,
  "estimatedTokens": 24000,
  "message": "✅ 4 task(s) dispatched from chat. Estimated completion: 60 minutes",
  "parsed": {
    "originalMessage": "Ejecuta PESKIDS-1.1 a PESKIDS-1.4",
    "tasksFound": 4
  }
}
```

**Supported patterns:**
- `PESKIDS-1.1` — Single task ID
- `PESKIDS-1.1 a PESKIDS-1.4` — Range of tasks
- `ejecuta TASK-ABC123` — Execute command
- `ejecuta X hasta Y` — Execute range

---

## Usage Examples

### From Dashboard
```typescript
// Dispatch from Opsly Moon dashboard
const response = await fetch('/api/multi-agent/dispatch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'dashboard',
    taskIds: ['PESKIDS-1.1', 'PESKIDS-1.2'],
  }),
});

const result = await response.json();
console.log(`Dispatch ID: ${result.dispatchId}`);
console.log(`Estimated cost: $${result.estimatedCost}`);
```

### From Chat
```typescript
// Chat-based task dispatch
const response = await fetch('/api/multi-agent/dispatch-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Ejecuta PESKIDS-1.1 a PESKIDS-1.3',
  }),
});
```

### Get Status
```typescript
// Poll orchestrator status
const response = await fetch('/api/multi-agent/status');
const status = await response.json();

console.log(`Active agents: ${status.agents.available}`);
console.log(`Tasks in progress: ${status.orchestrator.status.executingTasks}`);
console.log(`Budget remaining: ${status.tokens.usage.prediction.remainingBudgetPercentage}%`);
```

---

## Integration with Opsly Moon

### In React Components
```typescript
// Use hook to fetch status
const useMultiAgentStatus = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/multi-agent/status')
      .then(r => r.json())
      .then(setStatus);
  }, []);

  return status;
};

// Use in component
export function MultiAgentPanel() {
  const status = useMultiAgentStatus();

  return (
    <div>
      <h2>Multi-Agent Orchestrator</h2>
      <p>Active tasks: {status?.orchestrator.status.executingTasks}</p>
      <p>Total cost: ${status?.tokens.usage.totalCostSpent.toFixed(2)}</p>
    </div>
  );
}
```

### WebSocket for Real-time Updates
```typescript
// Subscribe to real-time events (future enhancement)
const ws = new WebSocket('ws://localhost:3001/api/multi-agent/stream');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Task completed:', update.taskId);
};
```

---

## Error Handling

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "path": ["message"],
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limiting

Current limits (per endpoint, per minute):
- Status API: 60 requests
- Dispatch API: 30 requests
- Chat Dispatch API: 20 requests

---

## Metrics Aggregation

The Status API aggregates metrics from:
1. **Orchestrator:** Running tasks, queue status
2. **Agents:** Completion rate, tokens used, cost
3. **Token Optimizer:** Budget tracking, recommendations
4. **Agent Registry:** Health checks, availability

---

## Database Logging

All dispatch events are logged to Supabase:
- Dispatch ID
- Source (api, chat, cli, webhook, dashboard)
- Task IDs
- Agent selected
- Tokens used
- Cost
- Execution time
- Result (success/failure)

Query example:
```sql
SELECT * FROM multi_agent_executions
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Webhook for completion notifications
- [ ] Task result streaming
- [ ] Advanced filtering/search
- [ ] Batch dispatch with parallel execution
- [ ] Custom agent registration via API
- [ ] Cost estimation before execution
- [ ] Task scheduling (run at specific time)
- [ ] Automatic retry with backoff

---

**Last updated:** 2026-08-07  
**Version:** 1.0  
**Maintainer:** Santiago Boteros
