'use client';

import Link from 'next/link';
import {
  ApprovalQueueKanban,
  PublishHistory,
  RenderStatusMonitor,
} from '@/components/mission-control';

export default function MissionControlApprovalsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] p-6 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Approval & Render Control</h1>
              <p className="text-gray-400 mt-1">
                Kanban board, render monitor, and publish history
              </p>
            </div>
            <Link
              href="/mission-control"
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
            >
              Back to Mission Control
            </Link>
          </div>
        </div>

        {/* Approval Queue Kanban */}
        <div className="mb-12">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-white mb-1">Approval Queue</h2>
            <p className="text-gray-400 text-sm">
              Workflow approvals by status. Drag-and-drop coming soon.
            </p>
          </div>
          <ApprovalQueueKanban />
        </div>

        {/* Render Status Monitor */}
        <div className="mb-12">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-white mb-1">Render Status Monitor</h2>
            <p className="text-gray-400 text-sm">
              Real-time rendering progress and job status tracking
            </p>
          </div>
          <RenderStatusMonitor />
        </div>

        {/* Publish History */}
        <div className="mb-12">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-white mb-1">Publish History</h2>
            <p className="text-gray-400 text-sm">
              Published versions and rollback tracking
            </p>
          </div>
          <PublishHistory />
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm border-t border-gray-800 pt-8">
          <span>Mission Control Approvals & Renders</span>
        </div>
      </div>
    </div>
  );
}
