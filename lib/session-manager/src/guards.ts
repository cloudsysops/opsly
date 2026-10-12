/**
 * Branch names end up inside a tmux shell command during resume, so only a conservative
 * git-ref subset is accepted. Anything else (quotes, `$`, backticks, spaces, leading `-`)
 * is rejected instead of escaped.
 */
const SAFE_BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export function isSafeBranchName(branch: string): boolean {
  return (
    branch.length > 0 &&
    branch.length <= 200 &&
    SAFE_BRANCH.test(branch) &&
    !branch.includes('..') &&
    !branch.includes('//') &&
    !branch.endsWith('/') &&
    !branch.endsWith('.') &&
    !branch.endsWith('.lock')
  );
}

export function assertSafeBranchName(branch: string): void {
  if (!isSafeBranchName(branch)) {
    throw new Error(`Unsafe branch name rejected: ${JSON.stringify(branch.slice(0, 80))}`);
  }
}
