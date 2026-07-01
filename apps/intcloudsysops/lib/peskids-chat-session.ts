export const PESKIDS_CHAT_SESSION_KEY = 'peskids_chat_session_id';

export const PESKIDS_CHAT_OPEN_EVENT = 'peskids:open-chat';

export function getOrCreateChatSessionId(mode: 'admissions' | 'support' = 'admissions'): string {
  if (typeof window === 'undefined') return 'web-ssr';
  const storageKey = `${PESKIDS_CHAT_SESSION_KEY}:${mode}`;
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id = `${mode}:${crypto.randomUUID()}`;
    localStorage.setItem(storageKey, id);
  } else if (!id.startsWith(`${mode}:`)) {
    id = `${mode}:${id}`;
    localStorage.setItem(storageKey, id);
  }
  return id;
}

export function dispatchOpenPeskidsChat(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PESKIDS_CHAT_OPEN_EVENT));
}
