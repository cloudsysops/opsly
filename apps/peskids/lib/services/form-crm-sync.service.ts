import { markCRMSynced, markCRMSyncFailed, listPendingCRMSync } from './form.service';

// GoHighLevel API integration
// Syncs family form responses to CRM

interface GHLContact {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

interface FormResponseData {
  full_name?: string;
  nombre_completo?: string;
  email?: string;
  phone?: string;
  telefono?: string;
  children_names?: string;
  nombres_hijos?: string;
  grade_levels?: string;
  grados?: string;
  availability?: string;
  disponibilidad?: string;
  parent_name?: string;
  nombre_padre?: string;
  message?: string;
  [key: string]: unknown;
}

function parseFormResponse(data: FormResponseData): GHLContact {
  // Extract common fields from form response
  const fullName = (data.full_name ||
    data.nombre_completo ||
    data.parent_name ||
    data.nombre_padre ||
    'Nueva Familia') as string;

  const nameParts = fullName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  const email = data.email as string | undefined;
  const phone = (data.phone || data.telefono) as string | undefined;
  const childrenNames = (data.children_names || data.nombres_hijos || '') as string;
  const grades = (data.grade_levels || data.grados || '') as string;

  return {
    firstName,
    lastName: lastName || undefined,
    email,
    phone,
    source: 'peskids-form',
    tags: ['prospective', 'form-submitted'],
    customFields: {
      children_names: childrenNames,
      grades,
    },
  };
}

export async function syncFormResponseToCRM(
  responseId: string,
  formResponseData: FormResponseData
): Promise<{
  success: boolean;
  contactId?: string;
  error?: string;
}> {
  try {
    // Parse form response
    const contact = parseFormResponse(formResponseData);

    // TODO: Implement actual GoHighLevel API call
    // This is a placeholder that simulates CRM sync
    console.error('Syncing to CRM:', {
      responseId,
      contact,
    });

    // Simulate CRM contact creation
    const contactId = `ghl_${responseId.substring(0, 8)}`;

    // Mark as synced
    await markCRMSynced({
      responseId,
      crmContactId: contactId,
    });

    return {
      success: true,
      contactId,
    };
  } catch (error) {
    console.error('Failed to sync form response to CRM:', error);

    // Mark as failed
    await markCRMSyncFailed(responseId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function batchSyncFormsToCRM(limit: number = 10): Promise<{
  successCount: number;
  failureCount: number;
  results: Array<{
    responseId: string;
    success: boolean;
    contactId?: string;
    error?: string;
  }>;
}> {
  try {
    const pendingResponses = await listPendingCRMSync(limit);

    const results = await Promise.all(
      pendingResponses.map(async (response) => {
        const result = await syncFormResponseToCRM(
          response.id,
          response.response_data as FormResponseData
        );
        return {
          responseId: response.id,
          ...result,
        };
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      successCount,
      failureCount,
      results,
    };
  } catch (error) {
    console.error('Batch CRM sync failed:', error);
    throw error;
  }
}
