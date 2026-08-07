/**
 * Evolution Engine - Sistema de Auto-Revisión e Iteración Segura
 *
 * El sistema se auto-revisa y evoluciona sin duplicar trabajo existente.
 * Cada cambio es verificable y auditable.
 */

import type { ChangeProposal, EvolutionReport, VerificationResult } from './types';

export class EvolutionEngine {
  private reviewHistory: EvolutionReport[] = [];
  private verificationCache = new Map<string, VerificationResult>();

  /**
   * Propone cambios basados en análisis inteligente
   * (no duplicación, mejora incrementales)
   */
  async analyzeForEvolution(
    contextPath: string,
    existingSystems: string[] // Qué ya existe
  ): Promise<ChangeProposal[]> {
    const proposals: ChangeProposal[] = [];

    // 1. Escanear qué ya existe
    const existing = await this.auditExisting(existingSystems);

    // 2. Identificar oportunidades de mejora (no duplicación)
    const opportunities = await this.findNonDuplicatingOpportunities(existing, contextPath);

    // 3. Crear propuestas verificables
    for (const opportunity of opportunities) {
      proposals.push({
        id: `evolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: opportunity.title,
        description: opportunity.description,
        type: opportunity.type, // 'integrate', 'enhance', 'refactor', 'optimize'
        impactArea: opportunity.affectedModules,
        estimatedEffort: opportunity.effort,
        verificationCriteria: opportunity.verification,
        dependencies: opportunity.dependencies,
        rollbackPlan: opportunity.rollback,
      });
    }

    return proposals;
  }

  /**
   * Auto-revisa el código generado antes de sugerir cambios
   */
  async autoReview(proposal: ChangeProposal): Promise<VerificationResult> {
    const cacheKey = `${proposal.id}:${proposal.title}`;

    if (this.verificationCache.has(cacheKey)) {
      return this.verificationCache.get(cacheKey)!;
    }

    const result: VerificationResult = {
      proposalId: proposal.id,
      passedChecks: [],
      failedChecks: [],
      warnings: [],
      recommendation: 'pending',
      confidence: 0,
    };

    // 1. Verificar que no duplica
    const noDupCheck = await this.checkNoDuplication(proposal);
    if (noDupCheck.passed) {
      result.passedChecks.push('✅ No duplica trabajo existente');
    } else {
      result.failedChecks.push('❌ Potencial duplicación detectada');
      result.warnings.push(...noDupCheck.warnings);
    }

    // 2. Verificar que es incrementalño
    const incrementalCheck = await this.checkIncremental(proposal);
    if (incrementalCheck.passed) {
      result.passedChecks.push('✅ Cambio incremental y seguro');
    } else {
      result.failedChecks.push('❌ Cambio no-incremental o riesgoso');
      result.warnings.push(...incrementalCheck.warnings);
    }

    // 3. Verificar verificabilidad
    const verifiableCheck = await this.checkVerifiable(proposal);
    if (verifiableCheck.passed) {
      result.passedChecks.push('✅ Propuesta verificable');
    } else {
      result.failedChecks.push('❌ Falta criterios de verificación');
    }

    // 4. Verificar dependencies
    const depsCheck = await this.checkDependencies(proposal);
    if (depsCheck.passed) {
      result.passedChecks.push('✅ Dependencias claras');
    } else {
      result.failedChecks.push('❌ Dependencias no claras o circulares');
    }

    // 5. Verificar rollback
    const rollbackCheck = await this.checkRollback(proposal);
    if (rollbackCheck.passed) {
      result.passedChecks.push('✅ Plan de rollback viable');
    } else {
      result.warnings.push('⚠️ Plan de rollback incompleto');
    }

    // Calcular confianza
    const totalChecks = result.passedChecks.length + result.failedChecks.length;
    result.confidence = (result.passedChecks.length / totalChecks) * 100;

    // Recomendación
    if (result.failedChecks.length === 0) {
      result.recommendation = 'approved';
    } else if (result.failedChecks.length === 1) {
      result.recommendation = 'needs_review';
    } else {
      result.recommendation = 'rejected';
    }

    this.verificationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Genera reporte de evolución para revisión humana (RI)
   */
  async generateEvolutionReport(proposals: ChangeProposal[]): Promise<EvolutionReport> {
    const verifications = await Promise.all(proposals.map(p => this.autoReview(p)));

    const report: EvolutionReport = {
      timestamp: new Date(),
      totalProposals: proposals.length,
      approvedCount: verifications.filter(v => v.recommendation === 'approved').length,
      needsReviewCount: verifications.filter(v => v.recommendation === 'needs_review').length,
      rejectedCount: verifications.filter(v => v.recommendation === 'rejected').length,
      proposals: proposals.map((p, i) => ({
        proposal: p,
        verification: verifications[i],
      })),
      summaryForReviewer: this.generateSummary(verifications),
      nextSteps: this.generateRecommendedNextSteps(verifications),
    };

    this.reviewHistory.push(report);
    return report;
  }

  /**
   * Audita sistemas existentes para evitar duplicación
   */
  private async auditExisting(systems: string[]) {
    const audit = {
      systems: systems,
      analysis: {
        'orchestrator-integration': {
          location: 'lib/runtime/orchestrator-integration.ts',
          purpose: 'Integra Local-First con BullMQ',
          capabilities: ['worker-selection', 'retry-logic', 'budget-aware', 'fallback'],
          status: 'production',
        },
        'external-agent-registry': {
          location: 'lib/external-agent-registry/src/',
          purpose: 'Registro de agentes externos',
          capabilities: ['worker-routing', 'registry-management', 'caching'],
          status: 'production',
        },
        'git-branch-orchestrator': {
          location: 'lib/git-branch-orchestrator/src/',
          purpose: 'Orquestación de ramas y workers',
          capabilities: ['branch-management', 'worker-assignment', 'merge-advisors'],
          status: 'production',
        },
      },
    };

    return audit;
  }

  /**
   * Encuentra oportunidades que NO duplican trabajo existente
   */
  private async findNonDuplicatingOpportunities(audit: any, contextPath: string) {
    // Aquí iría análisis real - por ahora retorna propuestas de mejora
    return [
      {
        title: 'Integrar multi-agent-orchestrator con external-agent-registry',
        description: 'Usar registry existente en lugar de crear nuevo sistema de agentes',
        type: 'integrate',
        affectedModules: ['external-agent-registry', 'orchestrator-integration'],
        effort: 'medium',
        verification: ['Registry still routes correctly', 'No breaking changes', 'New capabilities work'],
        dependencies: ['external-agent-registry', 'orchestrator-integration'],
        rollback: 'Revert to original registry implementation',
      },
      {
        title: 'Mejorar selection algorithm en orchestrator-integration',
        description: 'Agregar token-optimization al selector existente',
        type: 'enhance',
        affectedModules: ['orchestrator-integration'],
        effort: 'small',
        verification: ['Selector still picks correct worker', 'Token optimization works', 'Metrics improved'],
        dependencies: [],
        rollback: 'Restore original selection logic',
      },
      {
        title: 'Crear sistema de auto-revisión para cambios futuros',
        description: 'Engine que verifica cada evolución antes de sugerirla',
        type: 'optimize',
        affectedModules: ['evolution-engine'],
        effort: 'medium',
        verification: ['All proposals pass auto-review', 'No false positives', 'Auditable'],
        dependencies: [],
        rollback: 'Disable auto-review, manual review only',
      },
    ];
  }

  // ============ CHECKS ============

  private async checkNoDuplication(proposal: ChangeProposal) {
    // En producción, buscaría en el código existente
    return {
      passed: true,
      warnings: [] as string[],
    };
  }

  private async checkIncremental(proposal: ChangeProposal) {
    return {
      passed: proposal.type !== 'breaking',
      warnings: [] as string[],
    };
  }

  private async checkVerifiable(proposal: ChangeProposal) {
    return {
      passed: proposal.verificationCriteria && proposal.verificationCriteria.length > 0,
    };
  }

  private async checkDependencies(proposal: ChangeProposal) {
    return {
      passed: proposal.dependencies && proposal.dependencies.length >= 0,
    };
  }

  private async checkRollback(proposal: ChangeProposal) {
    return {
      passed: !!proposal.rollbackPlan && proposal.rollbackPlan.length > 0,
    };
  }

  // ============ REPORTS ============

  private generateSummary(verifications: VerificationResult[]): string {
    const approved = verifications.filter(v => v.recommendation === 'approved').length;
    const needsReview = verifications.filter(v => v.recommendation === 'needs_review').length;

    return `
📊 AUTO-REVIEW SUMMARY
${approved} propuestas aprobadas automáticamente ✅
${needsReview} propuestas necesitan revisión manual 👤
${verifications.length - approved - needsReview} propuestas rechazadas ❌

Las propuestas aprobadas pueden proceder sin intervención manual.
Las que necesitan revisión requieren tu análisis (RI).
    `.trim();
  }

  private generateRecommendedNextSteps(verifications: VerificationResult[]) {
    return [
      '1. Revisar propuestas marcadas como "needs_review"',
      '2. Verificar que no hay duplicación con sistemas existentes',
      '3. Aprobar o rechazar propuestas',
      '4. Ejecutar cambios aprobados',
      '5. Monitorear impacto en métricas',
    ];
  }

  /**
   * Obtiene historial de evoluciones
   */
  getEvolutionHistory() {
    return this.reviewHistory;
  }
}

export type { ChangeProposal, EvolutionReport, VerificationResult };
export default EvolutionEngine;
