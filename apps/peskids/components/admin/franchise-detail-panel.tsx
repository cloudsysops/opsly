'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Mail,
  Phone,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FranchiseDetails {
  id: string
  name: string
  email: string
  phone: string
  city: string
  country: string
  tier: 'startup' | 'business' | 'enterprise'
  status: 'provisioning' | 'under_review' | 'approved' | 'active' | 'suspended'
  studentCount: number
  monthlyRevenue: number
  createdAt: string
  approvalDate?: string
  activationDate?: string
}

interface FranchiseDetailPanelProps {
  franchiseId: string
  onClose?: () => void
}

const STATUS_LABELS = {
  provisioning: 'Preparando',
  under_review: 'En revisión',
  approved: 'Aprobada',
  active: 'Activa',
  suspended: 'Suspendida',
}

const TIER_LABELS = {
  startup: 'Startup ($99/mes)',
  business: 'Business ($499/mes)',
  enterprise: 'Enterprise ($1.999/mes)',
}

export function FranchiseDetailPanel({ franchiseId, onClose }: FranchiseDetailPanelProps) {
  const [franchise, setFranchise] = useState<FranchiseDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<FranchiseDetails>>({})

  useEffect(() => {
    const fetchFranchise = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/franchises/${franchiseId}`)
        if (!response.ok) throw new Error('Failed to load franchise')

        const data = await response.json()
        if (data.ok) {
          setFranchise(data.data)
          setEditData(data.data)
        } else {
          setError(data.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchFranchise()
  }, [franchiseId])

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/franchises', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          franchiseTenantId: franchiseId,
          status: editData.status,
        }),
      })

      if (response.ok) {
        setFranchise({ ...franchise!, ...editData })
        setEditing(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500">Cargando detalles...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !franchise) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-red-600">Error: {error}</p>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{franchise.name}</CardTitle>
              <CardDescription className="mt-2">
                📍 {franchise.city}, {franchise.country}
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status & Tier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Estado</Label>
              {editing ? (
                <select
                  value={editData.status || franchise.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                >
                  <option value="provisioning">Preparando</option>
                  <option value="under_review">En revisión</option>
                  <option value="approved">Aprobada</option>
                  <option value="active">Activa</option>
                  <option value="suspended">Suspendida</option>
                </select>
              ) : (
                <Badge tone={franchise.status === 'active' ? 'green' : franchise.status === 'suspended' ? 'coral' : franchise.status === 'approved' ? 'teal' : 'amber'}>
                  {STATUS_LABELS[franchise.status]}
                </Badge>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Plan</Label>
              <Badge tone={franchise.tier === 'startup' ? 'teal' : franchise.tier === 'business' ? 'violet' : 'amber'}>
                {TIER_LABELS[franchise.tier]}
              </Badge>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <p className="text-sm font-medium">{franchise.email}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <p className="text-sm font-medium">{franchise.phone}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            {franchise.createdAt && (
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">
                  📅 Creada
                </Label>
                <p className="text-sm">
                  {new Date(franchise.createdAt).toLocaleDateString('es-CO')}
                </p>
              </div>
            )}
            {franchise.approvalDate && (
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">
                  ✅ Aprobada
                </Label>
                <p className="text-sm">
                  {new Date(franchise.approvalDate).toLocaleDateString('es-CO')}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4 border-t">
            {!editing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                ✏️ Editar
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={handleSave} className="bg-blue-600">
                  💾 Guardar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(false)
                    setEditData(franchise)
                  }}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase">Estudiantes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{franchise.studentCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase">Ingresos (MoM)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${(franchise.monthlyRevenue / 100).toLocaleString('es-CO')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm">Tenencia creada y configurada</span>
            </div>
            <div className={cn(
              'flex items-center gap-3',
              franchise.status !== 'provisioning' ? 'text-gray-800' : 'text-gray-400'
            )}>
              {franchise.status !== 'provisioning' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              <span className="text-sm">Datos iniciales completados</span>
            </div>
            <div className={cn(
              'flex items-center gap-3',
              franchise.status === 'approved' || franchise.status === 'active' ? 'text-gray-800' : 'text-gray-400'
            )}>
              {franchise.status === 'approved' || franchise.status === 'active' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              <span className="text-sm">Aprobación completada</span>
            </div>
            <div className={cn(
              'flex items-center gap-3',
              franchise.status === 'active' ? 'text-gray-800' : 'text-gray-400'
            )}>
              {franchise.status === 'active' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              <span className="text-sm">Activación completada</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
