# Software Factory post-merge cleanup

The factory does **not** introduce another branch deletion mechanism.

Existing canonical executors remain:

- `scripts/git-branch-cleanup.sh`
- Night Cleanup workflow

This layer only joins merge evidence with cleanup evidence so Mission Control can see:

1. merged branches that the canonical cleaner may remove;
2. merged work items whose dispatch claims remain active;
3. cleanup blockers.

V1 is plan-only for claim release until the canonical DispatchClaim completion API is available. This prevents direct Redis mutation from becoming a second ownership path.
