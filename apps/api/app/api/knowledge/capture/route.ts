import { NextRequest, NextResponse } from 'next/server';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

export interface KnowledgeCapture {
  agent: string;
  context: string;
  insight: string;
  tags?: string[];
}

/**
 * POST /api/knowledge/capture
 *
 * Agentes capturan insights y aprendizajes para el Obsidian vault.
 *
 * Body:
 * {
 *   agent: "syra",
 *   context: "Published to 4 platforms",
 *   insight: "Multi-platform publishing optimized to $0.40/month",
 *   tags: ["syra", "publishing", "optimization"]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as KnowledgeCapture;

    // Validate required fields
    if (!body.agent || !body.context || !body.insight) {
      return NextResponse.json(
        { error: 'Missing required fields: agent, context, insight' },
        { status: 400 }
      );
    }

    // Sanitize agent name (only alphanumeric + dash)
    const agentName = body.agent.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!agentName) {
      return NextResponse.json({ error: 'Invalid agent name' }, { status: 400 });
    }

    // Get today's date for inbox filename
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const inboxDir = join(process.cwd(), 'docs', 'obsidian', 'inbox');
    const inboxFile = join(inboxDir, `${today}.md`);

    // Ensure inbox directory exists
    if (!existsSync(inboxDir)) {
      await mkdir(inboxDir, { recursive: true });
    }

    // Build markdown content
    const timestamp = new Date().toISOString();
    const tags = body.tags ? body.tags : [agentName];
    const tagsStr = tags.map((tag) => `#${tag.toLowerCase().replace(/[^a-z0-9-]/g, '')}`).join(' ');

    const mdContent = `## ${body.context}

**Agent:** \`${agentName}\`  
**Time:** ${timestamp}  
**Tags:** ${tagsStr}

${body.insight}

---

`;

    // Append to inbox file
    try {
      // Try to read existing file, append to it
      const fs = await import('node:fs/promises');
      try {
        await fs.access(inboxFile);
        // File exists, append
        await fs.appendFile(inboxFile, mdContent);
      } catch {
        // File doesn't exist, create it with header
        const header = `# Knowledge Inbox — ${today}

Captured insights from autonomous agents.

`;
        await fs.writeFile(inboxFile, header + mdContent);
      }
    } catch (writeError) {
      console.error('Error writing to inbox:', writeError);
      return NextResponse.json({ error: 'Failed to capture knowledge' }, { status: 500 });
    }

    // Return success
    return NextResponse.json(
      {
        success: true,
        file: `docs/obsidian/inbox/${today}.md`,
        agent: agentName,
        timestamp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Knowledge capture error:', error);
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
  }
}

/**
 * GET /api/knowledge/capture
 *
 * Get today's captured insights.
 */
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const inboxFile = join(process.cwd(), 'docs', 'obsidian', 'inbox', `${today}.md`);

    if (!existsSync(inboxFile)) {
      return NextResponse.json({ insights: [], date: today, count: 0 }, { status: 200 });
    }

    const fs = await import('node:fs/promises');
    const content = await fs.readFile(inboxFile, 'utf-8');

    return NextResponse.json(
      {
        date: today,
        file: `docs/obsidian/inbox/${today}.md`,
        content,
        count: (content.match(/^## /gm) || []).length - 1, // Subtract header
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Knowledge retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve knowledge' }, { status: 500 });
  }
}
