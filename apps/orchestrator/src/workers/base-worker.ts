import type { Job } from 'bullmq';
import { HelpRequestSystem, type HelpBlockageType } from '../lib/help-request-system.js';

interface ClassifiedBlockage {
  needsHelp: boolean;
  type: HelpBlockageType;
  suggestedAction: string;
}

export abstract class BaseWorker {
  protected readonly helpSystem = new HelpRequestSystem();

  protected async checkAndRequestHelp(
    job: Job,
    error: Error,
    context: Record<string, unknown>
  ): Promise<{ needsHelp: boolean; helpId?: string }> {
    const blockage = this.classifyBlockage(error.message);
    if (!blockage.needsHelp) {
      return { needsHelp: false };
    }
    const helpId = await this.helpSystem.requestHelp({
      jobId: String(job.id ?? 'unknown'),
      jobName: job.name,
      tenantSlug: String((job.data as { tenant_slug?: string }).tenant_slug ?? 'platform'),
      blockageType: blockage.type,
      errorMessage: error.message,
      context,
      suggestedAction: blockage.suggestedAction,
    });
    await job.updateProgress({ status: 'waiting_for_help', helpRequested: true, helpId });
    return { needsHelp: true, helpId };
  }

  private classifyBlockage(message: string): ClassifiedBlockage {
    const normalized = message.toLowerCase();
    if (normalized.includes('permission denied') || normalized.includes('eacces')) {
      return {
        needsHelp: true,
        type: 'permission',
        suggestedAction: 'Conceder permisos del recurso bloqueado y reintentar job.',
      };
    }
    if (
      normalized.includes('not found') ||
      normalized.includes('command not found') ||
      normalized.includes('module not found')
    ) {
      return {
        needsHelp: true,
        type: 'installation',
        suggestedAction: 'Instalar dependencia faltante en entorno objetivo.',
      };
    }
    if (normalized.includes('rate limit') || normalized.includes('quota')) {
      return {
        needsHelp: true,
        type: 'external_resource',
        suggestedAction: 'Ajustar presupuesto/credenciales de proveedor externo o esperar ventana.',
      };
    }
    if (normalized.includes('manual decision') || normalized.includes('approval required')) {
      return {
        needsHelp: true,
        type: 'decision',
        suggestedAction: 'Requiere decision humana para continuar.',
      };
    }
    if (normalized.includes('delegate') || normalized.includes('specialist')) {
      return {
        needsHelp: true,
        type: 'delegation',
        suggestedAction: 'Delegar analisis a agente externo especializado.',
      };
    }
    return { needsHelp: false, type: 'decision', suggestedAction: '' };
  }
}
