'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import type { DashboardData } from '@/lib/types'
import { DashboardView } from '@/components/admin/dashboard-view'
import { RoleSwitcher } from '@/components/admin/role-switcher'
import { FranchiseFilterSelect } from '@/components/admin/franchise-filter-select'
import { Button } from '@/components/ui/button'

const POLL_MS = 5000

interface StaffDashboardProps {
  surface: 'admin' | 'support'
}

export function StaffDashboard({ surface }: StaffDashboardProps): React.ReactElement {
  const router = useRouter()
  const loginPath = surface === 'support' ? '/support/login' : '/admin/login'
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [range, setRange] = useState<'week' | 'month'>('week')
  const [franchiseId, setFranchiseId] = useState('')

  const fetchDashboard = useCallback(
    async (isPoll = false): Promise<void> => {
      if (isPoll) setRefreshing(true)
      try {
        const params = new URLSearchParams({ range })
        if (franchiseId) {
          params.set('franchise_id', franchiseId)
        }
        const response = await fetch(`/api/dashboard?${params.toString()}`, {
          credentials: 'include',
        })
        if (response.status === 401 || response.status === 403) {
          router.replace(loginPath)
          return
        }
        if (!response.ok) throw new Error('Failed to fetch dashboard')
        const dashboardData: DashboardData = await response.json()
        setData(dashboardData)
        setLastUpdated(new Date())
        setError('')
      } catch (err) {
        setError('No se pudo cargar el panel. Intenta refrescar o vuelve a iniciar sesión.')
        console.error(err)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [range, franchiseId, router, loginPath]
  )

  useEffect(() => {
    void fetchDashboard()
    const interval = setInterval(() => void fetchDashboard(true), POLL_MS)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pk-bg">
        <Loader2 className="h-10 w-10 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">
          {surface === 'support' ? 'Cargando panel de soporte…' : 'Cargando panel operativo…'}
        </p>
      </div>
    )
  }

  if (error || !data || !lastUpdated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-card">
          <p className="text-sm text-red-800">
            {error || (surface === 'support' ? 'Sin datos de soporte' : 'Sin datos')}
          </p>
          <Button className="mt-4" onClick={() => void fetchDashboard()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pk-bg">
      <div className="flex flex-wrap items-end justify-end gap-3 px-4 pt-3">
        <FranchiseFilterSelect
          className="min-w-[220px]"
          value={franchiseId}
          onChange={setFranchiseId}
        />
        <RoleSwitcher />
      </div>
      <DashboardView
        data={data}
        lastUpdated={lastUpdated}
        range={range}
        onRangeChange={setRange}
        onRefresh={() => void fetchDashboard(true)}
        refreshing={refreshing}
        surface={surface}
      />
    </div>
  )
}
