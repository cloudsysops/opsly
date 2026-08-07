/**
 * Multi-Agent Orchestrator Dashboard
 * Integrated into Opsly Moon Mission Control panel
 *
 * URL: /multi-agent
 * Shows orchestrator status, agent metrics, task execution, and token usage
 */

import React from 'react';
import { MultiAgentPanel, TaskDispatchForm } from '@/components/multi-agent';

export const metadata = {
  title: 'Multi-Agent Orchestrator - Opsly Moon',
  description: 'Manage AI agents, execute tasks, and monitor token usage',
};

export default function MultiAgentPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Task Dispatch Form */}
        <div className="mb-8">
          <TaskDispatchForm />
        </div>

        {/* Main Orchestrator Panel */}
        <MultiAgentPanel />
      </div>
    </main>
  );
}
