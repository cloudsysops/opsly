import type { MemoryPort } from '@intcloudsysops/conversational-runtime';
import { parseCollectionUpdatesFromUtterance } from './parse-collection';
import {
  memoryAppendConversation,
  memoryListCollection,
  memoryListConversations,
  memoryUpsertCollectionItem,
  type CollectionItemRow,
  type CollectionStatus,
  type ConversationEventRow,
} from './memory-store';
import { paniniDb, supabaseServer } from './supabase';

const TENANT_SLUG = 'panini-lab';

export async function listCollectionItems(): Promise<CollectionItemRow[]> {
  const client = supabaseServer();
  if (!client) {
    return memoryListCollection();
  }

  const { data, error } = await paniniDb(client)
    .from('collection_items')
    .select('sticker_number, status, country, player_name, notes, updated_at')
    .eq('tenant_slug', TENANT_SLUG)
    .order('sticker_number', { ascending: true });

  if (error) {
    return memoryListCollection();
  }

  return (data ?? []).map((row) => ({
    sticker_number: row.sticker_number as number,
    status: row.status as CollectionStatus,
    country: (row.country as string | null) ?? null,
    player_name: (row.player_name as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    updated_at: row.updated_at as string,
  }));
}

export async function listRecentConversations(limit = 30): Promise<ConversationEventRow[]> {
  const client = supabaseServer();
  if (!client) {
    return memoryListConversations(limit);
  }

  const { data, error } = await paniniDb(client)
    .from('conversation_events')
    .select('id, channel, sender, raw_input, intent, created_at')
    .eq('tenant_slug', TENANT_SLUG)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return memoryListConversations(limit);
  }

  return (data ?? []) as ConversationEventRow[];
}

export async function applyCollectionUpdates(utterance: string): Promise<CollectionItemRow[]> {
  const updates = parseCollectionUpdatesFromUtterance(utterance);
  const client = supabaseServer();
  const applied: CollectionItemRow[] = [];

  for (const update of updates) {
    if (client) {
      const { data, error } = await paniniDb(client)
        .from('collection_items')
        .upsert(
          {
            tenant_slug: TENANT_SLUG,
            sticker_number: update.stickerNumber,
            status: update.status,
            country: update.country ?? null,
            player_name: update.playerName ?? null,
            notes: utterance.slice(0, 500),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_slug,sticker_number' }
        )
        .select('sticker_number, status, country, player_name, notes, updated_at')
        .single();

      if (!error && data) {
        applied.push({
          sticker_number: data.sticker_number as number,
          status: data.status as CollectionStatus,
          country: (data.country as string | null) ?? null,
          player_name: (data.player_name as string | null) ?? null,
          notes: (data.notes as string | null) ?? null,
          updated_at: data.updated_at as string,
        });
        continue;
      }
    }

    applied.push(
      memoryUpsertCollectionItem({
        stickerNumber: update.stickerNumber,
        status: update.status,
        country: update.country,
        playerName: update.playerName,
        notes: utterance.slice(0, 500),
      })
    );
  }

  return applied;
}

export function createPaniniMemoryPort(): MemoryPort {
  return {
    async persistConversation(input) {
      const client = supabaseServer();
      if (client) {
        await paniniDb(client)
          .from('conversation_events')
          .insert({
            tenant_slug: TENANT_SLUG,
            channel: input.channel,
            sender: input.sender ?? null,
            raw_input: input.rawInput,
            intent: input.intent ?? null,
            entities: input.entities ?? {},
            opsly_events: input.opslyEvents ?? [],
          });
        return;
      }

      memoryAppendConversation({
        channel: input.channel,
        sender: input.sender,
        rawInput: input.rawInput,
        intent: input.intent,
      });
    },
  };
}
