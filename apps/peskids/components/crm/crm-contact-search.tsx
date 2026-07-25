'use client'

import { useEffect, useState } from 'react'
import { Search, Loader2, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Contact {
  id: string
  firstName: string
  lastName?: string
  email: string
  phone?: string
  status: 'lead' | 'enrolled' | 'active' | 'inactive'
  source: string
  franchiseTenantId: string
  createdAt: string
}

interface CRMContactSearchProps {
  isAdmin?: boolean
  franchiseId?: string
  onSelectContact?: (contact: Contact) => void
}

const STATUS_TONE = {
  lead: 'amber',
  enrolled: 'teal',
  active: 'green',
  inactive: 'coral',
} as const

const STATUS_LABEL = {
  lead: 'Lead',
  enrolled: 'Inscrito',
  active: 'Activo',
  inactive: 'Inactivo',
} as const

export function CRMContactSearch({
  isAdmin = false,
  franchiseId,
  onSelectContact,
}: CRMContactSearchProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 0 || status !== 'all') {
        searchContacts()
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, status])

  const searchContacts = async () => {
    try {
      setLoading(true)
      const endpoint = isAdmin ? '/api/admin/crm/contacts' : '/api/crm/search'
      const params = new URLSearchParams({
        q: query,
        limit: '50',
        offset: offset.toString(),
      })

      if (status !== 'all') params.append('status', status)
      if (isAdmin && franchiseId) params.append('franchise_id', franchiseId)

      const response = await fetch(`${endpoint}?${params.toString()}`)
      const data = await response.json()

      if (data.ok) {
        setContacts(data.data.contacts || [])
        setTotal(data.data.total || 0)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    searchContacts()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Búsqueda de Contactos CRM</CardTitle>
        <CardDescription>
          {isAdmin
            ? 'Buscar contactos en todas las franquicias'
            : 'Buscar contactos en tu franquicia'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, email, teléfono..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button type="submit">Buscar</Button>
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setOffset(0)
              }}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="lead">Lead</option>
              <option value="enrolled">Inscrito</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </form>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}

        {/* Results */}
        {!loading && contacts.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            {query || status !== 'all'
              ? 'No se encontraron contactos'
              : 'Comienza a buscar contactos'}
          </div>
        )}

        {!loading && contacts.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Se encontraron {total} resultado(s)
            </p>

            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelectContact?.(contact)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {contact.firstName} {contact.lastName || ''}
                    </h4>

                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Badge
                        tone={STATUS_TONE[contact.status as keyof typeof STATUS_TONE]}
                      >
                        {STATUS_LABEL[contact.status as keyof typeof STATUS_LABEL]}
                      </Badge>
                      <Badge tone="neutral">{contact.source}</Badge>
                      {isAdmin && (
                        <Badge tone="neutral">📍 {contact.franchiseTenantId.slice(0, 8)}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    <p>{new Date(contact.createdAt).toLocaleDateString('es-CO')}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {total > 50 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - 50))}
                >
                  ← Anterior
                </Button>
                <span className="text-sm text-gray-600">
                  {offset + 1} - {Math.min(offset + 50, total)} de {total}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + 50 >= total}
                  onClick={() => setOffset(offset + 50)}
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
