-- llm_feedback → platform.conversations (no feedback_conversations).
-- 0011 creó ambas tablas pero FK apuntaba al chat portal; Beast/LLM usa conversations.

DELETE FROM platform.llm_feedback lf
WHERE NOT EXISTS (
  SELECT 1 FROM platform.conversations c WHERE c.id = lf.conversation_id
);

ALTER TABLE platform.llm_feedback
  DROP CONSTRAINT IF EXISTS llm_feedback_conversation_id_fkey;

ALTER TABLE platform.llm_feedback
  ADD CONSTRAINT llm_feedback_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES platform.conversations(id)
  ON DELETE CASCADE;

ALTER TABLE platform.llm_feedback
  ADD COLUMN IF NOT EXISTS tenant_slug text;

UPDATE platform.llm_feedback lf
SET tenant_slug = c.tenant_slug
FROM platform.conversations c
WHERE lf.conversation_id = c.id;

ALTER TABLE platform.llm_feedback
  ALTER COLUMN tenant_slug SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_llm_feedback_tenant_created
  ON platform.llm_feedback(tenant_slug, created_at DESC);
