'use client'

import { useState } from 'react'
import { AdminShell } from '@/components/admin/admin-shell'
import { FranchiseListTable } from '@/components/admin/franchise-list-table'
import { FranchiseDetailPanel } from '@/components/admin/franchise-detail-panel'

export function FranchiseAdminDashboard() {
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(null)

  return (
    <AdminShell lastUpdated={new Date()}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <FranchiseListTable onSelectFranchise={(id) => setSelectedFranchiseId(id)} />
        </div>

        {/* Detail */}
        <div className="lg:col-span-1">
          {selectedFranchiseId ? (
            <FranchiseDetailPanel
              franchiseId={selectedFranchiseId}
              onClose={() => setSelectedFranchiseId(null)}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              <p>Selecciona una franquicia para ver detalles</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
