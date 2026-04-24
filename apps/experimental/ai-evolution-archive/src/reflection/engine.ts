import type { CodeQuality, Improvement } from '../types.js';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

export interface ReflectionResult {
  quality: CodeQuality;
  improvements: Improvement[];
  recommendations: string[];
  risk: 'low' | 'medium' | 'high';
}

export class ReflectionEngine {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async analyzeFile(filePath: string): Promise<ReflectionResult> {
    const content = await readFile(filePath, 'utf8');

    const quality = this.assessCodeQuality(content, filePath);
    const improvements = this.identifyImprovements(content, filePath);
    const recommendations = this.generateRecommendations(quality, improvements);
    const risk = this.calculateRisk(improvements);

    return { quality, improvements, recommendations, risk };
  }

  private assessCodeQuality(content: string, filePath: string): CodeQuality {
    const lines = content.split('\n');
    const complexity = this.calculateComplexity(content);
    const maintainability = this.calculateMaintainability(content);
    const testCoverage = this.estimateTestCoverage(filePath);
    const documentation = this.calculateDocumentation(content);
    const performance = this.estimatePerformance(content);
    const security = this.assessSecurity(content);

    return {
      complexity,
      maintainability,
      testCoverage,
      documentation,
      performance,
      security,
    };
  }

  private calculateComplexity(content: string): number {
    let score = 100;

    const patterns = [
      { regex: /for\s*\(/g, penalty: 3 },
      { regex: /while\s*\(/g, penalty: 3 },
      { regex: /if\s*\(/g, penalty: 2 },
      { regex: /switch\s*\(/g, penalty: 2 },
      { regex: /catch\s*\(/g, penalty: 1 },
      { regex: /&&/g, penalty: 1 },
      { regex: /\|\|/g, penalty: 1 },
      { regex: /\?\?/g, penalty: 1 },
    ];

    for (const { regex, penalty } of patterns) {
      const matches = content.match(regex);
      if (matches) {
        score -= matches.length * penalty;
      }
    }

    const nestingMatch = content.match(/\{[\s\S]*?\{/g);
    if (nestingMatch) {
      score -= nestingMatch.length * 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateMaintainability(content: string): number {
    let score = 100;

    const lines = content.split('\n');
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;

    if (avgLineLength > 120) score -= 10;
    if (avgLineLength > 80) score -= 5;

    const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g);
    if (functionMatches && functionMatches.length > 20) score -= 15;

    const duplicatePatterns = this.findDuplicates(content);
    score -= duplicatePatterns.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  private findDuplicates(content: string): string[] {
    const lines = content.split('\n').filter((l) => l.trim().length > 30);
    const duplicates: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[i] === lines[j] && !duplicates.includes(lines[i])) {
          duplicates.push(lines[i]);
        }
      }
    }

    return duplicates;
  }

  private estimateTestCoverage(filePath: string): number {
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return 100;
    }

    const testPath = filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1');
    const exists = false;

    if (exists) return 80;

    return 40;
  }

  private calculateDocumentation(content: string): number {
    let score = 50;

    const commentPatterns = [
      { regex: /\/\*\*[\s\S]*?\*\//g, bonus: 20 },
      { regex: /\/\/\s*@[\w-]+/g, bonus: 10 },
      { regex: /\/\/\s*(TODO|FIXME|HACK|XXX)/gi, bonus: 5 },
    ];

    for (const { regex, bonus } of commentPatterns) {
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * bonus;
      }
    }

    const hasJSDoc = content.includes('/**');
    const hasExamples = content.includes('example');

    if (!hasJSDoc) score -= 20;
    if (!hasExamples) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private estimatePerformance(content: string): number {
    let score = 100;

    const issues = [
      { regex: /\.map\s*\(\s*\w+\s*=>\s*\{[\s\S]*?\.map/gi, penalty: 15 },
      { regex: /for\s*\(\s*let\s+\w+\s*=\s*0[\s\S]*?\.length[\s\S]*?\.push/gi, penalty: 10 },
      { regex: /JSON\.parse\s*\(\s*JSON\.stringify/gi, penalty: 20 },
      { regex: /document\.querySelectorAll/gi, penalty: 5 },
      { regex: /innerHTML\s*=/gi, penalty: 15 },
    ];

    for (const { regex, penalty } of issues) {
      if (regex.test(content)) {
        score -= penalty;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private assessSecurity(content: string): number {
    let score = 100;

    const vulnerabilities = [
      { regex: /eval\s*\(/gi, penalty: 30 },
      { regex: /innerHTML\s*=/gi, penalty: 20 },
      { regex: /dangerouslySetInnerHTML/gi, penalty: 15 },
      { regex: /process\.env\.\w+\s*!==\s*["']?\w+["']?/gi, penalty: 10 },
      { regex: /password\s*[:=]/gi, penalty: 10 },
      { regex: /secret\s*[:=]/gi, penalty: 10 },
      { regex: /token\s*[:=]/gi, penalty: 5 },
      { regex: /SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+/gi, penalty: 15 },
      { regex: /shell\s*\(\s*(?:req\.|process\.)/gi, penalty: 25 },
    ];

    for (const { regex, penalty } of vulnerabilities) {
      if (regex.test(content)) {
        score -= penalty;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private identifyImprovements(content: string, filePath: string): Improvement[] {
    const improvements: Improvement[] = [];

    if (content.includes('any') && filePath.endsWith('.ts')) {
      improvements.push({
        id: crypto.randomUUID(),
        type: 'refactor',
        priority: 'high',
        title: "Remove 'any' types",
        description: "Replace 'any' with proper TypeScript types",
        affectedFiles: [filePath],
        estimatedEffort: 2,
        status: 'pending',
        createdAt: new Date().toISOString(),
        autoApplied: false,
      });
    }

    if (!content.includes('test') && !filePath.includes('.test.')) {
      improvements.push({
        id: crypto.randomUUID(),
        type: 'test',
        priority: 'medium',
        title: 'Add tests',
        description: 'No test file found for this module',
        affectedFiles: [filePath.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1')],
        estimatedEffort: 4,
        status: 'pending',
        createdAt: new Date().toISOString(),
        autoApplied: false,
      });
    }

    if (content.match(/console\.(log|debug|info)\s*\(/)) {
      improvements.push({
        id: crypto.randomUUID(),
        type: 'optimization',
        priority: 'low',
        title: 'Remove console statements',
        description: 'Clean up debug console statements',
        affectedFiles: [filePath],
        estimatedEffort: 1,
        status: 'pending',
        createdAt: new Date().toISOString(),
        autoApplied: false,
      });
    }

    if (!content.includes('error') && !content.includes('Error')) {
      improvements.push({
        id: crypto.randomUUID(),
        type: 'security',
        priority: 'medium',
        title: 'Add error handling',
        description: 'No error handling found in this module',
        affectedFiles: [filePath],
        estimatedEffort: 2,
        status: 'pending',
        createdAt: new Date().toISOString(),
        autoApplied: false,
      });
    }

    return improvements;
  }

  private generateRecommendations(quality: CodeQuality, improvements: Improvement[]): string[] {
    const recommendations: string[] = [];

    if (quality.complexity < 50) {
      recommendations.push('Consider breaking down complex functions into smaller units');
    }

    if (quality.maintainability < 60) {
      recommendations.push('Refactor for better maintainability - consider extraction patterns');
    }

    if (quality.testCoverage < 60) {
      recommendations.push('Increase test coverage to at least 80%');
    }

    if (quality.documentation < 40) {
      recommendations.push('Add JSDoc comments and examples for public APIs');
    }

    if (quality.performance < 70) {
      recommendations.push('Review performance-critical code paths');
    }

    if (quality.security < 70) {
      recommendations.push('Security review needed - check for vulnerabilities');
    }

    if (improvements.length > 5) {
      recommendations.push('High number of improvements identified - prioritize critical ones');
    }

    return recommendations;
  }

  private calculateRisk(improvements: Improvement[]): 'low' | 'medium' | 'high' {
    const criticalCount = improvements.filter((i) => i.priority === 'critical').length;
    const highCount = improvements.filter((i) => i.priority === 'high').length;

    if (criticalCount > 0 || highCount > 2) return 'high';
    if (highCount > 0 || improvements.length > 3) return 'medium';
    return 'low';
  }

  async analyzeProject(patterns: string[] = ['**/*.ts']): Promise<Map<string, ReflectionResult>> {
    const results = new Map<string, ReflectionResult>();

    for (const pattern of patterns) {
      const files = await this.findFiles(pattern);

      for (const file of files) {
        try {
          const result = await this.analyzeFile(file);
          results.set(file, result);
        } catch (error) {
          console.error(`Failed to analyze ${file}:`, error);
        }
      }
    }

    return results;
  }

  private async findFiles(pattern: string): Promise<string[]> {
    const files: string[] = [];
    const basePath = this.projectRoot;

    const walkDir = async (dir: string) => {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const name = entry.name;
        const fullPath = join(dir, name);

        if (entry.isDirectory()) {
          if (!name.startsWith('.') && !name.includes('node_modules')) {
            await walkDir(fullPath);
          }
        } else if (name.match(/\.(ts|js|tsx|jsx)$/)) {
          files.push(fullPath);
        }
      }
    };

    void pattern;
    await walkDir(basePath);
    return files;
  }
}

export function calculateOverallScore(quality: CodeQuality): number {
  return Math.round(
    quality.complexity * 0.2 +
      quality.maintainability * 0.2 +
      quality.testCoverage * 0.2 +
      quality.documentation * 0.15 +
      quality.performance * 0.1 +
      quality.security * 0.15
  );
}
