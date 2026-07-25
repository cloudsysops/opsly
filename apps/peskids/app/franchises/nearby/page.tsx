'use client'

import { useRouter } from 'next/navigation'
import { FranchiseSelector } from '@/components/franchise/franchise-selector'

interface Franchise {
  id: string
  name: string
  city: string
  country: string
  phone: string
  tier: 'startup' | 'business' | 'enterprise'
  distanceKm: number
  latitude: number
  longitude: number
}

export default function FranchiseNearbyPage() {
  const router = useRouter()

  const handleSelectFranchise = (franchise: Franchise) => {
    // Store selected franchise in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedFranchiseTenantId', franchise.id)
      localStorage.setItem('selectedFranchiseName', franchise.name)
    }

    // Redirect to franchise portal or dashboard
    router.push(`/`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            🏢 Encuentra tu Franquicia Peskids
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Descubre la franquicia más cercana a ti y comienza tu aprendizaje
          </p>
        </div>

        <FranchiseSelector onSelectFranchise={handleSelectFranchise} showMap={false} />
      </div>
    </div>
  )
}
