import { Job } from 'bullmq';
import { createWorker } from './create-worker.js';

async function processN8nJob(job: Job): Promise<{ success: true }> {
	const webhookUrl = process.env.N8N_WEBHOOK_URL || '';
	if (!webhookUrl) {
		throw new Error('N8N_WEBHOOK_URL is required');
	}

	const payload = job.data.payload as Record<string, unknown>;
	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`N8n webhook failed with status ${response.status}`);
	}

	return { success: true };
}

export function startN8nWorker(connection: object) {
	return createWorker({
		jobName: 'n8n',
		workerName: 'n8n',
		concurrencyKey: 'n8n',
		connection,
		processFn: processN8nJob,
	});
}
