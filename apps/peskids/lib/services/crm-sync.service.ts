/**
 * CRM Sync Service - Twenty.com integration
 * Single CRM instance, multi-tenant by franchise_tenant_id
 */

interface TwentyContact {
  id?: string
  franchiseTenantId: string
  firstName: string
  lastName?: string
  email: string
  phone?: string
  status: 'lead' | 'enrolled' | 'active' | 'inactive'
  source: 'form' | 'referral' | 'web' | 'api'
  notes?: string
  createdAt?: string
}

interface CRMSyncResult {
  success: boolean
  contactId?: string
  error?: string
}

// TODO: Configure Twenty API endpoint and API key
const TWENTY_API_URL = process.env.TWENTY_API_URL || 'https://api.twenty.com/graphql'
const TWENTY_API_KEY = process.env.TWENTY_API_KEY || ''

/**
 * Sync contact to Twenty CRM
 * Includes franchise_tenant_id for multi-tenant filtering
 */
export async function syncContactToCRM(
  contact: TwentyContact
): Promise<CRMSyncResult> {
  try {
    if (!TWENTY_API_KEY) {
      return {
        success: false,
        error: 'Twenty API key not configured',
      }
    }

    const query = `
      mutation CreateContact($input: CreateContactInput!) {
        createContact(input: $input) {
          id
          firstName
          lastName
          email
          phone
        }
      }
    `

    const response = await fetch(TWENTY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TWENTY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          input: {
            firstName: contact.firstName,
            lastName: contact.lastName || '',
            email: contact.email,
            phone: contact.phone || '',
            // Custom fields for multi-tenancy
            customFields: {
              franchise_tenant_id: contact.franchiseTenantId,
              status: contact.status,
              source: contact.source,
              notes: contact.notes || '',
            },
            // Tags for filtering in views
            tags: [
              `franchise:${contact.franchiseTenantId}`,
              `status:${contact.status}`,
              `source:${contact.source}`,
            ],
          },
        },
      }),
    })

    const data = await response.json()

    if (data.errors) {
      return {
        success: false,
        error: data.errors[0]?.message || 'Failed to sync contact',
      }
    }

    return {
      success: true,
      contactId: data.data?.createContact?.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Search contacts in CRM filtered by franchise
 */
export async function searchCRMContacts(
  franchiseTenantId: string,
  query: string,
  options?: {
    status?: string
    limit?: number
    offset?: number
  }
): Promise<{
  success: boolean
  contacts?: TwentyContact[]
  total?: number
  error?: string
}> {
  try {
    if (!TWENTY_API_KEY) {
      return {
        success: false,
        error: 'Twenty API key not configured',
      }
    }

    const graphqlQuery = `
      query SearchContacts($filter: ContactFilter!, $limit: Int, $offset: Int) {
        contacts(filter: $filter, limit: $limit, offset: $offset) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              createdAt
              customFields {
                franchise_tenant_id
                status
                source
                notes
              }
            }
          }
          pageInfo {
            totalCount
          }
        }
      }
    `

    const filter: Record<string, unknown> = {
      AND: [
        {
          customFields: {
            franchise_tenant_id: {
              equals: franchiseTenantId,
            },
          },
        },
      ],
    }

    // Add status filter if provided
    if (options?.status) {
      ;(filter.AND as Array<Record<string, unknown>>).push({
        customFields: {
          status: {
            equals: options.status,
          },
        },
      })
    }

    // Add text search if query provided
    if (query) {
      ;(filter.AND as Array<Record<string, unknown>>).push({
        OR: [
          { firstName: { ilike: `%${query}%` } },
          { lastName: { ilike: `%${query}%` } },
          { email: { ilike: `%${query}%` } },
          { phone: { ilike: `%${query}%` } },
        ],
      })
    }

    const response = await fetch(TWENTY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TWENTY_API_KEY}`,
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: {
          filter,
          limit: options?.limit || 50,
          offset: options?.offset || 0,
        },
      }),
    })

    const data = await response.json()

    if (data.errors) {
      return {
        success: false,
        error: data.errors[0]?.message || 'Failed to search contacts',
      }
    }

    const contacts = (data.data?.contacts?.edges || []).map((edge: any) => ({
      id: edge.node.id,
      franchiseTenantId: edge.node.customFields.franchise_tenant_id,
      firstName: edge.node.firstName,
      lastName: edge.node.lastName,
      email: edge.node.email,
      phone: edge.node.phone,
      status: edge.node.customFields.status,
      source: edge.node.customFields.source,
      notes: edge.node.customFields.notes,
      createdAt: edge.node.createdAt,
    }))

    return {
      success: true,
      contacts,
      total: data.data?.contacts?.pageInfo?.totalCount || 0,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get all contacts for a franchise (used in franchise portal)
 */
export async function getFranchiseContacts(
  franchiseTenantId: string,
  options?: {
    status?: string
    limit?: number
    offset?: number
  }
) {
  return searchCRMContacts(franchiseTenantId, '', options)
}

/**
 * Get all contacts across franchises (admin only)
 */
export async function getAllContactsForAdmin(options?: {
  franchiseTenantId?: string
  status?: string
  limit?: number
  offset?: number
}) {
  try {
    if (!TWENTY_API_KEY) {
      return {
        success: false,
        error: 'Twenty API key not configured',
      }
    }

    const graphqlQuery = `
      query GetAllContacts($filter: ContactFilter!, $limit: Int, $offset: Int) {
        contacts(filter: $filter, limit: $limit, offset: $offset) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              createdAt
              customFields {
                franchise_tenant_id
                status
                source
                notes
              }
            }
          }
          pageInfo {
            totalCount
          }
        }
      }
    `

    const filter: Record<string, unknown> = {}

    // Admin can filter by specific franchise or see all
    if (options?.franchiseTenantId) {
      filter.customFields = {
        franchise_tenant_id: {
          equals: options.franchiseTenantId,
        },
      }
    }

    // Add status filter if provided
    if (options?.status) {
      if (!filter.AND) filter.AND = []
      ;(filter.AND as Array<Record<string, unknown>>).push({
        customFields: {
          status: {
            equals: options.status,
          },
        },
      })
    }

    const response = await fetch(TWENTY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TWENTY_API_KEY}`,
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: {
          filter,
          limit: options?.limit || 100,
          offset: options?.offset || 0,
        },
      }),
    })

    const data = await response.json()

    if (data.errors) {
      return {
        success: false,
        error: data.errors[0]?.message || 'Failed to fetch contacts',
      }
    }

    const contacts = (data.data?.contacts?.edges || []).map((edge: any) => ({
      id: edge.node.id,
      franchiseTenantId: edge.node.customFields.franchise_tenant_id,
      firstName: edge.node.firstName,
      lastName: edge.node.lastName,
      email: edge.node.email,
      phone: edge.node.phone,
      status: edge.node.customFields.status,
      source: edge.node.customFields.source,
      notes: edge.node.customFields.notes,
      createdAt: edge.node.createdAt,
    }))

    return {
      success: true,
      contacts,
      total: data.data?.contacts?.pageInfo?.totalCount || 0,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update contact in CRM
 */
export async function updateCRMContact(
  contactId: string,
  updates: Partial<TwentyContact>
): Promise<CRMSyncResult> {
  try {
    if (!TWENTY_API_KEY) {
      return {
        success: false,
        error: 'Twenty API key not configured',
      }
    }

    const query = `
      mutation UpdateContact($id: ID!, $input: UpdateContactInput!) {
        updateContact(id: $id, input: $input) {
          id
          firstName
          lastName
          email
          phone
        }
      }
    `

    const response = await fetch(TWENTY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TWENTY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          id: contactId,
          input: {
            firstName: updates.firstName,
            lastName: updates.lastName,
            email: updates.email,
            phone: updates.phone,
            customFields: {
              status: updates.status,
              notes: updates.notes,
            },
          },
        },
      }),
    })

    const data = await response.json()

    if (data.errors) {
      return {
        success: false,
        error: data.errors[0]?.message || 'Failed to update contact',
      }
    }

    return {
      success: true,
      contactId: data.data?.updateContact?.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
