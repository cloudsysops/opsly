import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { getLeadForAdmin, updateLeadForAdmin } from '@/lib/services/lead-admin.service';
import type { DashboardLead } from '@/lib/services/lead-admin.service';

type StudentRow = Database['public']['Tables']['students']['Row'];

export type ConvertLeadResult = {
  student: StudentRow;
  lead: DashboardLead;
};

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

async function findStudentBySourceLeadId(leadId: string): Promise<StudentRow | null> {
  const { data, error } = await supabaseServer()
    .from('students')
    .select('*')
    .eq('tenant_id', tenantSlug())
    .eq('source_lead_id', leadId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function convertLeadToStudent(
  leadId: string,
  slug: string = tenantSlug()
): Promise<ConvertLeadResult | null> {
  const lead = await getLeadForAdmin(leadId, slug);
  if (!lead) {
    return null;
  }

  const existing = await findStudentBySourceLeadId(leadId);
  if (existing) {
    const updatedLead = await updateLeadForAdmin(leadId, slug, { status: 'enrolled' });
    if (!updatedLead) {
      return null;
    }
    return { student: existing, lead: updatedLead };
  }

  const notes = lead.admin_notes
    ? `Convertido desde interesado. ${lead.admin_notes}`
    : 'Convertido desde interesado.';

  const { data: student, error } = await supabaseServer()
    .from('students')
    .insert({
      tenant_id: slug,
      name: lead.name,
      grade: lead.grade_interested,
      parent_email: lead.email,
      parent_phone: lead.phone,
      notes,
      source_lead_id: leadId,
    })
    .select('*')
    .single();

  if (error) throw error;

  const updatedLead = await updateLeadForAdmin(leadId, slug, { status: 'enrolled' });
  if (!updatedLead) {
    return null;
  }

  return { student, lead: updatedLead };
}
