'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

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

interface FranchiseSelectorProps {
  onSelectFranchise?: (franchise: Franchise) => void
  showMap?: boolean
}

const TIER_LABELS = {
  startup: 'Startup',
  business: 'Business',
  enterprise: 'Enterprise',
}

export function FranchiseSelector({ onSelectFranchise, showMap = false }: FranchiseSelectorProps) {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [manualLocation, setManualLocation] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>(showMap ? 'map' : 'list')
  const [radiusKm, setRadiusKm] = useState(50)

  // Request geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada en tu navegador')
      return
    }

    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setLocation(loc)
        fetchNearbyFranchises(loc)
      },
      (err) => {
        setError(`Permiso de ubicación denegado: ${err.message}. Ingresa una ciudad manualmente.`)
        setLoading(false)
      }
    )
  }, [])

  const fetchNearbyFranchises = useCallback(
    async (loc: { latitude: number; longitude: number }, radius = radiusKm) => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          latitude: loc.latitude.toString(),
          longitude: loc.longitude.toString(),
          radiusKm: radius.toString(),
        })

        const response = await fetch(`/api/public/franchises/nearby?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to load franchises')

        const data = await response.json()
        if (data.ok) {
          setFranchises((data.data.franchises || []).sort((a: Franchise, b: Franchise) => a.distanceKm - b.distanceKm))
          setError(null)
        } else {
          setError(data.error)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando franquicias')
      } finally {
        setLoading(false)
      }
    },
    [radiusKm]
  )

  const handleManualLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement geocoding from city name
    // For now, just show error
    setError('Búsqueda por ciudad no implementada aún')
  }

  if (!location) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Encuentra tu franquicia más cercana</CardTitle>
          <CardDescription>Necesitamos tu ubicación para mostrarte las opciones disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleManualLocation} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Ingresa tu ciudad</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Ej: Bogotá, Medellín, Cali"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                />
                <Button type="submit">Buscar</Button>
              </div>
            </div>
          </form>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
            <p className="font-medium mb-2">Cómo habilitar la ubicación:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Haz clic en el icono de candado en la barra de direcciones</li>
              <li>Selecciona &quot;Permitir&quot; para permisos de ubicación</li>
              <li>Recarga la página</li>
            </ul>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Franquicias cercanas ({franchises.length})</CardTitle>
              <CardDescription className="mt-1">
                📍 Radio de búsqueda: {radiusKm}km
              </CardDescription>
            </div>

            {/* View mode toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                Lista
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'map' ? 'primary' : 'outline'}
                onClick={() => setViewMode('map')}
              >
                Mapa
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Radius slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ajusta el radio de búsqueda</label>
            <input
              type="range"
              min="5"
              max="100"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500">Hasta {radiusKm}km</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6 flex items-center justify-center h-40">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Buscando franquicias...
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && viewMode === 'list' && (
        <div className="space-y-3">
          {franchises.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">
                  No hay franquicias disponibles en un radio de {radiusKm}km
                </p>
              </CardContent>
            </Card>
          ) : (
            franchises.map((franchise) => (
              <Card key={franchise.id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectFranchise?.(franchise)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{franchise.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        📍 {franchise.city}, {franchise.country}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        📞 {franchise.phone}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Badge tone={franchise.tier === 'startup' ? 'teal' : franchise.tier === 'business' ? 'violet' : 'amber'}>
                          {TIER_LABELS[franchise.tier]}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {franchise.distanceKm.toFixed(1)}km
                      </p>
                      <p className="text-xs text-gray-500">distancia</p>
                      <Button className="mt-3" size="sm">
                        Seleccionar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {!loading && viewMode === 'map' && (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-gray-100 rounded h-80 flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-2">🗺️</p>
                <p className="text-gray-600 text-sm">
                  Mapa interactivo (requiere Mapbox/Google Maps)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {franchises.length} franquicia(s) disponible(s)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
