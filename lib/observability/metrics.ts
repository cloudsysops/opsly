export interface MetricOptions {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  labels?: string[];
}

export type MetricValue = number | string;

interface Metric {
  name: string;
  type: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

const metrics = new Map<string, Metric[]>();

export function initMetrics(options: MetricOptions[]): void {
  for (const opt of options) {
    if (!metrics.has(opt.name)) {
      metrics.set(opt.name, []);
    }
  }
}

export function recordMetric(name: string, value: number, labels?: Record<string, string>): void {
  const metricsList = metrics.get(name) || [];

  metricsList.push({
    name,
    type: 'gauge',
    value,
    labels: labels || {},
    timestamp: Date.now(),
  });

  metrics.set(name, metricsList);

  // In production, export to Prometheus
  if (process.env.PROMETHEUS_ENABLED === 'true') {
    console.log(`[METRIC] ${name}=${value}`, labels);
  }
}

export function getMetricsExporter() {
  return {
    export: async () => {
      const result: any[] = [];
      for (const [name, metricsList] of metrics) {
        result.push({
          name,
          metrics: metricsList,
        });
      }
      return result;
    },
  };
}

export function clearMetrics(): void {
  metrics.clear();
}
