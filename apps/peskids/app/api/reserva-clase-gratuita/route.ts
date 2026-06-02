import { createClient } from '@supabase/supabase-js';
import { reservaClaseGratuitaSchema } from '@/lib/schemas/booking';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type TenantSlug = 'peskids';
const TENANT_SLUG: TenantSlug = 'peskids';

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const body = await request.json();
    const data = reservaClaseGratuitaSchema.parse(body);

    console.log('[booking]', {
      requestId,
      nombre_completo: data.nombre_completo,
      email: data.email,
      fuente_origen: data.fuente_origen,
    });

    // 1. Check if lead exists by email
    const { data: existingLead, error: leadError } = await supabase
      .from('leads')
      .select('id')
      .eq('email', data.email)
      .eq('tenant_id', TENANT_SLUG)
      .single();

    if (leadError && leadError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      throw leadError;
    }

    let leadId: string;

    if (existingLead) {
      leadId = existingLead.id;
      console.log('[booking] existing lead found', { lead_id: leadId });

      // Update lead info if we have new data
      await supabase
        .from('leads')
        .update({
          name: data.nombre_completo,
          phone: data.telefono,
          referral_source: data.fuente_origen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('tenant_id', TENANT_SLUG);
    } else {
      // 2. Create new lead
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert([
          {
            tenant_id: TENANT_SLUG,
            name: data.nombre_completo,
            email: data.email,
            phone: data.telefono,
            grade_interested: data.grado_o_edad,
            referral_source: data.fuente_origen,
            status: 'new',
            admin_notes: data.notas || null,
          },
        ])
        .select('id')
        .single();

      if (insertError) throw insertError;
      leadId = newLead.id;
      console.log('[booking] new lead created', { lead_id: leadId });
    }

    // 3. Check if student exists for this lead
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('parent_email', data.email)
      .eq('tenant_id', TENANT_SLUG)
      .single();

    let studentId: string | null = null;

    if (existingStudent) {
      studentId = existingStudent.id;
    } else {
      // 4. Create student record if new
      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert([
          {
            tenant_id: TENANT_SLUG,
            name: data.nombre_estudiante,
            grade: data.grado_o_edad,
            parent_email: data.email,
            status: 'active',
            enrollment_date: new Date().toISOString().split('T')[0],
          },
        ])
        .select('id')
        .single();

      if (studentError) {
        console.warn('[booking] student creation failed', { error: studentError });
      } else {
        studentId = newStudent.id;
        console.log('[booking] new student created', { student_id: studentId });
      }
    }

    // 5. Create trial class enrollment (using status 'reserved' for trial)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('class_enrollments')
      .insert([
        {
          tenant_slug: TENANT_SLUG,
          class_id: null, // Will be null for initial trial reservation
          student_id: studentId,
          family_user_id: leadId, // Using lead_id as family_user_id temporarily
          status: 'reserved', // Trial reservation
          payment_status: 'pending', // Free trial, no payment
        },
      ])
      .select('id')
      .single();

    if (enrollmentError) {
      console.warn('[booking] enrollment creation failed', { error: enrollmentError });
    }

    // 6. Log the booking event with source tracking
    const { error: auditError } = await supabase.from('leads').update({
      status: 'contacted', // Mark as contacted since they're booking
    }).eq('id', leadId);

    if (auditError) {
      console.warn('[booking] audit log failed', { error: auditError });
    }

    return Response.json(
      {
        ok: true,
        data: {
          id: requestId,
          lead_id: leadId,
          student_id: studentId,
          reservation_id: enrollment?.id || null,
          status: 'confirmed',
          message: `Reserva confirmada para ${data.nombre_estudiante}. Recibirás un email de confirmación pronto.`,
        },
        request_id: requestId,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[booking] request failed', { error: errorMessage });

    if (error instanceof Error && errorMessage.includes('validation')) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid request data',
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: 'Failed to create reservation. Please try again later.',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
