# Test Coverage Analysis Workflow Setup

This document describes the GitHub Actions workflow for automated test coverage analysis.

## Overview

The workflow automatically:
1. ✅ Analyzes test coverage across all modules on PR/push/schedule
2. 📊 Generates reports in multiple formats (text, JSON, Markdown)
3. 💬 Comments PRs with coverage summary
4. 🚨 Validates coverage thresholds
5. 📋 Creates status checks

## Installation

### Option 1: Automated Setup

```bash
# Copy workflow to GitHub Actions
bash scripts/install-coverage-workflow.sh
```

### Option 2: Manual Setup

1. Create the workflow file:
   ```bash
   mkdir -p .github/workflows
   cp docs/workflows/test-coverage.yml .github/workflows/test-coverage.yml
   ```

2. Commit and push:
   ```bash
   git add .github/workflows/test-coverage.yml
   git commit -m "ci: add test coverage analysis workflow"
   git push origin main
   ```

## Workflow Configuration

### Trigger Conditions

| Trigger | Condition | Frequency |
|---------|-----------|-----------|
| **Pull Request** | On PR to `main` with code changes | Per PR |
| **Push** | On push to `main` | Per push |
| **Schedule** | Weekly Monday 08:00 UTC | 1x/week |
| **Manual** | Via `workflow_dispatch` | On demand |

### Path Filters (PR/Push only)

Workflow only runs when changes detected in:
- `apps/**` (all applications)
- `lib/**` (shared libraries)
- `packages/**` (published packages)
- `.github/workflows/test-coverage.yml` (workflow itself)
- `scripts/analyze-test-coverage.py` (analysis script)

## Validation Rules

### ✅ Pass Conditions
- Coverage analysis completes successfully
- Python script parses all modules
- Reports generated in all formats

### ⚠️ Warning Triggers
- More than **5 untested modules** → Printed in logs
- Any module with **0% coverage** → Listed in report

### ❌ Fail Conditions
- More than **15 untested modules** (only with `fail_on_gap=true`)
- Analysis script errors
- Report generation failures

## Environment Variables

```yaml
PYTHON_VERSION: '3.11'          # Python version for analysis
REPORT_DIR: '.coverage-reports' # Where reports are saved
```

## Outputs & Artifacts

### Generated Reports

1. **coverage-report.txt** - Human-readable text report
2. **coverage-report.json** - Structured JSON data
3. **COVERAGE.md** - Markdown table format

### PR Comments

Automatically posted comment includes:
- Distribution count (critical/high/low/none)
- Total statistics (modules/tests/sources)
- Links to detailed report
- Next step recommendations

### Artifacts

- Retained for **30 days**
- Downloadable from Actions tab
- Useful for historical tracking

## Manual Trigger

Run coverage analysis on-demand with options:

```bash
gh workflow run test-coverage.yml -f fail_on_gap=true
```

### Manual Trigger Parameters

| Parameter | Values | Default | Effect |
|-----------|--------|---------|--------|
| `fail_on_gap` | `true`/`false` | `false` | Fail if >15 untested modules |

## Integration with Development

### Local Usage

```bash
# Generate report before committing
python3 scripts/analyze-test-coverage.py

# Export JSON for tracking
python3 scripts/analyze-test-coverage.py --format json \
  --output .coverage-reports/report.json

# Export Markdown for docs
python3 scripts/analyze-test-coverage.py --format markdown \
  --output COVERAGE.md
```

### CI/CD Pipeline

```
PR created → Coverage workflow triggers
    ↓
Analysis runs (Python script)
    ↓
Validates thresholds
    ↓
Comments PR with results
    ↓
Status check created
```

## Troubleshooting

### Workflow not running

**Check:**
1. Workflow file is in `.github/workflows/test-coverage.yml`
2. Branch is `main` or matches trigger conditions
3. File changes match path filters

**Solution:**
```bash
# Verify workflow syntax
python3 -m json.tool .github/workflows/test-coverage.yml
```

### PR comment not appearing

**Check:**
1. Workflow has `pull-requests: write` permission
2. Report generation succeeded (check artifacts)
3. Bot not rate-limited

**Solution:**
```bash
# Check workflow run logs
gh run list --status failure --workflow test-coverage.yml
```

### Analysis errors

**Check:**
1. Python 3.11+ installed
2. `scripts/analyze-test-coverage.py` is executable
3. All test file patterns match your project

**Run locally:**
```bash
python3 scripts/analyze-test-coverage.py
```

## Performance

- Analysis runtime: ~5-10 seconds
- Report generation: ~2 seconds
- Total workflow: ~1-2 minutes

## Security & Permissions

### Minimal Permissions Required

```yaml
permissions:
  contents: read          # Read source code
  pull-requests: write    # Comment on PRs
  checks: write           # Create status checks
```

**Does NOT have:**
- ❌ Write access to code
- ❌ Delete permissions
- ❌ Admin permissions

## Related Documents

- [Test Coverage Analysis](https://github.com/cloudsysops/opsly/pull/234) - Detailed findings and recommendations (PR #234)
- [Test Coverage Script](scripts/analyze-test-coverage.py) - Python implementation
- [CI/CD Workflow Index](../ops/workflows-index.md) - All available workflows
