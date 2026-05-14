#!/bin/bash
# Automated installer for test coverage GitHub Actions workflow
# Usage: bash scripts/install-coverage-workflow.sh

set -e

WORKFLOW_DIR=".github/workflows"
WORKFLOW_FILE="$WORKFLOW_DIR/test-coverage.yml"

echo "📋 Installing test coverage workflow..."
echo ""

# Create workflows directory if it doesn't exist
if [ ! -d "$WORKFLOW_DIR" ]; then
  echo "Creating $WORKFLOW_DIR directory..."
  mkdir -p "$WORKFLOW_DIR"
fi

# Check if workflow file already exists
if [ -f "$WORKFLOW_FILE" ]; then
  echo "⚠️  Workflow file already exists at $WORKFLOW_FILE"
  read -p "Do you want to overwrite it? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi
fi

# Create the workflow file with proper GitHub Actions configuration
cat > "$WORKFLOW_FILE" << 'EOF'
name: Test Coverage Analysis

on:
  push:
    branches: [main]
    paths:
      - 'apps/**'
      - 'lib/**'
      - 'packages/**'
      - '.github/workflows/test-coverage.yml'
      - 'scripts/analyze-test-coverage.py'
  pull_request:
    branches: [main]
    paths:
      - 'apps/**'
      - 'lib/**'
      - 'packages/**'
      - '.github/workflows/test-coverage.yml'
      - 'scripts/analyze-test-coverage.py'
  schedule:
    - cron: '0 8 * * 1'
  workflow_dispatch:
    inputs:
      fail_on_gap:
        description: 'Fail if more than 15 untested modules'
        required: false
        default: 'false'

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  analyze-coverage:
    runs-on: ubuntu-latest
    env:
      PYTHON_VERSION: '3.11'
      REPORT_DIR: '.coverage-reports'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Run coverage analysis
        run: |
          mkdir -p ${{ env.REPORT_DIR }}
          python3 scripts/analyze-test-coverage.py --format text
          python3 scripts/analyze-test-coverage.py --format json --output ${{ env.REPORT_DIR }}/coverage-report.json
          python3 scripts/analyze-test-coverage.py --format markdown --output COVERAGE.md

      - name: Validate coverage thresholds
        id: validate
        run: |
          python3 << 'PYTHON_EOF'
          import json
          import os
          import sys

          with open('${{ env.REPORT_DIR }}/coverage-report.json') as f:
            data = json.load(f)
          summary = data['summary']
          untested = summary['coverage_distribution']['none']

          github_output = os.getenv('GITHUB_OUTPUT')
          with open(github_output, 'a') as f:
            f.write(f"UNTESTED_MODULES={untested}\n")

          fail_on_gap = "${{ github.event.inputs.fail_on_gap }}" == "true"
          if fail_on_gap and untested > 15:
            with open(github_output, 'a') as f:
              f.write("VALIDATION_FAILED=true\n")
            sys.exit(1)

          with open(github_output, 'a') as f:
            f.write("VALIDATION_FAILED=false\n")
          PYTHON_EOF

      - name: Comment PR with coverage summary
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const md = fs.readFileSync('COVERAGE.md', 'utf-8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📊 Test Coverage Report\n\n${md}`
            });

      - name: Create status check
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const status = '${{ steps.validate.outcome }}' === 'success' ? 'success' : 'failure';
            const description = status === 'success'
              ? 'Coverage analysis passed'
              : 'Coverage analysis found issues';

            github.rest.checks.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              name: 'Test Coverage',
              head_sha: context.sha,
              status: 'completed',
              conclusion: status,
              output: {
                title: 'Test Coverage Analysis',
                summary: description,
                text: 'See artifacts for detailed reports'
              }
            });

      - name: Upload coverage reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-reports
          path: ${{ env.REPORT_DIR }}/
          retention-days: 30
EOF

echo "✅ Workflow installed at $WORKFLOW_FILE"
echo ""
echo "📝 Next steps:"
echo "  1. git add .github/workflows/test-coverage.yml"
echo "  2. git commit -m 'ci: add test coverage analysis workflow'"
echo "  3. git push origin main"
echo ""
echo "ℹ️  The workflow will run automatically on:"
echo "  • Push to main (when code changes are detected)"
echo "  • Pull requests to main"
echo "  • Weekly schedule (Monday 08:00 UTC)"
echo "  • Manual trigger via workflow_dispatch"
