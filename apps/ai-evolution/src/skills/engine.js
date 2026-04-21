import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';

export class SkillEvolutionEngine {
  /**
   * @param {string} [skillsDir]
   */
  constructor(skillsDir = './skills/user') {
    this.skillsDir = skillsDir;
    this.history = new Map();
  }

  async discoverSkills() {
    const skills = [];
    try {
      const entries = await readdir(this.skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          skills.push(entry.name);
        }
      }
    } catch {
      console.log('No skills directory found');
    }
    return skills;
  }

  async analyzeSkill(skillId) {
    const skillPath = join(this.skillsDir, skillId);
    const versionFile = join(skillPath, 'version.json');
    const manifestFile = join(skillPath, 'manifest.json');

    let previousVersion;
    let changes = [];
    let version = '1.0.0';

    try {
      const versionData = await readFile(versionFile, 'utf-8');
      const parsed = JSON.parse(versionData);
      previousVersion = parsed.version;
    } catch {
      console.log(`No version file for ${skillId}`);
    }

    try {
      const manifestData = await readFile(manifestFile, 'utf-8');
      const manifest = JSON.parse(manifestData);
      version = manifest.version || version;
    } catch {
      changes.push({
        type: 'added',
        description: 'Manifest created',
        file: 'manifest.json',
      });
    }

    if (previousVersion) {
      changes.push({
        type: 'changed',
        description: 'Skill version tracked',
        file: 'version.json',
      });
    }

    const files = await this.scanSkillFiles(skillPath);
    const testFiles = files.filter((f) => f.includes('.test.') || f.includes('.spec.'));

    return {
      skillId,
      version,
      previousVersion,
      changes,
      performanceDelta: 0,
      usageCount: 0,
      successRate: testFiles.length > 0 ? 0.8 : 0.5,
      lastUsed: new Date().toISOString(),
    };
  }

  async scanSkillFiles(skillPath) {
    const files = [];
    try {
      const entries = await readdir(skillPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          files.push(join(skillPath, entry.name));
        }
      }
    } catch {
      console.log(`Cannot read skill path: ${skillPath}`);
    }
    return files;
  }

  async evolveSkill(skillId, feedback) {
    const current = await this.analyzeSkill(skillId);

    const versionMatch = current.version.match(/(\d+)\.(\d+)\.(\d+)/);
    let major = 0,
      minor = 0,
      patch = 0;

    if (versionMatch) {
      major = parseInt(versionMatch[1]);
      minor = parseInt(versionMatch[2]);
      patch = parseInt(versionMatch[3]);
    }

    if (feedback.score >= 4) {
      patch++;
    } else if (feedback.score >= 3) {
      minor++;
    } else {
      major++;
    }

    const newVersion = `${major}.${minor}.${patch}`;
    const versionFile = join(this.skillsDir, skillId, 'version.json');

    await writeFile(versionFile, JSON.stringify({ version: newVersion }, null, 2));

    return {
      skillId,
      version: newVersion,
      previousVersion: current.version,
      changes: [
        {
          type: 'changed',
          description: `Version bumped based on feedback: ${feedback.score}/5`,
          file: 'version.json',
        },
      ],
      performanceDelta: feedback.score - 3,
      usageCount: current.usageCount,
      successRate: feedback.score / 5,
      lastUsed: new Date().toISOString(),
    };
  }

  async getSkillHistory(skillId) {
    return this.history.get(skillId) || [];
  }

  async recordUsage(skillId, success) {
    const history = this.history.get(skillId) || [];
    const entry = history[history.length - 1];

    if (entry) {
      const newEntry = {
        ...entry,
        usageCount: entry.usageCount + 1,
        successRate: success
          ? (entry.successRate * entry.usageCount + 1) / (entry.usageCount + 1)
          : (entry.successRate * entry.usageCount) / (entry.usageCount + 1),
        lastUsed: new Date().toISOString(),
      };
      history.push(newEntry);
      this.history.set(skillId, history);
    }
  }

  async getAllSkillsEvolution() {
    const skills = await this.discoverSkills();
    const evolutions = [];

    for (const skillId of skills) {
      const evolution = await this.analyzeSkill(skillId);
      evolutions.push(evolution);
    }

    return evolutions;
  }
}

export async function loadSkillManifest(skillPath) {
  try {
    const manifestPath = join(skillPath, 'manifest.json');
    const content = await readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function saveSkillManifest(skillPath, manifest) {
  const manifestPath = join(skillPath, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}
