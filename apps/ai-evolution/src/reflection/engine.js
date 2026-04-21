import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';

/**
 * @typedef {Object} CodeQuality
 * @property {number} complexity
 * @property {number} maintainability
 * @property {number} testCoverage
 * @property {number} documentation
 * @property {number} performance
 * @property {number} security
 */

/**
 * @typedef {Object} Improvement
 * @property {string} id
 * @property {string} type
 * @property {string} priority
 * @property {string} title
 * @property {string} description
 * @property {string[]} affectedFiles
 * @property {number} estimatedEffort
 * @property {string} status
 * @property {string} createdAt
 * @property {boolean} autoApplied
 */

export class ReflectionEngine {
  /**
   * @param {string} projectRoot
   */
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * @param {string} filePath
   * @returns {Promise<{quality: CodeQuality, improvements: Improvement[], recommendations: string[], risk: string}>}
   */
  async analyzeFile(filePath) {
    const content = await readFile(filePath, 'utf-8');

    const quality = this.assessCodeQuality(content, filePath);
    const improvements = this.identifyImprovements(content, filePath);
    const recommendations = this.generateRecommendations(quality, improvements);
    const risk = this.calculateRisk(improvements);

    return { quality, improvements, recommendations, risk };
  }

  /**
   * @param {string} content
   * @param {string} filePath
   * @returns {CodeQuality}
   */
  assessCodeQuality(content, filePath) {
    const complexity = this.calculateComplexity(content);
    const maintainability = this.calculateMaintainability(content);
    const testCoverage = this.estimateTestCoverage(filePath);
    const documentation = this.calculateDocumentation(content);
    const performance = this.estimatePerformance(content);
    const security = this.assessSecurity(content);

    return { complexity, maintainability, testCoverage, documentation, performance, security };
  }

  calculateComplexity(content) {
    let score = 100;

    const patterns = [
      { regex: /for\s*\(/g, penalty: 3 },
      { regex: /while\s*\(/g, penalty: 3 },
      { regex: /if\s*\(/g, penalty: 2 },
      { regex: /catch\s*\(/g, penalty: 1 },
      { regex: /&&/g, penalty: 1 },
    ];

    for (const { regex, penalty } of patterns) {
      const matches = content.match(regex);
      if (matches) score -= matches.length * penalty;
    }

    return Math.max(0, Math.min(100, score));
  }

  calculateMaintainability(content) {
    let score = 100;
    const lines = content.split('\n');
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;

    if (avgLineLength > 120) score -= 10;
    if (avgLineLength > 80) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  estimateTestCoverage(filePath) {
    if (filePath.includes('.test.') || filePath.includes('.spec.')) return 100;
    return 40;
  }

  calculateDocumentation(content) {
    let score = 50;
    if (content.includes('/**')) score += 20;
    if (content.includes('example')) score += 10;
    if (!content.includes('/**')) score -= 20;
    return Math.max(0, Math.min(100, score));
  }

  estimatePerformance(content) {
    let score = 100;
    if (/\.map\s*\(\s*\w+\s*=>\s*\{[\s\S]*?\.map/i.test(content)) score -= 15;
    if (/JSON\.parse\s*\(\s*JSON\.stringify/i.test(content)) score -= 20;
    return Math.max(0, Math.min(100, score));
  }

  assessSecurity(content) {
    let score = 100;
    if (/eval\s*\(/gi.test(content)) score -= 30;
    if (/innerHTML\s*=/gi.test(content)) score -= 20;
    if (/password\s*[:=]/gi.test(content)) score -= 10;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * @param {string} content
   * @param {string} filePath
   * @returns {Improvement[]}
   */
  identifyImprovements(content, filePath) {
    const improvements = [];

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

    return improvements;
  }

  /**
   * @param {CodeQuality} quality
   * @param {Improvement[]} improvements
   * @returns {string[]}
   */
  generateRecommendations(quality, improvements) {
    const recommendations = [];

    if (quality.complexity < 50) recommendations.push('Consider breaking down complex functions');
    if (quality.maintainability < 60) recommendations.push('Refactor for better maintainability');
    if (quality.testCoverage < 60) recommendations.push('Increase test coverage to at least 80%');
    if (quality.security < 70) recommendations.push('Security review needed');

    return recommendations;
  }

  /**
   * @param {Improvement[]} improvements
   * @returns {"low" | "medium" | "high"}
   */
  calculateRisk(improvements) {
    const criticalCount = improvements.filter((i) => i.priority === 'critical').length;
    if (criticalCount > 0 || improvements.length > 5) return 'high';
    if (improvements.length > 3) return 'medium';
    return 'low';
  }

  /**
   * @param {string[]} [patterns]
   * @returns {Promise<Map<string, any>>}
   */
  async analyzeProject(patterns = ['**/*.js', '**/*.ts']) {
    const results = new Map();
    const files = await this.findFiles(patterns);

    for (const file of files) {
      try {
        const result = await this.analyzeFile(file);
        results.set(file, result);
      } catch (error) {
        console.error(`Failed to analyze ${file}:`, error.message);
      }
    }

    return results;
  }

  /**
   * @param {string[]} patterns
   * @returns {Promise<string[]>}
   */
  async findFiles(patterns) {
    const files = [];
    const basePath = this.projectRoot;

    const walkDir = async (dir, depth = 0) => {
      if (depth > 4) return;

      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);

          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && !entry.name.includes('node_modules')) {
              await walkDir(fullPath, depth + 1);
            }
          } else if (entry.name.match(/\.(js|ts|tsx|jsx)$/)) {
            files.push(fullPath);
          }
        }
      } catch {}
    };

    await walkDir(basePath);
    return files;
  }
}

export function calculateOverallScore(quality) {
  return Math.round(
    quality.complexity * 0.2 +
      quality.maintainability * 0.2 +
      quality.testCoverage * 0.2 +
      quality.documentation * 0.15 +
      quality.performance * 0.1 +
      quality.security * 0.15
  );
}
