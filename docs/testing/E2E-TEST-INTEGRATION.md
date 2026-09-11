---
status: guide
owner: devops
title: E2E Test Integration Guide
---

# E2E Test Integration Guide

Instructions for integrating the E2E test suite into development workflows and CI/CD pipelines.

## Table of Contents
1. [Local Development](#local-development)
2. [CI/CD Integration](#cicd-integration)
3. [Pre-Commit Hooks](#pre-commit-hooks)
4. [GitHub Actions](#github-actions)
5. [Troubleshooting](#troubleshooting)

## Local Development

### Setup

```bash
# Clone repository
git clone https://github.com/cloudsysops/opsly.git
cd opsly

# Install dependencies
npm install

# Verify test setup
npm run type-check
```

### Running Tests Locally

#### Run All Tests
```bash
npm run test
```

#### Run Specific Test Suite
```bash
# Orchestrator E2E tests
npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts

# Admin API E2E tests
npm run test --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts
```

#### Watch Mode (for development)
```bash
# Orchestrator tests in watch mode
npm run test:watch --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts

# Admin tests in watch mode
npm run test:watch --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts
```

#### Test Specific Phase
```bash
# Run only Phase 1: Event Triggering tests
npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts -t "Phase 1"

# Run only approval queue tests
npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts -t "Approval Queue"
```

#### With Coverage
```bash
# Full coverage report
npm run test:coverage

# Coverage for specific workspace
npm run test:coverage --workspace=@intcloudsysops/orchestrator
```

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feat/content-generation-improvements

# 2. Make changes
# ... edit files ...

# 3. Run type-check
npm run type-check

# 4. Run tests
npm run test

# 5. Run E2E tests specifically
npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts
npm run test --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts

# 6. Commit changes
git add -A
git commit -m "feat(orchestrator): add new event mapping"

# 7. Push and create PR
git push origin feat/content-generation-improvements
```

## CI/CD Integration

### Adding to Pipeline

#### package.json Scripts
Tests are already configured in the root `package.json`:

```json
{
  "scripts": {
    "test": "turbo run test",
    "test:integration": "REDIS_URL=... npm run test --workspace=@intcloudsysops/orchestrator",
    "test:coverage": "turbo run test -- --coverage"
  }
}
```

#### Environment Variables Required

For CI/CD, ensure these variables are set:

```bash
# Redis (for orchestrator tests)
REDIS_URL=redis://localhost:6379

# Supabase (optional, tests use mocks)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Admin API
NEXT_PUBLIC_ADMIN_PUBLIC_DEMO=false
```

### Example CI Configuration

#### GitHub Actions Workflow

**File:** `.github/workflows/test-e2e.yml`

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Run E2E tests
        env:
          REDIS_URL: redis://localhost:6379
        run: |
          npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts
          npm run test --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts
      
      - name: Coverage report
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: e2e-tests
```

#### Docker Compose for CI

**File:** `docker-compose.test.yml`

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: redis-cli ping
      interval: 5s
      timeout: 3s
      retries: 5

  test:
    build: .
    depends_on:
      redis:
        condition: service_healthy
    environment:
      REDIS_URL: redis://redis:6379
      NODE_ENV: test
    command: npm run test
```

Run with:
```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Pre-Commit Hooks

### Git Hook Setup

**File:** `.githooks/pre-commit`

```bash
#!/bin/bash

echo "Running pre-commit checks..."

# Type check
echo "Type checking..."
npm run type-check || exit 1

# Run E2E tests
echo "Running E2E tests..."
npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts || exit 1
npm run test --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts || exit 1

echo "Pre-commit checks passed!"
exit 0
```

Enable with:
```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

## GitHub Actions

### PR Checks

**File:** `.github/workflows/pr-checks.yml`

```yaml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Run E2E Tests
        run: npm run test
      
      - name: Check for test failures
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ E2E tests failed. Please review the test output.'
            })
```

### Auto-Merge on Passing Tests

```yaml
name: Auto-Merge

on:
  check_run:
    types: [completed]
  pull_request:
    types: [opened, synchronize]

jobs:
  automerge:
    if: github.event.pull_request.auto_merge || contains(github.event.pull_request.labels.*.name, 'auto-merge')
    runs-on: ubuntu-latest
    steps:
      - uses: pascalgn/automerge-action@v0.15.6
        with:
          args: "--squash"
```

## Continuous Integration Examples

### GitLab CI

**File:** `.gitlab-ci.yml`

```yaml
test:e2e:
  stage: test
  image: node:18-alpine
  services:
    - redis:7-alpine
  variables:
    REDIS_URL: "redis://redis:6379"
  script:
    - npm ci
    - npm run type-check
    - npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts
    - npm run test --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

### Jenkins Pipeline

**File:** `Jenkinsfile`

```groovy
pipeline {
    agent any
    
    stages {
        stage('Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Type Check') {
            steps {
                sh 'npm run type-check'
            }
        }
        
        stage('E2E Tests') {
            environment {
                REDIS_URL = 'redis://localhost:6379'
            }
            steps {
                sh 'npm run test --workspace=@intcloudsysops/orchestrator -- src/events/__tests__/e2e-flow.test.ts'
                sh 'npm run test --workspace=@intcloudsysops/admin -- app/api/admin/__tests__/e2e-approval-render-flow.test.ts'
            }
        }
        
        stage('Coverage') {
            steps {
                sh 'npm run test:coverage'
                publishHTML([
                    reportDir: 'coverage',
                    reportFiles: 'index.html',
                    reportName: 'Coverage Report'
                ])
            }
        }
    }
    
    post {
        always {
            junit 'coverage/junit.xml'
            publishCoverage(
                adapters: [
                    coberturaAdapter('coverage/cobertura-coverage.xml')
                ]
            )
        }
    }
}
```

## Monitoring & Metrics

### Test Metrics Collection

```bash
# Generate metrics
npm run test:coverage -- --coverage-providers v8

# Export metrics
npm run test -- --reporter=json > test-results.json
```

### Dashboard Integration

Create a dashboard to monitor:
- Test pass rate
- Test execution time
- Coverage trends
- Failure patterns

Example metrics to track:
```json
{
  "total_tests": 49,
  "passed": 49,
  "failed": 0,
  "skipped": 0,
  "pass_rate": 100,
  "execution_time_ms": 2500,
  "coverage": {
    "statements": 92,
    "branches": 87,
    "functions": 94,
    "lines": 92
  }
}
```

## Troubleshooting

### Common Issues

#### Issue: Tests Not Found
```bash
# Ensure test files exist
ls apps/orchestrator/src/events/__tests__/e2e-flow.test.ts
ls apps/admin/app/api/admin/__tests__/e2e-approval-render-flow.test.ts

# Run with explicit paths
npm run test -- "apps/orchestrator/src/events/__tests__/e2e-flow.test.ts"
```

#### Issue: Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Set correct URL
export REDIS_URL=redis://localhost:6379

# Or use inline
npm run test -- --env=redis://localhost:6379
```

#### Issue: Tests Timeout
```bash
# Increase timeout
npm run test -- --testTimeout=30000

# Or in vitest.config.ts
export default {
  test: {
    testTimeout: 30000
  }
}
```

#### Issue: Type Errors in Tests
```bash
# Run type-check first
npm run type-check

# Check tsconfig in workspace
cat apps/orchestrator/tsconfig.json
```

## Best Practices

### Test Maintenance

1. **Keep Tests Updated**
   - Update tests when business logic changes
   - Add tests for new features
   - Remove tests for deprecated features

2. **Monitor Test Health**
   - Track flaky tests
   - Investigate failures promptly
   - Keep pass rate above 95%

3. **Performance**
   - Keep individual tests under 100ms
   - Parallelize where possible
   - Use mocks to avoid I/O

4. **Documentation**
   - Comment complex test logic
   - Keep README updated
   - Document test patterns

### Test Organization

```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # Component interaction tests
└── e2e/           # Full workflow tests (these files)
```

## Security Considerations

### Secrets in Tests

**Never commit:**
- API keys
- Database passwords
- Auth tokens
- Private data

**Use instead:**
- Environment variables
- Mock secrets
- Test fixtures

```typescript
// ❌ DON'T DO THIS
const apiKey = 'sk-1234567890abcdef';

// ✅ DO THIS
const apiKey = process.env.TEST_API_KEY || 'mock-key';
```

### Test Data Privacy

- Use anonymized test data
- Don't use production data
- Mock PII (personally identifiable information)
- Encrypt sensitive test fixtures

## Performance Optimization

### Parallel Test Execution

```bash
# Run tests in parallel (default)
npm run test -- --threads 4

# Run sequentially (slower, for debugging)
npm run test -- --threads 1
```

### Filtering Tests

```bash
# Run specific test file
npm run test -- src/events/__tests__/e2e-flow.test.ts

# Run tests matching pattern
npm run test -- --grep "Approval Queue"

# Run tests with tag
npm run test -- --grep "@critical"
```

## Reporting

### Generate Reports

```bash
# HTML Report
npm run test:coverage

# JSON Report
npm run test -- --reporter=json > report.json

# JUnit Report (for CI)
npm run test -- --reporter=junit
```

### Share Results

```bash
# Upload to code coverage service
npx codecov -f coverage/coverage-final.json

# Generate summary
npm run test:coverage -- --report=summary
```

## Related Documentation

- [E2E Flow Testing Guide](./E2E-FLOW-TESTING.md)
- [Implementation Summary](../E2E-TEST-IMPLEMENTATION-SUMMARY.md)
- [Testing Best Practices](https://vitest.dev/)
- [Turbo CI Integration](https://turbo.build/repo/docs/ci)

---

**Last Updated:** 2026-09-11  
**Maintained By:** DevOps Team
