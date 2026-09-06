#!/usr/bin/env npx tsx
/**
 * Wipe Peskids admin inbox messages + seed improvement-chat welcome note.
 *
 * Usage:
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     npx tsx scripts/peskids/clean-production-inbox.ts --dry-run
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     npx tsx scripts/peskids/clean-production-inbox.ts --yes
 */
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TENANT_ID = 'peskids';

const WELCOME_BODY = [
  'Hola equipo Peskids 👋',
  '',
  'Este chat es el canal directo con Opsly para pedirnos cambios, mejoras o reportar errores de la plataforma.',
  '',
  'Úsenlo cuando vean algo que ajustar (pantallas, formularios, WhatsApp, reportes, etc.). Nosotros leemos el mensaje, lo priorizamos y lo ejecutamos.',
  '',
  'No es el inbox de familias ni WhatsApp de padres: eso sigue en Mensajes.',
  '',
  'Pueden escribir la primera solicitud cuando quieran.',
].join('\n');

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const confirmed = process.argv.includes('--yes');
  if (!dryRun && !confirmed) {
    console.error('Refusing without --dry-run or --yes');
    process.exit(1);
  }

  execFileSync(
    'bash',
    [join(dirname(fileURLToPath(import.meta.url)), '../lib/peskids-data-safety-guard.sh'), 'inbox cleanup'],
    { env: process.env, stdio: 'inherit' }
  );

  const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count: msgCount, error: msgCountError } = await admin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);
  if (msgCountError) throw msgCountError;

  console.log(`TENANT=${TENANT_ID}`);
  console.log(`MESSAGES=${msgCount ?? 0}`);

  const platform = admin.schema('platform');
  const { count: legacyCount, error: legacyError } = await platform
    .from('peskids_messages')
    .select('id', { count: 'exact', head: true });
  if (legacyError) {
    console.log(`LEGACY_PESKIDS_MESSAGES=skip (${legacyError.message})`);
  } else {
    console.log(`LEGACY_PESKIDS_MESSAGES=${legacyCount ?? 0}`);
  }

  if (dryRun) {
    console.log('DRY_RUN=ok (no deletes / no seed)');
    return;
  }

  // Null parent refs first to avoid FK friction on self-references
  const { error: nullParentError } = await admin
    .from('messages')
    .update({ parent_message_id: null })
    .eq('tenant_id', TENANT_ID)
    .not('parent_message_id', 'is', null);
  if (nullParentError) {
    console.log(`NULL_PARENT_WARN=${nullParentError.message}`);
  }

  const { error: deleteError, count: deleted } = await admin
    .from('messages')
    .delete({ count: 'exact' })
    .eq('tenant_id', TENANT_ID);
  if (deleteError) throw deleteError;
  console.log(`DELETED_MESSAGES=${deleted ?? 0}`);

  if (!legacyError && (legacyCount ?? 0) > 0) {
    const { error: legacyDeleteError, count: deletedLegacy } = await platform
      .from('peskids_messages')
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (legacyDeleteError) {
      console.log(`LEGACY_DELETE_WARN=${legacyDeleteError.message}`);
    } else {
      console.log(`DELETED_LEGACY_PESKIDS_MESSAGES=${deletedLegacy ?? 0}`);
    }
  }

  // Seed a single welcome assistant note (replace prior welcome if re-run)
  const { data: existingWelcome } = await admin
    .from('staff_improvement_messages')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .eq('role', 'assistant')
    .ilike('body', 'Hola equipo Peskids%')
    .maybeSingle();

  if (existingWelcome?.id) {
    const { error: updateError } = await admin
      .from('staff_improvement_messages')
      .update({
        body: WELCOME_BODY,
        status: 'analyzed',
        category: 'question',
        priority: 'media',
        ai_summary: 'Mensaje de bienvenida: canal Opsly para cambios y mejoras',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingWelcome.id);
    if (updateError) throw updateError;
    console.log('WELCOME_UPDATED');
  } else {
    const { error: insertError } = await admin.from('staff_improvement_messages').insert({
      tenant_id: TENANT_ID,
      role: 'assistant',
      author_email: null,
      body: WELCOME_BODY,
      category: 'question',
      priority: 'media',
      ai_summary: 'Mensaje de bienvenida: canal Opsly para cambios y mejoras',
      status: 'analyzed',
    });
    if (insertError) throw insertError;
    console.log('WELCOME_SEEDED');
  }

  const { count: remaining } = await admin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', TENANT_ID);
  console.log(`REMAINING_MESSAGES=${remaining ?? 0}`);
  console.log('CLEAN_INBOX_DONE');
}

main().catch((err: unknown) => {
  console.error('CLEAN_INBOX_FAILED');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
