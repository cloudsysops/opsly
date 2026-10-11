import { localAgentQueue } from './queue.js';
import { WriteApprovalStore, type WriteApprovalStorePort } from './write-approval-store.js';

let singleton: WriteApprovalStorePort | null = null;
let building: Promise<WriteApprovalStorePort> | null = null;

export async function getWriteApprovalStore(): Promise<WriteApprovalStorePort> {
  if (singleton) return singleton;
  if (!building) {
    building = (async () => {
      const client = await localAgentQueue.client;
      singleton = new WriteApprovalStore(
        client as unknown as ConstructorParameters<typeof WriteApprovalStore>[0]
      );
      return singleton;
    })();
  }
  return building;
}

/** Test/helper override. */
export function setWriteApprovalStoreForTests(store: WriteApprovalStorePort | null): void {
  singleton = store;
  building = store ? Promise.resolve(store) : null;
}
