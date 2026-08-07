# Multi-Agent Orchestrator React Components

React components for the Opsly Moon dashboard integration with the Multi-Agent Orchestrator.

---

## Components

### MultiAgentPanel

Main dashboard widget showing orchestrator status, agent metrics, and token usage.

**Features:**
- Real-time orchestrator status updates (auto-refresh)
- Agent availability and health status
- Task execution metrics (executing, queued, completed, failed)
- Token usage and budget tracking
- Cost projections and recommendations
- Agent performance table

**Props:**
None (uses internal hooks and API calls)

**Usage:**
```typescript
import { MultiAgentPanel } from '@/components/multi-agent';

export function Dashboard() {
  return (
    <div>
      <MultiAgentPanel />
    </div>
  );
}
```

---

### TaskDispatchForm

Form component for dispatching tasks via natural language chat.

**Features:**
- Text input for task commands
- Support for PESKIDS task ID patterns
- Real-time dispatch response
- Cost and time estimation
- Error handling and validation

**Props:**
None (uses internal hooks)

**Usage:**
```typescript
import { TaskDispatchForm } from '@/components/multi-agent';

export function Chat() {
  return <TaskDispatchForm />;
}
```

**Supported Formats:**
- `PESKIDS-1.1` — Single task
- `PESKIDS-1.1 a PESKIDS-1.4` — Range of tasks
- `ejecuta TASK-ABC123` — Execute command

---

## Hooks

### useMultiAgentDispatch

Hook for dispatching tasks to the orchestrator.

**Usage:**
```typescript
import { useMultiAgentDispatch } from '@/components/multi-agent';

export function MyComponent() {
  const { dispatchFromChat, dispatchFromAPI, isLoading, error, response } =
    useMultiAgentDispatch();

  const handleDispatch = async () => {
    try {
      const result = await dispatchFromChat('PESKIDS-1.1');
      console.log('Dispatch ID:', result.dispatchId);
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleDispatch} disabled={isLoading}>
        Dispatch
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
```

**Methods:**
- `dispatchFromChat(message: string, userId?: string): Promise<DispatchResponse>`
- `dispatchFromAPI(request: DispatchRequest): Promise<DispatchResponse>`

**State:**
- `isLoading` — Request in progress
- `error` — Error message if failed
- `response` — Latest dispatch response
- `reset()` — Clear state

---

## Types

TypeScript types for all components and API responses.

**Key Types:**
- `MultiAgentStatus` — Complete orchestrator status
- `DispatchResponse` — Task dispatch result
- `AgentMetrics` — Per-agent performance metrics
- `TokenUsageSummary` — Token usage and budget info

**Import:**
```typescript
import type {
  MultiAgentStatus,
  DispatchResponse,
  AgentMetrics,
  // ... other types
} from '@/components/multi-agent';
```

---

## Integration Guide

### 1. Add to Dashboard

```typescript
// apps/admin/app/dashboard/page.tsx
import { MultiAgentPanel, TaskDispatchForm } from '@/components/multi-agent';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <TaskDispatchForm />
      <MultiAgentPanel />
    </div>
  );
}
```

### 2. Connect API Routes

The components expect these API routes to exist:
- `GET /api/multi-agent/status` — Orchestrator status
- `POST /api/multi-agent/dispatch` — Dispatch from dashboard
- `POST /api/multi-agent/dispatch-chat` — Dispatch from chat

See `apps/admin/app/api/multi-agent/README.md` for details.

### 3. Real-time Updates

Add WebSocket support for live updates (future):

```typescript
// Use effect to subscribe to WebSocket
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3001/api/multi-agent/stream');

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    setStatus(update); // Update component state
  };

  return () => ws.close();
}, []);
```

### 4. Styling

Components use Tailwind CSS. Ensure these in `tailwind.config.js`:
- Default color palette (gray, blue, green, yellow, red)
- Responsive grid system
- Transition utilities

---

## API Data Flow

```
MultiAgentPanel
  └─ fetch /api/multi-agent/status
     ├─ Orchestrator status
     ├─ Agent registry
     └─ Token optimizer

TaskDispatchForm
  └─ useMultiAgentDispatch hook
     └─ POST /api/multi-agent/dispatch-chat
        ├─ Parse message
        ├─ Create tasks
        └─ Dispatch to orchestrator
```

---

## Component Props & Customization

### MultiAgentPanel Customization

```typescript
// Future: Add prop interface
interface MultiAgentPanelProps {
  refreshInterval?: number; // milliseconds
  autoRefresh?: boolean;
  showRecommendations?: boolean;
  onTaskDispatch?: (dispatch: DispatchResponse) => void;
}
```

### TaskDispatchForm Customization

```typescript
// Future: Add prop interface
interface TaskDispatchFormProps {
  placeholder?: string;
  onSubmit?: (response: DispatchResponse) => void;
  showHelp?: boolean;
}
```

---

## Error Handling

### Common Errors

```typescript
// Validation error (400)
{
  "success": false,
  "error": "Validation error",
  "details": [...]
}

// Server error (500)
{
  "success": false,
  "error": "Internal server error"
}

// No tasks found
{
  "success": false,
  "error": "No valid tasks found in message"
}
```

### Error Recovery

```typescript
const { dispatchFromChat, error, reset } = useMultiAgentDispatch();

if (error) {
  return (
    <div>
      <p>{error}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  );
}
```

---

## Performance Optimization

### Auto-refresh Strategy

```typescript
// Default: 5 seconds
// Adjust based on needs:
const refreshIntervals = {
  fast: 2000,    // High-frequency updates
  normal: 5000,  // Default
  slow: 30000,   // Low-frequency polling
};
```

### Memoization

Components are optimized with:
- `useCallback` for dispatch functions
- `useEffect` for auto-refresh logic
- Conditional rendering to avoid re-renders

---

## Testing

```typescript
// test/multi-agent-components.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MultiAgentPanel } from '@/components/multi-agent';

describe('MultiAgentPanel', () => {
  it('should fetch and display status', async () => {
    render(<MultiAgentPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Multi-Agent Orchestrator/i)).toBeInTheDocument();
    });
  });
});
```

---

## Accessibility

Components follow WCAG 2.1 guidelines:
- Semantic HTML elements
- ARIA labels for buttons
- Keyboard navigation support
- High contrast text

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS 12+, Android 8+

---

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Export metrics to CSV/PDF
- [ ] Custom alerts for budget threshold
- [ ] Task scheduling UI
- [ ] Agent selection preferences
- [ ] Cost prediction visualization
- [ ] Performance graph (tasks over time)
- [ ] Dark mode support

---

**Last updated:** 2026-08-07  
**Version:** 1.0  
**Maintainer:** Santiago Boteros
