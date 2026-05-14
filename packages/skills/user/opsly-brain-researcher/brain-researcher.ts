/**
 * Brain Research Agent
 * Autonomous investigation of Obsidian vault
 */

import Anthropic from '@anthropic-ai/sdk';

interface ResearchConfig {
  maxIterations: number;
  confidenceThreshold: number;
  timeout: number;
  llmModel: string;
  searchDepth: number;
}

interface SearchResult {
  path: string;
  title: string;
  score: number;
  preview: string;
}

interface ResearchResult {
  question: string;
  answer: string;
  sources: string[];
  confidence: number;
  iterations: number;
  relatedTopics: string[];
}

const defaultConfig: ResearchConfig = {
  maxIterations: 5,
  confidenceThreshold: 0.8,
  timeout: 30000,
  llmModel: 'claude-haiku-4-5-20251001',
  searchDepth: 2,
};

export class ResearchAgent {
  private config: ResearchConfig;
  private client: Anthropic;
  private visitedNotes: Set<string> = new Set();

  constructor(config: Partial<ResearchConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Investigate a question using the brain
   */
  async investigate(question: string): Promise<ResearchResult> {
    const startTime = Date.now();
    const sources: Set<string> = new Set();
    let currentQuestion = question;
    let iterations = 0;
    let confidence = 0;
    let answer = '';

    while (iterations < this.config.maxIterations) {
      if (Date.now() - startTime > this.config.timeout) break;

      iterations++;

      // Step 1: Search brain
      const searchResults = await this.searchBrain(currentQuestion);
      if (searchResults.length === 0) break;

      // Step 2: Read top results
      const facts = await this.extractFacts(searchResults);
      searchResults.forEach((r) => sources.add(r.path));

      // Step 3: Synthesize with LLM
      const synthesis = await this.synthesize(currentQuestion, facts);
      answer = synthesis.answer;
      confidence = synthesis.confidence;

      // Step 4: Check if we need more investigation
      if (confidence >= this.config.confidenceThreshold) {
        break;
      }

      // Step 5: Generate follow-up question
      currentQuestion = await this.generateFollowUp(question, facts);
    }

    const relatedTopics = await this.extractTopics(Array.from(sources));

    return {
      question,
      answer,
      sources: Array.from(sources).slice(0, 5),
      confidence: Math.min(confidence, 1.0),
      iterations,
      relatedTopics,
    };
  }

  /**
   * Search brain with both fulltext and semantic
   */
  private async searchBrain(query: string): Promise<SearchResult[]> {
    // Mock implementation - in real version, call MCP tools
    // For now, return structured data that would come from brain:search + brain:semantic-search

    return [
      {
        path: 'architecture/multi-tenant.md',
        title: 'Multi-Tenant Architecture',
        score: 0.92,
        preview: 'Tenant isolation via...',
      },
      {
        path: 'modules/api.md',
        title: 'API Module',
        score: 0.78,
        preview: 'API routes with tenant context...',
      },
    ];
  }

  /**
   * Extract facts from search results
   */
  private async extractFacts(results: SearchResult[]): Promise<string> {
    const facts = results.map((r) => `[${r.path}] ${r.title}: ${r.preview}`).join('\n');
    return facts;
  }

  /**
   * Synthesize facts into answer
   */
  private async synthesize(
    question: string,
    facts: string
  ): Promise<{ answer: string; confidence: number }> {
    const prompt = `
Question: ${question}

Available Facts:
${facts}

Provide a concise answer based on these facts. Be specific and cite sources.
Estimate your confidence (0-1) in this answer based on fact coverage.

Format:
ANSWER: [your answer]
CONFIDENCE: [0.0-1.0]
`;

    const response = await this.client.messages.create({
      model: this.config.llmModel,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const answerMatch = text.match(/ANSWER:\s*(.+?)(?=CONFIDENCE:|$)/s);
    const confidenceMatch = text.match(/CONFIDENCE:\s*([0-9.]+)/);

    const answer = answerMatch ? answerMatch[1].trim() : text;
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;

    return { answer, confidence };
  }

  /**
   * Generate follow-up question if needed
   */
  private async generateFollowUp(originalQuestion: string, facts: string): Promise<string> {
    const prompt = `
Original question: ${originalQuestion}
Current facts: ${facts}

Generate a follow-up search query to deepen investigation.
Be specific and search for related concepts not yet covered.
`;

    const response = await this.client.messages.create({
      model: this.config.llmModel,
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : originalQuestion;
  }

  /**
   * Extract related topics from sources
   */
  private async extractTopics(sources: string[]): Promise<string[]> {
    // Extract last path component as topic
    return sources
      .map((s) => s.split('/').pop()?.replace('.md', '') || '')
      .filter(Boolean)
      .slice(0, 5);
  }
}

/**
 * Convenience function for quick research
 */
export async function research(question: string): Promise<ResearchResult> {
  const agent = new ResearchAgent();
  return agent.investigate(question);
}
