export type CollectionStatus = 'owned' | 'duplicate' | 'missing' | 'want';

export interface CollectionItemRow {
  sticker_number: number;
  status: CollectionStatus;
  country: string | null;
  player_name: string | null;
  notes: string | null;
  updated_at: string;
}

export interface ConversationEventRow {
  id: string;
  channel: string;
  sender: string | null;
  raw_input: string;
  intent: string | null;
  created_at: string;
}

const TENANT = 'panini-lab';

const collection = new Map<number, CollectionItemRow>();
const conversations: ConversationEventRow[] = [];

export function memoryUpsertCollectionItem(input: {
  stickerNumber: number;
  status: CollectionStatus;
  country?: string | null;
  playerName?: string | null;
  notes?: string;
}): CollectionItemRow {
  const row: CollectionItemRow = {
    sticker_number: input.stickerNumber,
    status: input.status,
    country: input.country ?? null,
    player_name: input.playerName ?? null,
    notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  collection.set(input.stickerNumber, row);
  return row;
}

export function memoryListCollection(): CollectionItemRow[] {
  return [...collection.values()].sort((a, b) => a.sticker_number - b.sticker_number);
}

export function memoryAppendConversation(input: {
  channel: string;
  sender?: string;
  rawInput: string;
  intent?: string;
}): ConversationEventRow {
  const row: ConversationEventRow = {
    id: crypto.randomUUID(),
    channel: input.channel,
    sender: input.sender ?? null,
    raw_input: input.rawInput,
    intent: input.intent ?? null,
    created_at: new Date().toISOString(),
  };
  conversations.unshift(row);
  if (conversations.length > 200) {
    conversations.length = 200;
  }
  return row;
}

export function memoryListConversations(limit = 50): ConversationEventRow[] {
  return conversations.slice(0, limit);
}

export function memoryTenantSlug(): string {
  return TENANT;
}
