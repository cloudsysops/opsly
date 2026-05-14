/**
 * Autonomous Revenue Worker
 * 
 * Worker BullMQ para ejecutar el ciclo 8-fases de autonomous_revenue
 * Jobs: 'revenue_research', 'revenue_idea', 'revenue_project', 'revenue_brand',
 *       'revenue_landing', 'revenue_social', 'revenue_marketing', 'revenue_monetize'
 * 
 * Ref: scripts/super_orchestrator/autonomous_revenue_v2.py
 */

import { Worker, Job } from 'bullmq';
import { connection } from '../queue.js';
import { setJobState } from '../state/store.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { logWorkerInfo, logWorkerError } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

export type RevenuePhase = 
  | 'research'
  | 'idea'
  | 'project'
  | 'brand'
  | 'landing'
  | 'social'
  | 'marketing'
  | 'monetize';

interface RevenueCycleJobData {
  phase: RevenuePhase;
  project_name?: string;
  niche?: string;
  tenant_slug: string;
  options?: Record<string, unknown>;
  previous_results?: Record<string, unknown>;
}

interface FullCycleJobData {
  target_niche: string;
  tenant_slug: string;
  project_count?: number;
  run_full_cycle?: boolean;
}

export function startAutonomousRevenueWorker(): Worker {
  const concurrency = getWorkerConcurrency('autonomous_revenue');

  const worker = new Worker(
    'autonomous_revenue',
    async (job: Job) => {
      const t0 = Date.now();
      logWorkerLifecycle('start', 'autonomous_revenue', job);

      try {
        if (job.name === 'revenue_cycle') {
          return await handleRevenueCycle(job as Job<RevenueCycleJobData>);
        } else if (job.name === 'revenue_full_cycle') {
          return await handleFullCycle(job as Job<FullCycleJobData>);
        }

        throw new Error(`Unknown job type: ${job.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'autonomous_revenue', job, { duration_ms: Date.now() - t0, error: msg });
        throw err;
      } finally {
        logWorkerLifecycle('complete', 'autonomous_revenue', job, { duration_ms: Date.now() - t0 });
      }
    },
    { connection, concurrency }
  );

  worker.on('completed', (job) => {
    logWorkerInfo('autonomous_revenue', 'Job completed', { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logWorkerError('autonomous_revenue', 'Job failed', { jobId: job?.id, error: error.message });
  });

  logWorkerInfo('autonomous_revenue', 'Started', { concurrency });

  return worker;
}

async function handleRevenueCycle(job: Job<RevenueCycleJobData>): Promise<any> {
  const { phase, project_name, niche, tenant_slug, options, previous_results } = job.data;

  await setJobState(job.id!, {
    status: 'running',
    type: `revenue_${phase}`,
    tenant_slug,
    request_id: job.id!,
    started_at: new Date().toISOString()
  });

  let result: Record<string, unknown>;

  switch (phase) {
    case 'research':
      result = await executeResearch(niche || '', tenant_slug);
      break;
    case 'idea':
      result = await executeIdeaGeneration(previous_results as Record<string, unknown> || {});
      break;
    case 'project':
      result = await executeProjectCreation(project_name || '', options || {});
      break;
    case 'brand':
      result = await executeBranding(project_name || '', options?.style as string || 'modern');
      break;
    case 'landing':
      result = await executeLandingPage(project_name || '', options?.template as string || 'saas');
      break;
    case 'social':
      result = await executeSocialMedia(project_name || '', options?.platforms as string[] || ['twitter', 'linkedin']);
      break;
    case 'marketing':
      result = await executeMarketing(project_name || '', options?.channel as string || 'organic');
      break;
    case 'monetize':
      result = await executeMonetization(project_name || '', options?.model as string || 'subscription');
      break;
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }

  await setJobState(job.id!, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    result
  });

  return result;
}

async function handleFullCycle(job: Job<FullCycleJobData>): Promise<any> {
  const { target_niche, tenant_slug, project_count = 1 } = job.data;

  await setJobState(job.id!, {
    status: 'running',
    type: 'revenue_full_cycle',
    tenant_slug,
    request_id: job.id!,
    started_at: new Date().toISOString()
  });

  const results: Record<string, unknown>[] = [];
  let totalRevenue = 0;

  for (let i = 0; i < project_count; i++) {
    const projectName = `project_${Date.now()}_${i}`;
    
    // Execute each phase in sequence
    const phaseResults = await executeFullCycle(target_niche, projectName, tenant_slug);
    results.push(phaseResults);
    totalRevenue += phaseResults.estimated_monthly_revenue as number;
  }

  const fullResult = {
    projects_created: project_count,
    projects: results,
    total_estimated_monthly_revenue: totalRevenue,
    cycle_completed_at: new Date().toISOString()
  };

  await setJobState(job.id!, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    result: fullResult
  });

  return fullResult;
}

// Phase execution functions (simulated - in production would call Python scripts)

async function executeResearch(niche: string, tenant_slug: string): Promise<Record<string, unknown>> {
  return {
    phase: 'research',
    niche,
    market_size: '$2.5M',
    competition_level: 'medium',
    trends: ['AI automation', 'No-code tools', 'Remote work'],
    opportunity_score: 78,
    sources_analyzed: 12,
    timestamp: new Date().toISOString()
  };
}

async function executeIdeaGeneration(researchResults: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    phase: 'idea',
    generated_ideas: [
      { name: 'AI Content Scheduler', revenue_potential: 299, effort: 'medium' },
      { name: 'No-Code API Builder', revenue_potential: 499, effort: 'high' },
      { name: 'Remote Team Dashboard', revenue_potential: 199, effort: 'low' }
    ],
    selected_idea: 'AI Content Scheduler',
    justification: 'High demand, medium competition, proven market',
    timestamp: new Date().toISOString()
  };
}

async function executeProjectCreation(projectName: string, options: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    phase: 'project',
    project_name: projectName,
    tech_stack: {
      frontend: 'Next.js 15',
      backend: 'Node.js + Prisma',
      database: 'PostgreSQL',
      deployment: 'Vercel + Railway'
    },
    features: ['User auth', 'Dashboard', 'API integrations', 'Analytics'],
    estimated_build_time: '2 weeks',
    files_created: ['package.json', 'tsconfig.json', 'src/**/*'],
    timestamp: new Date().toISOString()
  };
}

async function executeBranding(projectName: string, style: string): Promise<Record<string, unknown>> {
  return {
    phase: 'brand',
    project_name: projectName,
    brand: {
      name: projectName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      tagline: 'Automate Your Success',
      color_palette: ['#6366F1', '#8B5CF6', '#EC4899'],
      style: style || 'modern'
    },
    deliverables: ['Logo SVG', 'Brand guidelines', 'Social templates'],
    timestamp: new Date().toISOString()
  };
}

async function executeLandingPage(projectName: string, template: string): Promise<Record<string, unknown>> {
  return {
    phase: 'landing',
    project_name: projectName,
    template,
    sections: ['Hero', 'Features', 'Pricing', 'Testimonials', 'CTA'],
    cta_conversion_target: '5%',
    seo_optimized: true,
    pages_generated: 5,
    timestamp: new Date().toISOString()
  };
}

async function executeSocialMedia(projectName: string, platforms: string[]): Promise<Record<string, unknown>> {
  return {
    phase: 'social',
    project_name: projectName,
    platforms,
    content_created: {
      linkedin: { posts: 10, strategy: 'thought_leadership' },
      twitter: { posts: 20, strategy: 'engagement' },
      youtube: { videos: 2, strategy: 'tutorials' }
    },
    posting_schedule: 'daily',
    estimated_reach: 5000,
    timestamp: new Date().toISOString()
  };
}

async function executeMarketing(projectName: string, channel: string): Promise<Record<string, unknown>> {
  return {
    phase: 'marketing',
    project_name: projectName,
    channel,
    campaigns: [
      { name: 'Launch Email', status: 'ready', estimated_conversion: '3%' },
      { name: 'SEO Push', status: 'active', estimated_traffic: '500/month' },
      { name: 'Partner Outreach', status: 'planned', estimated_partners: 10 }
    ],
    budget: 500,
    estimated_roi: '3.5x',
    timestamp: new Date().toISOString()
  };
}

async function executeMonetization(projectName: string, model: string): Promise<Record<string, unknown>> {
  return {
    phase: 'monetize',
    project_name: projectName,
    model,
    pricing: {
      starter: 29,
      pro: 79,
      enterprise: 199
    },
    revenue_streams: ['subscriptions', 'one_time', 'enterprise'],
    estimated_monthly_revenue: Math.floor(Math.random() * 500) + 100,
    launch_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    timestamp: new Date().toISOString()
  };
}

async function executeFullCycle(niche: string, projectName: string, tenant_slug: string): Promise<Record<string, unknown>> {
  // Execute each phase sequentially
  const research = await executeResearch(niche, tenant_slug);
  const idea = await executeIdeaGeneration(research);
  const project = await executeProjectCreation(projectName, {});
  const brand = await executeBranding(projectName, 'modern');
  const landing = await executeLandingPage(projectName, 'saas');
  const social = await executeSocialMedia(projectName, ['twitter', 'linkedin']);
  const marketing = await executeMarketing(projectName, 'organic');
  const monetize = await executeMonetization(projectName, 'subscription');

  return {
    project_name: projectName,
    niche,
    phases: { research, idea, project, brand, landing, social, marketing, monetize },
    estimated_monthly_revenue: monetize.estimated_monthly_revenue,
    completed_at: new Date().toISOString()
  };
}