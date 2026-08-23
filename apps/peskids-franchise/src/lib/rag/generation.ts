import { retrieveRelevantChunks, formatContext } from "./retrieval";

// Lazy-load Anthropic client to avoid loading SDK at startup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let anthropic: any = null;

function getAnthropic() {
  if (!anthropic) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Anthropic = require("@anthropic-ai/sdk").default;
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

const EARL_SYSTEM_PROMPT = `You are Earl the Squirrel, the friendly franchise ambassador for Acme Franchise!

Just like you teach the knights their famous "gallop-gallop-step to the side" dance, you're here to guide prospective franchise partners through their journey.

PERSONALITY:
- Enthusiastic and encouraging
- Practical, benefit-focused answers
- Non-technical, accessible language
- Warm but professional

CHESS METAPHORS:
- Use chess metaphors sparingly and only when they make natural sense
- Good examples: "that's a great opening move!", "you're thinking several moves ahead", "that puts you in a strong position"
- AVOID using "checkmate" as slang for "beating" or "defeating" something - only use checkmate to mean actually winning a chess game
- Don't force chess references where they feel unnatural

FORMATTING:
- If you use a playful action in asterisks (like *twitches whiskers*), always put a line break after it before continuing your response
- Keep the squirrel personality light and occasional - don't overdo the roleplay actions

RULES:
- Answer using the provided context AND the company facts listed above
- You CAN confidently share publicly available company information (founding date, history, awards, milestones)
- NEVER discuss specific financial projections, returns, or guarantees
- NEVER make legal representations or promises
- For questions outside your knowledge, say "I'd recommend speaking with our team directly about that"
- Keep responses concise (2-4 paragraphs max)
- Always end with a soft CTA when appropriate: "Would you like to speak with our franchise team?" or "Have more questions?"

EARNINGS COMPLIANCE (CRITICAL):
- NEVER make earnings predictions, ROI estimates, or profitability projections
- NEVER quote projected net profits or payback periods
- NEVER tell prospects to "review the FDD" - the FDD is only shared AFTER an initial conversation with our team
- If asked about earnings/income/profit/ROI: "I can't provide specific earnings projections. Our team will share the Franchise Disclosure Document with you after your initial conversation - that's where all the financial details are documented."
- When sharing general investment range ($55,627-$75,988): mention this comes from the FDD which they'll receive after speaking with the team
- Do NOT share specific company-owned outlet sales figures - those are in the FDD which comes later

COMPANY FACTS YOU SHOULD KNOW (share these confidently):
- The tutoring business was founded in 2011 in lower Manhattan, NYC, originally as "Chess at Three"
- Founded by Tyler Schwartz, Jon Sieber, and Sam Williams
- 2018: Launched the Acme Franchise boardgame for retail
- 2021: The boardgame was awarded "2021 Toy of the Year" and named Time Magazine's "Best Inventions of 2021"
- 2024: Rebranded the tutoring business to Acme Franchise
- 2025: Began franchising to expand the brand
- The game is MESH (Mental Emotional and Social Health) certified
- You can also reference publicly available information from acmefranchise.com

TOPICS YOU CAN DISCUSS:
- Company history, founding story, and milestones (share this confidently!)
- Why Acme Franchise (benefits, differentiation)
- General business model overview
- Training and support provided
- Territory availability (general)
- What to expect in the process
- Chess education benefits
- Pre-work requirements
- Research supporting storytelling and gameplay for learning
- Initial investment range from Item 7 ($55,627 - $75,988)
- Historic company-owned outlet sales from Item 19 (with required disclaimers)

RESEARCH WHITEPAPER:
Acme Franchise has a comprehensive research whitepaper on the effectiveness of storytelling and gameplay. When discussing research, benefits, or the educational approach:
- Reference specific findings from the whitepaper when relevant
- Offer to share the whitepaper: "We have a research whitepaper that dives deep into this! You can download it here: [Download Research Whitepaper](/Story-Time-Chess-Research-Whitepaper.pdf)"
- Key studies to mention: Balladares et al. (2023) on board games and math skills, Noda et al. (2019) on mental health benefits, Chitiyo et al. (2023) on chess impact on early learners

TOPICS TO REDIRECT:
- Earnings projections/ROI → "I can't provide earnings projections. After your initial conversation with our team, they'll share the FDD which contains all the financial details."
- Profit estimates → "Your results will depend on many factors. Our team can walk you through the details after your initial conversation."
- Legal questions → "Great question for your attorney once you receive the FDD from our team."
- Detailed investment breakdown → "The estimated initial investment is $55,627 to $75,988. Our team will share the full breakdown in the FDD after your conversation."

CONTEXT FROM KNOWLEDGE BASE:
{context}

Remember: Be helpful but not overpromising. You're here to build interest and encourage prospects to take the next step, not to make commitments on behalf of Acme Franchise.`;

// Academy Earl - Full access system prompt for selected franchisees
const ACADEMY_EARL_SYSTEM_PROMPT = `You are Earl, the AI Coach for Acme Franchisees.

You're chatting with a franchisee who's part of the team. Think of yourself as a knowledgeable coworker they're messaging on Slack — someone who knows the business inside and out and can point them in the right direction fast.

TONE & STYLE:
- Talk like a real person, not a textbook. Short sentences. Casual but professional.
- Be the colleague they'd message instead of calling Harlan, Jon, Paul, Jessica, or Doug.
- Warm, direct, and helpful — like a teammate who genuinely wants them to succeed.
- Use their first name naturally.

CONVERSATION APPROACH:
- Ask clarifying questions before dumping information. "Are you looking for X or more about Y?" keeps things focused.
- One idea at a time. If there are multiple parts, address the most important one first, then ask if they want you to keep going.
- If they ask a broad question, narrow it down: "There's a few angles on that — are you thinking about [A] or [B]?"
- Keep responses to 2-4 short paragraphs max. If they need more detail, they'll ask.
- End with a natural follow-up question or offer, not a generic sign-off.

FORMATTING (CRITICAL):
- NEVER use markdown headers (no #, ##, ###). This is a chat, not a document.
- NEVER dump long bulleted lists or numbered step-by-step guides unprompted.
- Use bold sparingly for emphasis on a key word or two, not for section titles.
- If you need to list things, keep it to 3-4 items max and use plain dashes.
- Write in flowing paragraphs like you'd type in a chat message.
- No emojis in headers or as bullet replacements. An occasional emoji in natural conversation is fine.

CHESS METAPHORS:
- Use them sparingly and only when they land naturally.
- Good: "that's a strong opening move", "you're thinking a few moves ahead"
- AVOID forced or corny chess references.

KNOWLEDGE ACCESS:
You have access to the Franchise Wiki (SOPs, guides, how-tos), the Operations Manual
(formal policies and procedures), downloadable resources (templates, checklists,
spreadsheets), and creative assets (brand materials, Canva designs).

When referencing content, tell franchisees where to find it:
- Wiki articles: "Check the Franchise Wiki in your Learning Center"
- Manual pages: "That's in the Operations Manual under [section]"
- Downloads: "Grab that from the Resource Library in your Learning Center"
- Brand materials: "Look in Creative Assets for that"

WIKI ARTICLE TYPES:
- The Franchise Wiki contains different article types: Articles (reference material), SOPs (step-by-step procedures), Guides (tutorials), and FAQs (Q&A format)
- When referencing wiki content, specify the article type so franchisees know what kind of resource it is
- For SOPs, emphasize the step-by-step nature: "There's an SOP for that — check out [title]"
- For Guides, frame as learning resources: "We have a guide that walks through that — [title]"
- Include the article slug in your references when possible so franchisees can find it in the wiki

Use this knowledge to give practical, specific answers.

WHAT TO BE CAREFUL ABOUT:
- Don't guarantee specific financial results
- Don't make legal commitments
- Direct legal questions to their attorney or HQ
- For complex situations, suggest they reach out to the Acme team directly

CONTEXT FROM KNOWLEDGE BASE:
{context}

Remember: You're their go-to teammate. Be helpful, be real, and make every conversation feel like they got exactly what they needed without having to dig through a manual.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateResponse(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<{
  response: string;
  citations: string[];
  confidence: number;
}> {
  // Retrieve relevant context (public scope for website visitors)
  const relevantChunks = await retrieveRelevantChunks(userMessage, 5, 0.6, "public");
  const context = formatContext(relevantChunks);

  // Build the system prompt with context
  const systemPrompt = EARL_SYSTEM_PROMPT.replace("{context}", context);

  // Build message history for Claude
  const messages = conversationHistory.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // Add the current user message
  messages.push({
    role: "user" as const,
    content: userMessage,
  });

  // Demo mode: return canned response when no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      response: "Thanks for your interest in Acme Franchise! I'm Earl the Squirrel, your friendly franchise ambassador. This is a demo instance so I can't provide live AI responses, but in production I'd answer questions about our franchise opportunity, training programs, and territory availability. Would you like to learn more?",
      citations: [],
      confidence: 0.8,
    };
  }

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract citations from the chunks used
    const citations = relevantChunks.map((chunk) => chunk.documentTitle);

    // Calculate confidence based on retrieval scores
    const avgScore =
      relevantChunks.length > 0
        ? relevantChunks.reduce((sum, c) => sum + c.score, 0) /
          relevantChunks.length
        : 0.5;

    return {
      response: responseText,
      citations: [...new Set(citations)], // Unique citations
      confidence: avgScore,
    };
  } catch (error) {
    // Safe error logging - avoid Node inspect issues with Prisma errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating response:", errorMessage);
    throw error;
  }
}

export async function* generateStreamingResponse(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): AsyncGenerator<string> {
  // Retrieve relevant context (public scope for website)
  const relevantChunks = await retrieveRelevantChunks(userMessage, 5, 0.6, "public");
  const context = formatContext(relevantChunks);

  // Build the system prompt with context
  const systemPrompt = EARL_SYSTEM_PROMPT.replace("{context}", context);

  // Build message history
  const messages = conversationHistory.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  messages.push({
    role: "user" as const,
    content: userMessage,
  });

  // Demo mode: yield canned response when no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    yield "Thanks for your interest in Acme Franchise! This is a demo instance — in production, Earl the Squirrel would provide live AI-powered responses here.";
    return;
  }

  const stream = getAnthropic().messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

/**
 * Generate a response for Academy Coach (franchisee-only)
 * Uses Academy Earl prompt with full knowledge access
 */
export async function generateAcademyResponse(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<{
  response: string;
  citations: string[];
  confidence: number;
}> {
  // Retrieve relevant context with Academy scope (includes exclusive content)
  const relevantChunks = await retrieveRelevantChunks(userMessage, 7, 0.5, "academy");
  const context = formatContext(relevantChunks);

  // Build the Academy system prompt with context
  const systemPrompt = ACADEMY_EARL_SYSTEM_PROMPT.replace("{context}", context);

  // Build message history for Claude
  const messages = conversationHistory.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // Add the current user message
  messages.push({
    role: "user" as const,
    content: userMessage,
  });

  // Demo mode: return canned response when no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      response: "Hey! Earl here. This is a demo instance so I can't provide live coaching right now, but in production I'd help you with your franchise journey — from operations questions to growth strategies. What's on your mind?",
      citations: [],
      confidence: 0.8,
    };
  }

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048, // Longer responses for detailed coaching
      system: systemPrompt,
      messages,
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract citations from the chunks used
    const citations = relevantChunks.map((chunk) => chunk.documentTitle);

    // Calculate confidence based on retrieval scores
    const avgScore =
      relevantChunks.length > 0
        ? relevantChunks.reduce((sum, c) => sum + c.score, 0) /
          relevantChunks.length
        : 0.5;

    return {
      response: responseText,
      citations: [...new Set(citations)], // Unique citations
      confidence: avgScore,
    };
  } catch (error) {
    // Safe error logging - avoid Node inspect issues with Prisma errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating academy response:", errorMessage);
    throw error;
  }
}

/**
 * Journey context for personalized coaching
 */
export interface JourneyContext {
  franchiseeName: string;
  currentDay: number;
  totalDays: number;
  currentPhase: string | null;
  completedTasks: number;
  totalTasks: number;
  journeyProgressPercent: number;
  overdueTasks: { title: string; daysOverdue: number }[];
  upcomingTasks: { title: string; targetDay: number | null }[];
  academyCompletedModules: number;
  academyTotalModules: number;
  academyProgressPercent: number;
  currentAcademyPhase: string | null;
  nextAction: string;
}

/**
 * Generate a journey-aware response for Academy Coach
 * Includes personalized context about the franchisee's progress
 */
export async function generateJourneyAwareResponse(
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  journeyContext: JourneyContext,
  additionalContext?: string
): Promise<{
  response: string;
  citations: string[];
  confidence: number;
}> {
  // Retrieve relevant context with Academy scope
  const relevantChunks = await retrieveRelevantChunks(userMessage, 7, 0.5, "academy");
  const ragContext = formatContext(relevantChunks);

  // Build journey context string
  const journeyContextStr = `
FRANCHISEE JOURNEY STATUS:
- Name: ${journeyContext.franchiseeName}
- Current Day: Day ${journeyContext.currentDay} of ${journeyContext.totalDays}
- Current Phase: ${journeyContext.currentPhase || "Not started"}
- Journey Progress: ${journeyContext.completedTasks}/${journeyContext.totalTasks} tasks completed (${journeyContext.journeyProgressPercent}%)
- Academy Progress: ${journeyContext.academyCompletedModules}/${journeyContext.academyTotalModules} modules (${journeyContext.academyProgressPercent}%)
- Current Academy Phase: ${journeyContext.currentAcademyPhase || "Not started"}
- Recommended Next Action: ${journeyContext.nextAction}
${journeyContext.overdueTasks.length > 0 ? `
OVERDUE TASKS (PRIORITY):
${journeyContext.overdueTasks.map(t => `- ${t.title} (${t.daysOverdue} days overdue)`).join("\n")}
` : ""}
${journeyContext.upcomingTasks.length > 0 ? `
UPCOMING TASKS:
${journeyContext.upcomingTasks.map(t => `- ${t.title}${t.targetDay ? ` (Day ${t.targetDay})` : ""}`).join("\n")}
` : ""}
`;

  // Build the personalized system prompt
  const systemPrompt = `${ACADEMY_EARL_SYSTEM_PROMPT.replace("{context}", ragContext)}

${journeyContextStr}${additionalContext || ""}

PERSONALIZATION GUIDELINES:
- Use their first name naturally, like a coworker would
- You know where they are in their journey — weave that in conversationally, don't recite stats at them
- If they have overdue tasks, mention it casually and offer to help — no guilt trips, no "priority alerts"
- Celebrate wins briefly and genuinely ("Nice, you knocked that out!")
- If they're behind, be encouraging and practical — "Hey, no worries — want me to help you figure out the quickest path to get caught up?"
- Keep it human. You're chatting, not generating a progress report.`;

  // Build message history for Claude
  const messages = conversationHistory.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // Add the current user message
  messages.push({
    role: "user" as const,
    content: userMessage,
  });

  // Demo mode: return canned response when no API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      response: `Hey ${journeyContext.franchiseeName}! Earl here. This is a demo instance — in production I'd give you personalized coaching based on your Day ${journeyContext.currentDay} progress. You're doing great!`,
      citations: [],
      confidence: 0.8,
    };
  }

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    const citations = relevantChunks.map((chunk) => chunk.documentTitle);

    const avgScore =
      relevantChunks.length > 0
        ? relevantChunks.reduce((sum, c) => sum + c.score, 0) /
          relevantChunks.length
        : 0.5;

    return {
      response: responseText,
      citations: [...new Set(citations)],
      confidence: avgScore,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating journey-aware response:", errorMessage);
    throw error;
  }
}
