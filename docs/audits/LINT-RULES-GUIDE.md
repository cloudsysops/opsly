---
status: audit-complete
date: 2026-05-08T13:25:00Z
version: "ESLint 8 + 9 (flat config)"
---

# ESLint Rules Audit & Standardization Guide

**Scope:** `.eslintrc.json` (v8) + `eslint.config.mjs` (v9 flat config)  
**Status:** Mixed version support (legacy + modern)  
**Action:** Standardize rules across both versions  

---

## Current Configuration

### ESLint v8 (Legacy)
- **File:** `.eslintrc.json`
- **Status:** ✅ Exists
- **Scope:** Some workspaces may still use this

### ESLint v9 (Flat Config)
- **File:** `eslint.config.mjs`
- **Status:** ✅ Exists (modern approach)
- **Scope:** Should be primary going forward

---

## Recommended Rules (Priority Order)

### 🔴 CRITICAL (should enforce)

#### 1. `no-console` (prevent debug logs in production)
```json
{
  "no-console": ["error", {
    "allow": ["warn", "error", "info"]
  }]
}
```

**Rationale:** console.log creates noise in production logs  
**Impact:** Cleaner logs, easier debugging

---

#### 2. `explicit-return-types` (@typescript-eslint)
```json
{
  "@typescript-eslint/explicit-function-return-types": ["error", {
    "allowExpressions": true,
    "allowTypedFunctionExpressions": true
  }]
}
```

**Rationale:** Type safety, IDE autocomplete  
**Impact:** Fewer bugs, better refactoring

---

#### 3. `@typescript-eslint/no-explicit-any`
```json
{
  "@typescript-eslint/no-explicit-any": "error"
}
```

**Rationale:** Forces proper typing instead of escape hatch  
**Impact:** Type safety, maintainability

---

### 🟡 IMPORTANT (should enable)

#### 4. `prefer-const`
```json
{
  "prefer-const": "error"
}
```

**Rationale:** Variables that don't change should be const  
**Impact:** Clearer intent, fewer accidental mutations

---

#### 5. `no-floating-promises`
```json
{
  "@typescript-eslint/no-floating-promises": "error"
}
```

**Rationale:** Async operations must be awaited  
**Example:**
```typescript
// ❌ BAD
someAsyncFunction(); // Promise ignored!

// ✅ GOOD
await someAsyncFunction();
// or
void someAsyncFunction(); // Explicitly ignored
```

---

#### 6. `eqeqeq` (enforce ===)
```json
{
  "eqeqeq": ["error", "always"]
}
```

**Rationale:** Prevents type coercion bugs  
**Example:**
```typescript
// ❌ BAD
if (value == "true") // Could match 1, true, "1", etc

// ✅ GOOD
if (value === "true") // Exact match
```

---

### 🟢 NICE-TO-HAVE (recommended)

#### 7. `no-unused-vars`
```json
{
  "@typescript-eslint/no-unused-vars": ["warn", {
    "argsIgnorePattern": "^_"
  }]
}
```

**Rationale:** Keeps code clean, removes dead code  
**Convention:** Prefix with `_` to explicitly ignore

---

#### 8. `prefer-template` (use backticks)
```json
{
  "prefer-template": "warn"
}
```

---

#### 9. `no-var` (use let/const)
```json
{
  "no-var": "error"
}
```

---

## Recommended Rules for API Routes

Since we found validation gaps in Code Review, add:

#### `require-input-validation` (custom or pattern)
```typescript
// ❌ Pattern to flag in linting
export async function POST(req: Request) {
  const body = await req.json(); // Should have validation next line
  // Should be: const body = schema.parse(await req.json())
}
```

**Solution:** Create custom rule or add comment pattern:
```typescript
export async function POST(req: Request) {
  const body = await req.json();
  // LINT: bodySchema.parse() or similar validation required
  const validated = bodySchema.parse(body);
}
```

---

## Migration Plan: v8 → v9 Flat Config

### Current State (Hybrid)
- `.eslintrc.json` (v8)
- `eslint.config.mjs` (v9 flat)
- Rules may differ between files

### Goal State (Pure v9)
- Single `eslint.config.mjs`
- Consistent rules everywhere
- Easier maintenance

### Timeline
1. **Week 1:** Audit current rules in both files
2. **Week 2:** Create unified `eslint.config.mjs`
3. **Week 3:** Remove `.eslintrc.json`
4. **Week 4:** Verify no regressions

---

## Configuration Snippets

### ESLint v9 Flat Config (eslint.config.mjs)

```javascript
import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["node_modules", ".next", "dist"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      // Critical
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/explicit-function-return-types": "error",
      "@typescript-eslint/no-explicit-any": "error",
      
      // Important
      "prefer-const": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "eqeqeq": ["error", "always"],
      
      // Nice-to-have
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-template": "warn",
      "no-var": "error",
    },
  },
];
```

---

## ESLint v8 Config (.eslintrc.json)

**Recommend deprecating**, but for reference:

```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "@typescript-eslint/explicit-function-return-types": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "prefer-const": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "eqeqeq": ["error", "always"],
    "@typescript-eslint/no-unused-vars": "warn",
    "prefer-template": "warn",
    "no-var": "error"
  }
}
```

---

## How to Apply

### Option A: Quick Fix (2 hours)
1. Update `eslint.config.mjs` with recommended rules
2. Run `npm run lint:check`
3. Fix 20-50 issues that appear
4. Commit

### Option B: Comprehensive (4 hours)
1. Audit both config files completely
2. Create unified flat config
3. Run across all workspaces
4. Fix all issues
5. Deprecate `.eslintrc.json`

### Run Command
```bash
# Check what will fail
npm run lint:check

# Auto-fix what's fixable
npm run lint:fix

# Check specific workspace
npm run lint:check --workspace=@intcloudsysops/api
```

---

## Common Issues After Enabling Rules

### Issue: `no-console` fires on intentional logs
**Solution:** Mark as allowed
```typescript
console.warn("Important warning"); // ✅ OK
console.error("Error occurred"); // ✅ OK
console.log("Debug"); // ❌ Fails
```

### Issue: `explicit-return-types` fails on implicit
**Solution:** Add return types
```typescript
// ❌ BEFORE
const getUserName = (id) => {
  return db.users.find(id);
};

// ✅ AFTER
const getUserName = (id: string): Promise<User | null> => {
  return db.users.find(id);
};
```

### Issue: `no-floating-promises` too strict
**Solution:** Use `void` operator for intentionally unhandled
```typescript
// ✅ OK: explicitly ignored
void sendEmailInBackground(user.email);
```

---

## Next Steps

1. **Generate GitHub PR:** "ESLint: Enable recommended rules"
2. **Run lint check:** Identify all failures
3. **Auto-fix easy ones:** `npm run lint:fix`
4. **Address remaining:** Prioritize by severity
5. **Verify:** No regressions in tests

---

## Files to Update

1. `.eslintrc.json` — Add new rules
2. `eslint.config.mjs` — Ensure parity
3. `package.json` — Verify `lint:check` script exists ✅ (already done)

---

**Status:** ✅ Audit complete. Rules identified. Ready for implementation.  
**Owner:** @eng (code quality)  
**Priority:** MEDIUM (nice to have, but improves maintainability)  
**Effort:** 2-4 hours (enable rules + fix violations)  
**Impact:** Fewer bugs, consistent code style, easier refactoring

---

## Enlaces relacionados

- [[audits/README|audits]]
- [[brain/README|Brain Central]]
