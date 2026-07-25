'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FranchiseHeader() {
  const [selectedFranchise, setSelectedFranchise] = useState<{
    id: string
    name: string
    distance?: number
  } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const franchiseId = localStorage.getItem('selectedFranchiseTenantId')
    const franchiseName = localStorage.getItem('selectedFranchiseName')
    const franchiseDistance = localStorage.getItem('selectedFranchiseDistance')

    if (franchiseId && franchiseName) {
      setSelectedFranchise({
        id: franchiseId,
        name: franchiseName,
        distance: franchiseDistance ? parseFloat(franchiseDistance) : undefined,
      })
    }
  }, [])

  const handleClearSelection = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedFranchiseTenantId')
      localStorage.removeItem('selectedFranchiseName')
      localStorage.removeItem('selectedFranchiseDistance')
    }
    setSelectedFranchise(null)
  }

  if (!selectedFranchise) {
    return null
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 py-2 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-700">📍</span>
          <span className="text-gray-700">
            <strong>Franquicia actual:</strong> {selectedFranchise.name}
            {selectedFranchise.distance && (
              <span className="text-gray-500 ml-1">({selectedFranchise.distance.toFixed(1)}km)</span>
            )}
          </span>
        </div>
        <div className="flex gap-2">
          <Link href="/franchises/nearby">
            <Button variant="ghost" size="sm" className="text-xs">
              Cambiar franquicia
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="text-xs"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
