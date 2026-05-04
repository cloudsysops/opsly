import { ValidationMetricsDashboard } from '@/components/ValidationMetricsDashboard';

export const metadata = {
  title: 'Validation Orchestrator Dashboard',
  description: 'Real-time monitoring of ValidationOrchestrator metrics and performance',
};

export default function ValidationDashboardPage() {
  return <ValidationMetricsDashboard />;
}
