import type { NextRequest } from "next/server";
import { llmCall } from "@intcloudsysops/llm-gateway";
import {
  analyzeFeedback,
  executeAutoImplement,
} from "@intcloudsysops/ml";
import { notifyDiscordFeedback } from "../feedback-notify";
import {
  resolveTrustedFeedbackIdentity,
  type TrustedFeedbackIdentity,
} from "../portal-feedback-auth";
import { requireAdminAccess } from "../auth";
import { getServiceClient } from "../supabase";
import { HTTP_STATUS } from "../constants";

const MIN_USER_MESSAGES_FOR_ANALYSIS = 2;
const MIN_MESSAGE_LENGTH_FOR_ANALYSIS = 100;
const DEFAULT_FEEDBACK_LIST_LIMIT = 50;

const SYSTEM_PROMPT = `Eres el asistente de Opsly para recibir feedback.
Tu trabajo es:
1. Entender exactamente qué problema tiene el usuario
2. Hacer preguntas de clarificación si es necesario
3. Confirmar que entendiste correctamente
4. Informar al usuario qué pasará con su feedback

Sé conciso, amigable y profesional.
Cuando tengas suficiente información, indica que vas a analizar el feedback.
Responde siempre en el idioma del usuario.`;

function criticalityEmoji(c: string): string {
  if (c === "critical") return "🚨";
  if (c === "high") return "🔴";
  if (c === "medium") return "🟡";
  return "🟢";
}

function criticalityNotifyType(c: string): "error" | "warning" | "info" {
  if (c === "critical") return "error";
  if (c === "high") return "warning";
  return "info";
}

async function notifyDecisionDiscord(
  output: DecisionOutput,
  tenant_slug: string,
  user_email: string,
): Promise<void> {
  if (!output.notify_discord) return;
  const emoji = criticalityEmoji(output.criticality);
  const type = criticalityNotifyType(output.criticality);
  const extra =
    output.decision_type === "needs_approval"
      ? "\n👉 Requiere aprobación en admin"
      : "";
  await notifyDiscordFeedback(
    `${emoji} Feedback ${output.decision_type}: ${tenant_slug}`,
    `Usuario: ${user_email}\nCriticidad: ${output.criticality}\nRazón: ${output.reasoning}${extra}`,
    type,
  );
}

type FeedbackPostFields = {
  tenant_slug: string;
  user_email: string;
  message: string;
  session_id?: string;
  conversation_id?: string;
};

type DecisionType =
  | "auto_implement"
  | "needs_approval"
  | "rejected"
  | "scheduled";
type Criticality = "low" | "medium" | "high" | "critical";
type DecisionOutput = {
  decision_type: DecisionType;
  criticality: Criticality;
  reasoning: string;
  implementation_prompt?: string;
  user_response: string;
  notify_discord: boolean;
};

async function readJsonBody(
  req: NextRequest,
): Promise<Record<string, unknown> | Response> {
  try {
    const body = await req.json();
    if (body && typeof body === "object") {
      return body as Record<string, unknown>;
    }
    return {};
  } catch {
    return Response.json(
      { error: "JSON inválido" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
}

function optionalStringField(
  b: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = b[key];
  return typeof v === "string" ? v : undefined;
}

function stringField(b: Record<string, unknown>, key: string): string {
  return optionalStringField(b, key) ?? "";
}

function validateRequiredFeedbackFields(
  fields: FeedbackPostFields,
): FeedbackPostFields | Response {
  if (!fields.tenant_slug || !fields.user_email || !fields.message) {
    return Response.json(
      { error: "message es requerido; tenant y email vienen de la sesión" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
  return fields;
}

/** Cuerpo: `message` obligatorio; `conversation_id` / `session_id` opcionales. tenant_slug/user_email opcionales si coinciden con la sesión (compat. portal). */
function parseFeedbackPostFields(
  body: unknown,
  identity: TrustedFeedbackIdentity,
): FeedbackPostFields | Response {
  if (body === null || typeof body !== "object") {
    return Response.json(
      { error: "Cuerpo inválido" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
  const b = body as Record<string, unknown>;
  const rawSlug = optionalStringField(b, "tenant_slug");
  const rawEmail = optionalStringField(b, "user_email");
  if (rawSlug !== undefined && rawSlug !== identity.tenant_slug) {
    return Response.json(
      { error: "tenant_slug no coincide con la sesión" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }
  if (
    rawEmail !== undefined &&
    rawEmail.toLowerCase() !== identity.user_email.toLowerCase()
  ) {
    return Response.json(
      { error: "user_email no coincide con la sesión" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }
  const message = stringField(b, "message");
  if (!message) {
    return Response.json(
      { error: "message es requerido" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
  return validateRequiredFeedbackFields({
    tenant_slug: identity.tenant_slug,
    user_email: identity.user_email,
    message,
    session_id: optionalStringField(b, "session_id"),
    conversation_id: optionalStringField(b, "conversation_id"),
  });
}

async function verifyConversationBelongsToUser(
  supabase: ReturnType<typeof getServiceClient>,
  conversationId: string,
  identity: TrustedFeedbackIdentity,
): Promise<Response | null> {
  const { data, error } = await supabase
    .schema("platform")
    .from("feedback_conversations")
    .select("id, tenant_slug, user_email")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
  if (!data || typeof data !== "object") {
    return Response.json(
      { error: "Conversación no encontrada" },
      { status: HTTP_STATUS.NOT_FOUND },
    );
  }
  const row = data as {
    tenant_slug: string;
    user_email: string;
  };
  if (row.tenant_slug !== identity.tenant_slug) {
    return Response.json(
      { error: "Forbidden" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }
  if (row.user_email.toLowerCase() !== identity.user_email.toLowerCase()) {
    return Response.json(
      { error: "Forbidden" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }
  return null;
}

type AssistantBranch = {
  assistantResponse: string;
  decision?: DecisionOutput;
};

async function resolveAssistantBranch(
  supabase: ReturnType<typeof getServiceClient>,
  convId: string,
  fields: FeedbackPostFields,
  historyResult: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    userMsgCount: number;
  },
): Promise<AssistantBranch> {
  const shouldAnalyze =
    historyResult.userMsgCount >= MIN_USER_MESSAGES_FOR_ANALYSIS ||
    fields.message.length > MIN_MESSAGE_LENGTH_FOR_ANALYSIS;

  if (shouldAnalyze) {
    return runAnalysisBranch(supabase, {
      convId,
      tenant_slug: fields.tenant_slug,
      user_email: fields.user_email,
      messages: historyResult.messages,
    });
  }
  return runClarifyBranch(historyResult.messages);
}

async function processFeedbackPost(
  fields: FeedbackPostFields,
): Promise<Response> {
  const supabase = getServiceClient();
  if (fields.conversation_id) {
    const block = await verifyConversationBelongsToUser(
      supabase,
      fields.conversation_id,
      {
        tenant_slug: fields.tenant_slug,
        user_email: fields.user_email,
      },
    );
    if (block) {
      return block;
    }
  }
  const convId = await ensureConversationId(supabase, fields);
  if (convId instanceof Response) return convId;

  await insertUserMessage(supabase, convId, fields.message);

  const historyResult = await loadMessageHistory(supabase, convId);
  if (historyResult instanceof Response) return historyResult;

  const branch = await resolveAssistantBranch(
    supabase,
    convId,
    fields,
    historyResult,
  );

  await supabase
    .schema("platform")
    .from("feedback_messages")
    .insert({
      conversation_id: convId,
      role: "assistant",
      content: branch.assistantResponse,
      metadata: branch.decision
        ? { decision_type: branch.decision.decision_type }
        : {},
    });

  return Response.json({
    conversation_id: convId,
    message: branch.assistantResponse,
    decision_type: branch.decision?.decision_type ?? null,
    criticality: branch.decision?.criticality ?? null,
  });
}

export async function handleFeedbackPost(req: NextRequest): Promise<Response> {
  const trusted = await resolveTrustedFeedbackIdentity(req);
  if (!trusted.ok) {
    return trusted.response;
  }

  const bodyOrErr = await readJsonBody(req);
  if (bodyOrErr instanceof Response) return bodyOrErr;

  const fieldsOrErr = parseFeedbackPostFields(bodyOrErr, trusted.identity);
  if (fieldsOrErr instanceof Response) return fieldsOrErr;

  return processFeedbackPost(fieldsOrErr);
}

async function ensureConversationId(
  supabase: ReturnType<typeof getServiceClient>,
  input: FeedbackPostFields,
): Promise<string | Response> {
  if (input.conversation_id) {
    return input.conversation_id;
  }
  const { data, error } = await supabase
    .schema("platform")
    .from("feedback_conversations")
    .insert({
      tenant_slug: input.tenant_slug,
      user_email: input.user_email,
      session_id: input.session_id ?? crypto.randomUUID(),
    })
    .select("id")
    .single();
  if (error || !data || typeof data !== "object" || !("id" in data)) {
    return Response.json(
      { error: error?.message ?? "No se pudo crear conversación" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
  return String(data.id);
}

async function insertUserMessage(
  supabase: ReturnType<typeof getServiceClient>,
  convId: string,
  content: string,
): Promise<void> {
  await supabase.schema("platform").from("feedback_messages").insert({
    conversation_id: convId,
    role: "user",
    content,
  });
}

async function loadMessageHistory(
  supabase: ReturnType<typeof getServiceClient>,
  convId: string,
): Promise<
  | Response
  | {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      userMsgCount: number;
    }
> {
  const { data: history, error: histErr } = await supabase
    .schema("platform")
    .from("feedback_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });

  if (histErr) {
    return Response.json(
      { error: histErr.message },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }

  const rows = (history ?? []) as Array<{ role: string; content: string }>;
  const messages = rows
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const userMsgCount = messages.filter((m) => m.role === "user").length;
  return { messages, userMsgCount };
}

async function runAnalysisBranch(
  supabase: ReturnType<typeof getServiceClient>,
  ctx: {
    convId: string;
    tenant_slug: string;
    user_email: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  },
): Promise<AssistantBranch> {
  const analyzed = (await analyzeFeedback(
    {
      conversation_id: ctx.convId,
      tenant_slug: ctx.tenant_slug,
      user_email: ctx.user_email,
      messages: ctx.messages,
    },
    supabase,
  )) as { output: DecisionOutput; decision_id: string | null };
  const { output, decision_id } = analyzed;

  await notifyDecisionDiscord(output, ctx.tenant_slug, ctx.user_email);

  if (
    output.decision_type === "auto_implement" &&
    output.implementation_prompt &&
    decision_id
  ) {
    await executeAutoImplement(
      decision_id,
      output.implementation_prompt,
      ctx.tenant_slug,
    ).catch((e: unknown) => {
      console.error("[feedback] executeAutoImplement:", e);
    });
  }

  return { assistantResponse: output.user_response, decision: output };
}

async function runClarifyBranch(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AssistantBranch> {
  const llmResponse = await llmCall({
    tenant_slug: "platform",
    model: "haiku",
    temperature: 0.7,
    cache: false,
    system: SYSTEM_PROMPT,
    messages,
  });
  return { assistantResponse: llmResponse.content };
}

export async function handleFeedbackGet(req: NextRequest): Promise<Response> {
  const unauthorized = await requireAdminAccess(req);
  if (unauthorized) {
    return unauthorized;
  }

  const status = req.nextUrl.searchParams.get("status");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit =
    Number.parseInt(limitParam ?? String(DEFAULT_FEEDBACK_LIST_LIMIT), 10) ||
    DEFAULT_FEEDBACK_LIST_LIMIT;

  const supabase = getServiceClient();

  let q = supabase
    .schema("platform")
    .from("feedback_conversations")
    .select(
      `
      id, tenant_slug, user_email, status, created_at,
      feedback_decisions (
        id, decision_type, criticality, reasoning, implemented_at, created_at
      )
    `,
    );

  if (status) {
    q = q.eq("status", status);
  }

  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return Response.json(
      { error: error.message },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }

  return Response.json({ feedbacks: data });
}
