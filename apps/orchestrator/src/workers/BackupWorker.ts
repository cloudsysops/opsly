import { Job } from 'bullmq';
import { execa } from 'execa';
import { notifyDiscord } from './NotifyWorker.js';
import { createWorker } from './create-worker.js';

const BACKUP_SCRIPT = './scripts/backup-tenants.sh';

async function processBackupJob(job: Job) {
	const slug: string | undefined =
		typeof job.data?.tenant_slug === 'string' ? job.data.tenant_slug : undefined;

	const args: string[] = [];
	if (slug) {
		args.push('--slug', slug);
	}

	try {
		await execa('bash', [BACKUP_SCRIPT, ...args], {
			cwd: process.cwd(),
			env: { ...process.env },
		});
		return { success: true, tenant_slug: slug ?? 'all' };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		await notifyDiscord(
			'🔴 Backup failed',
			`Tenant: **${slug ?? 'all'}**\n\`\`\`${msg.slice(0, 800)}\`\`\``,
			'error'
		);
		throw err;
	}
}

export function startBackupWorker(connection: object) {
	return createWorker({
		jobName: 'backup',
		workerName: 'backup',
		concurrencyKey: 'backup',
		connection,
		processFn: processBackupJob,
	});
}
