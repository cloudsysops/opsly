import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commitMatches,
  evaluateIndependentReview,
  extractReviewedCommit,
} from '../check-independent-review.mjs';

const head = '9491d6028d1234567890abcdefabcdefabcdef12';

test('commitMatches accepts exact and reviewed prefixes only', () => {
  assert.equal(commitMatches(head, head), true);
  assert.equal(commitMatches(head, '9491d6028d'), true);
  assert.equal(commitMatches(head, 'deadbeef'), false);
});

test('extractReviewedCommit reads Codex review comments', () => {
  assert.equal(
    extractReviewedCommit(
      "Codex Review: Didn't find any major issues.\n\n**Reviewed commit:** `9491d6028d`"
    ),
    '9491d6028d'
  );
});

test('accepts a human approval only when it targets the final head', () => {
  assert.deepEqual(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [
        {
          id: 1,
          state: 'APPROVED',
          commit_id: head,
          submitted_at: '2026-09-13T12:00:00Z',
          user: { login: 'reviewer' },
          author_association: 'COLLABORATOR',
        },
      ],
      issueComments: [],
    }),
    { ok: true, reason: 'approved_review:reviewer' }
  );

  assert.equal(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [
        {
          id: 1,
          state: 'APPROVED',
          commit_id: '1111111111111111111111111111111111111111',
          submitted_at: '2026-09-13T12:00:00Z',
          user: { login: 'reviewer' },
          author_association: 'COLLABORATOR',
        },
      ],
      issueComments: [],
    }).ok,
    false
  );
});

test('does not accept approval from an untrusted public user', () => {
  assert.equal(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [
        {
          id: 1,
          state: 'APPROVED',
          commit_id: head,
          submitted_at: '2026-09-13T12:00:00Z',
          user: { login: 'random-public-user' },
          author_association: 'NONE',
        },
      ],
      issueComments: [],
    }).ok,
    false
  );
});

test('ignores untrusted P1/P2 review comments as a public-repo DoS vector', () => {
  assert.equal(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [],
      reviewComments: [
        {
          commit_id: head,
          user: { login: 'random-public-user' },
          author_association: 'NONE',
          body: '**P1 Badge** fake blocker',
        },
      ],
      issueComments: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          body:
            "Codex Review: Didn't find any major issues.\n\n**Reviewed commit:** `9491d6028d`",
        },
      ],
    }).ok,
    true
  );
});

test('never counts the PR author as independent reviewer', () => {
  assert.equal(
    evaluateIndependentReview({
      headSha: head,
      author: 'same-user',
      reviews: [
        {
          id: 1,
          state: 'APPROVED',
          commit_id: head,
          submitted_at: '2026-09-13T12:00:00Z',
          user: { login: 'same-user' },
          author_association: 'OWNER',
        },
      ],
      issueComments: [],
    }).ok,
    false
  );
});

test('accepts a clean Codex final-head comment', () => {
  assert.deepEqual(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [],
      issueComments: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          body:
            "Codex Review: Didn't find any major issues.\n\n**Reviewed commit:** `9491d6028d`",
        },
      ],
    }),
    {
      ok: true,
      reason: 'clean_bot_comment:chatgpt-codex-connector[bot]',
    }
  );
});

test('rejects stale Codex clean comments and usage-limit chatter', () => {
  assert.equal(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [],
      issueComments: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          body:
            "Codex Review: Didn't find any major issues.\n\n**Reviewed commit:** `1234567890`",
        },
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          body: 'You have reached your Codex usage limits for code reviews.',
        },
      ],
    }).ok,
    false
  );
});

test('current-head P1/P2 inline findings block even when a clean bot comment exists', () => {
  assert.deepEqual(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [],
      reviewComments: [
        {
          commit_id: head,
          user: { login: 'chatgpt-codex-connector[bot]' },
          body: '**P1 Badge** duplicate commission risk',
        },
      ],
      issueComments: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          body:
            "Codex Review: Didn't find any major issues.\n\n**Reviewed commit:** `9491d6028d`",
        },
      ],
    }),
    {
      ok: false,
      reason: 'current_head_finding:chatgpt-codex-connector[bot]',
    }
  );
});

test('latest changes-requested review on the head blocks the gate', () => {
  assert.deepEqual(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [
        {
          id: 1,
          state: 'APPROVED',
          commit_id: head,
          submitted_at: '2026-09-13T12:00:00Z',
          user: { login: 'reviewer' },
          author_association: 'COLLABORATOR',
        },
        {
          id: 2,
          state: 'CHANGES_REQUESTED',
          commit_id: head,
          submitted_at: '2026-09-13T12:01:00Z',
          user: { login: 'reviewer' },
          author_association: 'COLLABORATOR',
        },
      ],
      issueComments: [],
    }),
    {
      ok: false,
      reason: 'changes_requested_by:reviewer',
    }
  );
});


test('current-head P0 findings block the gate', () => {
  const decision = evaluateIndependentReview({
    headSha: head,
    author: 'author',
    reviews: [],
    reviewComments: [
      {
        commit_id: head,
        user: { login: 'chatgpt-codex-connector[bot]' },
        body: '**P0 Badge** critical release blocker',
      },
    ],
    issueComments: [
      {
        user: { login: 'chatgpt-codex-connector[bot]' },
        body:
          "Codex Review: Didn't find any major issues.\\n\\n**Reviewed commit:** `9491d6028d`",
      },
    ],
  });
  assert.equal(decision.ok, false);
});

test('trusted current-head review body findings block an earlier approval', () => {
  assert.deepEqual(
    evaluateIndependentReview({
      headSha: head,
      author: 'author',
      reviews: [
        {
          id: 1,
          state: 'APPROVED',
          commit_id: head,
          submitted_at: '2026-09-13T12:00:00Z',
          user: { login: 'reviewer-a' },
          author_association: 'COLLABORATOR',
        },
        {
          id: 2,
          state: 'COMMENTED',
          commit_id: head,
          submitted_at: '2026-09-13T12:01:00Z',
          user: { login: 'reviewer-b' },
          author_association: 'COLLABORATOR',
          body: '**P1 Badge** current-head blocker',
        },
      ],
      issueComments: [],
    }),
    { ok: false, reason: 'current_head_review_finding:reviewer-b' }
  );
});

test('allowlisted bot cannot independently approve its own PR', () => {
  const bot = 'chatgpt-codex-connector[bot]';
  const decision = evaluateIndependentReview({
    headSha: head,
    author: bot,
    reviews: [
      {
        id: 1,
        state: 'COMMENTED',
        commit_id: head,
        submitted_at: '2026-09-13T12:00:00Z',
        user: { login: bot },
        body: "Codex Review: Didn't find any major issues.",
      },
    ],
    issueComments: [
      {
        user: { login: bot },
        body:
          "Codex Review: Didn't find any major issues.\\n\\n**Reviewed commit:** `9491d6028d`",
      },
    ],
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, 'no_independent_review_for_final_head');
});
