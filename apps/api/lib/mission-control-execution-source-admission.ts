export function detectCanonicalDispatchAdmission(queueSubmitter: string): boolean {
  return (
    queueSubmitter.includes("dispatch_contract_version: 'dispatch-claim-v1'") &&
    queueSubmitter.includes('/api/local/prompt-submit') &&
    queueSubmitter.includes("'x-autonomy-approved': 'true'") &&
    queueSubmitter.includes('conflict_key: String(meta.conflict_key)') &&
    queueSubmitter.includes('workstream: String(meta.workstream)')
  );
}
