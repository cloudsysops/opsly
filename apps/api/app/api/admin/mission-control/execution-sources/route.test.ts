import { describe, expect, it } from 'vitest';

import { detectCanonicalDispatchAdmission } from '../../../../../lib/mission-control-execution-source-admission';

describe('Mission Control execution-source admission probe', () => {
  it('recognizes the current dispatch-claim-v1 contract', () => {
    const source = [
      "dispatch_contract_version: 'dispatch-claim-v1'",
      "'x-autonomy-approved': 'true'",
      "conflict_key: String(meta.conflict_key)",
      "workstream: String(meta.workstream)",
      "/api/local/prompt-submit",
    ].join('\n');

    expect(detectCanonicalDispatchAdmission(source)).toBe(true);
  });

  it('fails closed when any canonical admission element is missing', () => {
    expect(
      detectCanonicalDispatchAdmission(
        [
          "dispatch_contract_version: 'dispatch-claim-v1'",
          "/api/local/prompt-submit",
          "conflict_key: String(meta.conflict_key)",
          "workstream: String(meta.workstream)",
        ].join('\n'),
      ),
    ).toBe(false);
  });

  it('does not depend on removed registry-loader symbols', () => {
    const source = [
      "dispatch_contract_version: 'dispatch-claim-v1'",
      "'x-autonomy-approved': 'true'",
      "conflict_key: String(meta.conflict_key)",
      "workstream: String(meta.workstream)",
      "/api/local/prompt-submit",
    ].join('\n');

    expect(source).not.toContain('resolveGovernedAgent');
    expect(detectCanonicalDispatchAdmission(source)).toBe(true);
  });
});
