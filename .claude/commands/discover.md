# Discover Project Issues

Analyze the project codebase and discover potential issues to create.

## Usage

`/discover [area]`

- No argument: Full project analysis
- With area: Focus on specific area (e.g., `web`, `cli`, `core`, `tests`, `docs`)

## Analysis Categories

### 1. Code Quality
- TODO/FIXME comments in code
- Missing error handling
- Code duplication
- Complex functions (high cyclomatic complexity)
- Missing type annotations

### 2. Testing
- Untested files/functions
- Low test coverage areas
- Missing edge case tests
- Integration test gaps

### 3. Documentation
- Missing README sections
- Outdated documentation
- Missing JSDoc/TSDoc comments
- Missing API documentation

### 4. Architecture
- Circular dependencies
- Violated separation of concerns
- Missing abstractions
- Hardcoded values that should be config

### 5. Performance
- N+1 query patterns
- Missing caching opportunities
- Unoptimized re-renders (React)
- Large bundle sizes

### 6. Security
- Exposed secrets patterns
- Missing input validation
- Unsafe operations

### 7. DX (Developer Experience)
- Missing scripts
- Incomplete CI/CD
- Missing linting rules

## Analysis Steps

1. **Scan Codebase**
   ```bash
   # Find TODOs
   grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx"

   # Check test coverage
   pnpm test:coverage

   # Find large files
   find . -name "*.ts" -exec wc -l {} + | sort -rn | head -20
   ```

2. **Review Structure**
   - Check package dependencies
   - Review exported APIs
   - Identify missing features

3. **Generate Issue List**
   - Group by category and priority
   - Estimate complexity (S/M/L)
   - Identify dependencies between issues

## Output Format

```markdown
## Discovered Issues

### High Priority
1. **[bug] Error handling missing in session deletion**
   - Location: `packages/web/src/app/api/sessions/[id]/route.ts`
   - Impact: Silent failures on delete
   - Complexity: S

2. **[enhancement] Add loading states to dashboard**
   - Location: `packages/web/src/app/sessions/page.tsx`
   - Impact: Poor UX during data fetch
   - Complexity: M

### Medium Priority
3. **[test] Missing tests for GitWorktreeService**
   - Location: `packages/core/src/services/`
   - Coverage: 0%
   - Complexity: M

### Low Priority
4. **[docs] Add API documentation**
   - Missing: REST API docs
   - Complexity: S

---

**Create issues?**
- `all` - Create all issues
- `1,2,3` - Create specific issues by number
- `high` - Create only high priority
- `none` - Cancel
```

## Issue Creation

When user confirms, create issues with:

```bash
gh issue create \
  --title "<type>(<scope>): <title>" \
  --label "<priority>" \
  --label "<type-label>" \
  --label "scope: <package>" \
  --body "<generated-body>"
```

## Example Session

```
User: /discover web

Claude: Analyzing packages/web...

## Discovered Issues

### High Priority
1. **[bug] Session delete API lacks error handling**
   - Location: `packages/web/src/app/api/sessions/[id]/route.ts`
   - Impact: 500 errors not properly caught
   - Complexity: S

2. **[enhancement] Add optimistic updates to session list**
   - Location: `packages/web/src/app/sessions/page.tsx`
   - Impact: Slow perceived performance
   - Complexity: M

### Medium Priority
3. **[test] Add E2E tests for dashboard**
   - Missing: Playwright tests
   - Complexity: L

---
Create issues? (all / 1,2 / high / none)

User: 1,2

Claude: Creating issues...
- Issue #15 created: bug(web): session delete API lacks error handling
- Issue #16 created: feat(web): add optimistic updates to session list

Start working:
/feature 15
```

## Tips

- Run `/discover` periodically to catch new issues
- Use area filter for focused analysis
- Review before creating to avoid duplicates
- Link related issues in the body