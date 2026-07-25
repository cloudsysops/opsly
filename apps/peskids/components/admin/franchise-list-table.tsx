'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Franchise {
  id: string
  name: string
  city: string
  tier: 'startup' | 'business' | 'enterprise'
  status: 'provisioning' | 'under_review' | 'approved' | 'active' | 'suspended'
  monthlyRevenue: number
  studentCount: number
  createdAt: string
}

interface FranchiseListTableProps {
  onSelectFranchise?: (franchiseId: string) => void
  onStatusChange?: (franchiseId: string, newStatus: string) => void
}

const STATUS_COLORS = {
  provisioning: 'bg-gray-100 text-gray-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  provisioning: 'Preparando',
  under_review: 'En revisión',
  approved: 'Aprobada',
  active: 'Activa',
  suspended: 'Suspendida',
}

const TIER_COLORS = {
  startup: 'bg-blue-50 text-blue-700',
  business: 'bg-purple-50 text-purple-700',
  enterprise: 'bg-amber-50 text-amber-700',
}

const TIER_LABELS = {
  startup: 'Startup ($99/mes)',
  business: 'Business ($499/mes)',
  enterprise: 'Enterprise ($1.999/mes)',
}

export function FranchiseListTable({ onSelectFranchise, onStatusChange }: FranchiseListTableProps) {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'city' | 'status' | 'revenue' | 'created'>('created')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Fetch franchises
  useEffect(() => {
    const fetchFranchises = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (filterStatus !== 'all') params.append('status', filterStatus)
        if (filterTier !== 'all') params.append('tier', filterTier)
        params.append('offset', '0')
        params.append('limit', '100')

        const response = await fetch(`/api/admin/franchises?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to load franchises')

        const data = await response.json()
        if (data.ok) {
          setFranchises(data.data.franchises || [])
        } else {
          setError(data.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchFranchises()
  }, [filterStatus, filterTier])

  // Filter and sort
  const filtered = useMemo(() => {
    let result = franchises

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(term) || f.city.toLowerCase().includes(term)
      )
    }

    return result.sort((a, b) => {
      let compareA = 0

      switch (sortBy) {
        case 'name':
          compareA = a.name.localeCompare(b.name)
          break
        case 'city':
          compareA = a.city.localeCompare(b.city)
          break
        case 'status':
          compareA = a.status.localeCompare(b.status)
          break
        case 'revenue':
          compareA = a.monthlyRevenue - b.monthlyRevenue
          break
        case 'created':
          compareA = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return sortDir === 'asc' ? compareA : -compareA
    })
  }, [franchises, searchTerm, sortBy, sortDir])

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  const handleStatusChange = async (franchiseId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/franchises', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchiseTenantId: franchiseId,
          status: newStatus,
          notes: `Status changed to ${newStatus}`,
        }),
      })

      if (response.ok) {
        onStatusChange?.(franchiseId, newStatus)
        // Refetch
        setFranchises((prev) =>
          prev.map((f) => (f.id === franchiseId ? { ...f, status: newStatus as any } : f))
        )
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500">Cargando franquicias...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <p className="text-red-600">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Franquicias ({filtered.length})</CardTitle>
            <CardDescription>Gestiona y monitorea todas las franquicias</CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar franquicia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="provisioning">Preparando</option>
            <option value="under_review">En revisión</option>
            <option value="approved">Aprobada</option>
            <option value="active">Activa</option>
            <option value="suspended">Suspendida</option>
          </select>

          {/* Tier filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los planes</option>
            <option value="startup">Startup</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>

          {/* Bulk actions placeholder */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              Acciones
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        <div className="border rounded-lg">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('name')}
                >
                  Nombre {sortBy === 'name' && '▲'}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('city')}
                >
                  📍 Ciudad {sortBy === 'city' && '▲'}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('status')}
                >
                  Estado {sortBy === 'status' && '▲'}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('revenue')}
                >
                  📈 Ingresos (MoM) {sortBy === 'revenue' && '▲'}
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Estudiantes</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron franquicias
                  </td>
                </tr>
              ) : (
                filtered.map((franchise) => (
                  <tr key={franchise.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onSelectFranchise?.(franchise.id)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {franchise.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{franchise.city}</td>
                    <td className="px-4 py-3">
                      <Badge className={TIER_COLORS[franchise.tier]}>
                        {TIER_LABELS[franchise.tier]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge className={cn('capitalize', STATUS_COLORS[franchise.status])}>
                          {STATUS_LABELS[franchise.status]}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      ${(franchise.monthlyRevenue / 100).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3">{franchise.studentCount}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {franchise.status === 'under_review' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(franchise.id, 'approved')}
                            className="text-xs"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {franchise.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(franchise.id, 'active')}
                            className="text-xs"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                        {franchise.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(franchise.id, 'suspended')}
                            className="text-xs"
                          >
                            ⏸
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          ⋮
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
