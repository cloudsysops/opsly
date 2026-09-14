#!/usr/bin/env node
'use strict';

const CLEAN_REVIEW_PHRASES = [
  "Codex Review: Didn't find any major issues.",
  'did not find any major issues',
  "didn't find any major issues",
];

const DEFAULT_REVIEW_BOTS = [
  'chatgpt-codex-connector[bot]',
  'github-copilot[bot]',
  'copilot-pull-request-reviewer[bot]',
];

function normalizeSha(value) {
  return String(value || '').trim().toLowerCase();
}

export function commitMatches(headSha, reviewedSha) {
  const head = normalizeSha(headSha);
  const reviewed = normalizeSha(reviewedSha);
  if (!head || !reviewed) return false;
  return head === reviewed || head.startsWith(reviewed) || reviewed.startsWith(head);
}

export function extractReviewedCommit(body) {
  const text = String(body || '');
  const match =
    text.match(/Reviewed commit:\*\*?\s*`([0-9a-f]{7,40})`/i) ||
    text.match(/Reviewed commit:\s*`([0-9a-f]{7,40})`/i) ||
    text.match(/Reviewed commit:\s*([0-9a-f]{7,40})/i);
  return match?.[1] ?? null;
}

function isCleanBotReviewBody(body) {
  const lower = String(body || '').toLowerCase();
  return CLEAN_REVIEW_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}

const TRUSTED_HUMAN_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);

function isTrustedReviewer(entry, author, allowedBots) {
  const login = entry?.user?.login;
  if (!login || login === author) return false;
  if (allowedBots.includes(login)) return true;
  return TRUSTED_HUMAN_ASSOCIATIONS.has(
    String(entry?.author_association || '').toUpperCase()
  );
}

function latestHeadReviews(reviews, headSha) {
  const latest = new Map();
  for (const review of reviews) {
    if (!commitMatches(headSha, review?.commit_id)) continue;
    const login = review?.user?.login;
    if (!login) continue;
    const previous = latest.get(login);
    const currentOrder = Date.parse(review?.submitted_at || '') || Number(review?.id || 0);
    const previousOrder =
      Date.parse(previous?.submitted_at || '') || Number(previous?.id || 0);
    if (!previous || currentOrder >= previousOrder) latest.set(login, review);
  }
  return [...latest.values()];
}

export function evaluateIndependentReview({
  reviews = [],
  reviewComments = [],
  issueComments = [],
  headSha,
  author,
  allowedBots = DEFAULT_REVIEW_BOTS,
}) {
  const currentHeadFinding = reviewComments.find((comment) => {
    if (!commitMatches(headSha, comment?.commit_id)) return false;
    if (!isTrustedReviewer(comment, author, allowedBots)) return false;
    return /(?:P0|P1|P2)(?:\s+Badge|\b)/i.test(String(comment?.body || ''));
  });
  if (currentHeadFinding) {
    return {
      ok: false,
      reason: `current_head_finding:${currentHeadFinding.user?.login || 'reviewer'}`,
    };
  }

  const headReviews = latestHeadReviews(reviews, headSha);
  const blockingReviewBody = headReviews.find(
    (review) =>
      isTrustedReviewer(review, author, allowedBots) &&
      /(?:P0|P1|P2)(?:\s+Badge|\b)/i.test(String(review?.body || ''))
  );
  if (blockingReviewBody) {
    return {
      ok: false,
      reason: `current_head_review_finding:${blockingReviewBody.user.login}`,
    };
  }

  const blockingReview = headReviews.find(
    (review) =>
      isTrustedReviewer(review, author, allowedBots) &&
      String(review?.state || '').toUpperCase() === 'CHANGES_REQUESTED'
  );
  if (blockingReview) {
    return {
      ok: false,
      reason: `changes_requested_by:${blockingReview.user.login}`,
    };
  }

  const approvedHuman = headReviews.find(
    (review) =>
      review?.user?.login &&
      !allowedBots.includes(review.user.login) &&
      isTrustedReviewer(review, author, allowedBots) &&
      String(review?.state || '').toUpperCase() === 'APPROVED'
  );
  if (approvedHuman) {
    return {
      ok: true,
      reason: `approved_review:${approvedHuman.user.login}`,
    };
  }

  const cleanBotReview = headReviews.find(
    (review) =>
      allowedBots.includes(review?.user?.login) &&
      isTrustedReviewer(review, author, allowedBots) &&
      isCleanBotReviewBody(review?.body)
  );
  if (cleanBotReview) {
    return {
      ok: true,
      reason: `clean_bot_review:${cleanBotReview.user.login}`,
    };
  }

  for (const comment of issueComments) {
    const login = comment?.user?.login;
    if (!allowedBots.includes(login)) continue;
    if (!isTrustedReviewer(comment, author, allowedBots)) continue;
    if (!isCleanBotReviewBody(comment?.body)) continue;
    const reviewedCommit = extractReviewedCommit(comment.body);
    if (commitMatches(headSha, reviewedCommit)) {
      return {
        ok: true,
        reason: `clean_bot_comment:${login}`,
      };
    }
  }

  return {
    ok: false,
    reason: 'no_independent_review_for_final_head',
  };
}

async function fetchAll(repo, endpoint, token) {
  const results = [];
  const maxPages = 100;
  for (let page = 1; page <= maxPages; page += 1) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `https://api.github.com/repos/${repo}/${endpoint}${separator}per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub API ${response.status}: ${detail.slice(0, 500)}`);
    }
    const pageItems = await response.json();
    if (!Array.isArray(pageItems)) {
      throw new Error(`Expected array from GitHub endpoint ${endpoint}`);
    }
    results.push(...pageItems);
    if (pageItems.length < 100) return results;
    if (page === maxPages) {
      throw new Error(
        `GitHub pagination exceeded safe cap for ${endpoint}; refusing incomplete review evidence`
      );
    }
  }
  return results;
}

function parseArgs(argv) {
  const out = { repo: '', pr: '', head: '', author: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo') out.repo = argv[++i] || '';
    else if (arg === '--pr') out.pr = argv[++i] || '';
    else if (arg === '--head') out.head = argv[++i] || '';
    else if (arg === '--author') out.author = argv[++i] || '';
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.GITHUB_TOKEN || '';
  if (!args.repo || !args.pr || !args.head || !args.author) {
    throw new Error('Usage: check-independent-review.mjs --repo owner/repo --pr N --head SHA --author LOGIN');
  }
  if (!token) throw new Error('GITHUB_TOKEN is required');

  const allowedBots = (process.env.INDEPENDENT_REVIEW_BOTS || DEFAULT_REVIEW_BOTS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const [reviews, reviewComments, issueComments] = await Promise.all([
    fetchAll(args.repo, `pulls/${args.pr}/reviews`, token),
    fetchAll(args.repo, `pulls/${args.pr}/comments`, token),
    fetchAll(args.repo, `issues/${args.pr}/comments`, token),
  ]);

  const decision = evaluateIndependentReview({
    reviews,
    reviewComments,
    issueComments,
    headSha: args.head,
    author: args.author,
    allowedBots,
  });

  console.log(
    JSON.stringify(
      {
        pr: Number(args.pr),
        head_sha: args.head,
        author: args.author,
        independent_review: decision,
      },
      null,
      2
    )
  );

  if (!decision.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`independent-review-gate: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
