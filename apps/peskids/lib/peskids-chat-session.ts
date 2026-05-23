export const PESKIDS_CHAT_SESSION_KEY = 'peskids_chat_session_id'

export const PESKIDS_CHAT_OPEN_EVENT = 'peskids:open-chat'

export function getOrCreateChatSessionId(): string {
  if (typeof window === 'undefined') return 'web-ssr'
  let id = localStorage.getItem(PESKIDS_CHAT_SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(PESKIDS_CHAT_SESSION_KEY, id)
  }
  return id
}

export function dispatchOpenPeskidsChat(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PESKIDS_CHAT_OPEN_EVENT))
}
