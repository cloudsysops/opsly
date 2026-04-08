import type { NextRequest } from "next/server";
import { llmCall } from "@intcloudsysops/llm-gateway";
import {
  analyzeFeedback,
  executeAutoImplement,
  type DecisionOutput,
} from "@intcloudsysops/ml/feedback-decision-engine";
import { notifyDiscordFeedback } from "../feedback-notify";
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

async function readJsonBody(req: NextRequest): Promise<unknown | Response> {
  try {
    return await req.json();
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
      { error: "tenant_slug, user_email y message son requeridos" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
  return fields;
}

function parseFeedbackPostFields(body: unknown): FeedbackPostFields | Response {
  if (body === null || typeof body !== "object") {
    return Response.json(
      { error: "Cuerpo inválido" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
  const b = body as Record<string, unknown>;
  return validateRequiredFeedbackFields({
    tenant_slug: stringField(b, "tenant_slug"),
    user_email: stringField(b, "user_email"),
    message: stringField(b, "message"),
    session_id: optionalStringField(b, "session_id"),
    conversation_id: optionalStringField(b, "conversation_id"),
  });
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
  const bodyOrErr = await readJsonBody(req);
  if (bodyOrErr instanceof Response) return bodyOrErr;

  const fieldsOrErr = parseFeedbackPostFields(bodyOrErr);
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
  const { output, decision_id } = await analyzeFeedback(
    {
      conversation_id: ctx.convId,
      tenant_slug: ctx.tenant_slug,
      user_email: ctx.user_email,
      messages: ctx.messages,
    },
    supabase,
  );

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
    ).catch((e) => {
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
  const token =
    req.headers.get("x-admin-token") ??
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    "";

  if (token !== process.env.PLATFORM_ADMIN_TOKEN) {
    return Response.json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
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
