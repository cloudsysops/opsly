import { AdminShell } from '@/components/admin/admin-shell'
import { CRMContactSearch } from '@/components/crm/crm-contact-search'

export const metadata = {
  title: 'Peskids · CRM - Gestión de Contactos',
  description: 'Búsqueda y gestión centralizada de todos los contactos en Twenty CRM',
}

export default function AdminCRMPage(): React.ReactElement {
  return (
    <AdminShell lastUpdated={new Date()}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 CRM Central</h1>
          <p className="text-gray-600 mt-1">
            Gestión centralizada de contactos en Twenty
          </p>
        </div>

        {/* Search component - admin mode */}
        <CRMContactSearch isAdmin={true} />

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">💡 Un CRM Único</p>
            <p className="text-xs text-blue-700 mt-1">
              Todos los contactos de todas las franquicias en un solo lugar, filtrados por franchise_tenant_id
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">🔍 Búsqueda Inteligente</p>
            <p className="text-xs text-green-700 mt-1">
              Busca por nombre, email, teléfono y filtra por estado o franquicia
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">🔐 Aislamiento Seguro</p>
            <p className="text-xs text-purple-700 mt-1">
              Cada franquicia solo ve sus datos. Admin ve todo.
            </p>
          </div>
        </div>

        {/* Documentation */}
        <div className="bg-gray-50 border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">📚 Documentación Técnica</h2>

          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-900 mb-1">API Endpoints:</p>
              <ul className="space-y-1 font-mono text-xs ml-4">
                <li>
                  <span className="bg-gray-200 px-1 rounded">GET</span> /api/admin/crm/contacts
                </li>
                <li>
                  <span className="bg-gray-200 px-1 rounded">GET</span> /api/crm/search (franquicia)
                </li>
                <li>
                  <span className="bg-gray-200 px-1 rounded">POST</span> /api/webhooks/sync-to-crm
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">Estructura de Datos:</p>
              <div className="bg-white p-3 rounded border border-gray-200 font-mono text-xs">
                <pre>{`{
  "id": "UUID",
  "firstName": "Juan",
  "email": "juan@example.com",
  "status": "lead|enrolled|active|inactive",
  "franchiseTenantId": "UUID",
  "source": "form|referral|web|api",
  "tags": [
    "franchise:UUID",
    "status:lead",
    "source:form"
  ]
}`}</pre>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">Flujo de Sincronización:</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>Contacto se crea en Peskids (form, API, etc)</li>
                <li>Webhook POST a /api/webhooks/sync-to-crm</li>
                <li>Contacto se sincroniza a Twenty con franchise_tenant_id</li>
                <li>Visible en búsqueda filtrada por franquicia</li>
              </ol>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">Ejemplo de Búsqueda (Admin):</p>
              <code className="bg-white p-2 rounded block border border-gray-200 text-xs">
                GET /api/admin/crm/contacts?q=juan&franchise_id=xxx&status=lead
              </code>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-1">Ejemplo de Búsqueda (Franquicia):</p>
              <code className="bg-white p-2 rounded block border border-gray-200 text-xs">
                GET /api/crm/search?q=maria&status=enrolled
              </code>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
