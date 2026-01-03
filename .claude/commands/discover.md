# Discover Project Issues

Analyze the project codebase, discover potential issues, and automatically create them on GitHub.

## Usage

`/discover [area]`

- No argument: Full project analysis + auto-create issues
- With area: Focus on specific area (e.g., `web`, `cli`, `core`, `tests`, `docs`)

## Behavior

1. **Analyze** - Scan codebase for issues
2. **Report** - Show discovered issues grouped by priority
3. **Create** - Automatically create all issues on GitHub (no confirmation needed)

## Analysis Categories

### 1. Code Quality
- TODO/FIXME comments in code
- Missing error handling (empty catch blocks)
- Code duplication
- Complex functions (>100 lines)

### 2. Testing
- Untested files/functions (0% coverage)
- Missing edge case tests
- Integration test gaps

### 3. Architecture
- Circular dependencies
- Single Responsibility violations
- Missing abstractions

### 4. DX (Developer Experience)
- Missing CI/CD
- Missing linting rules

## Analysis Steps

1. **Scan Codebase**
   - Find TODOs: `grep -rn "TODO|FIXME|HACK|XXX"`
   - Run tests: `pnpm test:run`
   - Find large files: `wc -l` on source files
   - Check empty catch blocks
   - Review test coverage

2. **Generate Issue List**
   - Group by priority (High/Medium/Low)
   - Estimate complexity (S/M/L)
   - Identify affected packages

3. **Create Issues** (automatic)
   - Create all discovered issues on GitHub
   - Apply appropriate labels

## Issue Creation Format

```bash
gh issue create \
  --title "<type>(<scope>): <title>" \
  --body "$(cat <<'EOF'
## Description
<description>

## Location
- `<file_path>`

## Impact
<impact>

## Complexity
<S/M/L>

---
🤖 Auto-discovered by `/discover`
EOF
)"
```

## Label Mapping

| Type | Label |
|------|-------|
| bug | `bug` |
| test | `test` |
| enhancement | `enhancement` |
| refactor | `refactor` |
| docs | `documentation` |
| chore | `chore` |

| Priority | Label |
|----------|-------|
| High | `priority: high` |
| Medium | `priority: medium` |
| Low | `priority: low` |

## Example Output

```
Analyzing project...

## Discovered Issues

### High Priority
1. **[test] SessionManager 테스트 누락**
   - Location: `packages/core/src/application/SessionManager.ts`
   - Complexity: M

### Medium Priority
2. **[enhancement] 로딩 상태 개선**
   - Location: `packages/web/src/app/sessions/[id]/page.tsx`
   - Complexity: S

---

Creating issues...
✓ Issue #1 created: test(core): add SessionManager tests
✓ Issue #2 created: feat(web): improve loading states

Done! Created 2 issues.
```

## Tips

- Run `/discover` after major changes
- Use area filter for focused analysis
- Check existing issues before running to avoid duplicates