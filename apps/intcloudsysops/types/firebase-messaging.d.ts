declare module 'firebase/messaging' {
  export interface Messaging {}

  export interface MessagePayload {
    notification?: {
      title?: string;
      body?: string;
    };
  }

  export function getMessaging(app?: unknown): Messaging;
  export function getToken(
    messaging: Messaging,
    options?: {
      vapidKey?: string;
      serviceWorkerRegistration?: ServiceWorkerRegistration;
    }
  ): Promise<string | null>;
  export function onMessage(
    messaging: Messaging,
    nextOrObserver: (payload: MessagePayload) => void
  ): () => void;
}
