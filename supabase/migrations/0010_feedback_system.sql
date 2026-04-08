-- Feedback chat + ML decisions + agent teams (platform schema)

CREATE TABLE IF NOT EXISTS platform.feedback_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug text NOT NULL,
  user_email text NOT NULL,
  session_id text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN (
      'open',
      'analyzing',
      'pending_approval',
      'implementing',
      'done',
      'rejected'
    )),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.feedback_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL
    REFERENCES platform.feedback_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.feedback_decisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL
    REFERENCES platform.feedback_conversations(id) ON DELETE CASCADE,
  decision_type text NOT NULL
    CHECK (decision_type IN (
      'auto_implement',
      'needs_approval',
      'rejected',
      'scheduled'
    )),
  criticality text NOT NULL
    CHECK (criticality IN ('low','medium','high','critical')),
  reasoning text NOT NULL,
  implementation_prompt text,
  approved_by text,
  approved_at timestamptz,
  implemented_at timestamptz,
  cursor_commit text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.agent_teams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  tenant_slug text,
  specialization text NOT NULL
    CHECK (specialization IN (
      'frontend','backend','infra',
      'ml','data','security','ux'
    )),
  max_parallel_agents integer DEFAULT 2,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.agent_executions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES platform.agent_teams(id) ON DELETE SET NULL,
  feedback_decision_id uuid
    REFERENCES platform.feedback_decisions(id) ON DELETE SET NULL,
  agent_type text NOT NULL,
  status text DEFAULT 'pending'
    CHECK (status IN (
      'pending','running','completed','failed','cancelled'
    )),
  input_prompt text,
  output text,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant
  ON platform.feedback_conversations(tenant_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status
  ON platform.feedback_conversations(status);
CREATE INDEX IF NOT EXISTS idx_decisions_type
  ON platform.feedback_decisions(decision_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_messages_conversation
  ON platform.feedback_messages(conversation_id, created_at ASC);

GRANT INSERT, SELECT, UPDATE ON
  platform.feedback_conversations,
  platform.feedback_messages,
  platform.feedback_decisions,
  platform.agent_teams,
  platform.agent_executions
TO service_role;
