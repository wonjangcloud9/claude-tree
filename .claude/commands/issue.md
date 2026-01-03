# Create GitHub Issue

Create a well-structured GitHub issue from user input.

## Usage

`/issue <title or description>`

## Steps

1. Parse user input for issue context
2. Ask clarifying questions if needed (type, priority, scope)
3. Generate structured issue content
4. Create issue via `gh issue create`

## Issue Template

```markdown
## Summary
<One-line description of the issue>

## Problem / Motivation
<Why this issue needs to be addressed>

## Proposed Solution
<High-level approach or acceptance criteria>

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Additional Context
<Screenshots, links, related issues>
```

## Labels

Apply appropriate labels based on issue type:

| Type | Label | Description |
|------|-------|-------------|
| Feature | `enhancement` | New feature or improvement |
| Bug | `bug` | Something isn't working |
| Docs | `documentation` | Documentation updates |
| Refactor | `refactor` | Code improvement |
| Chore | `chore` | Maintenance tasks |

## Priority Labels

| Priority | Label | When to use |
|----------|-------|-------------|
| High | `priority: high` | Blocking or critical |
| Medium | `priority: medium` | Important but not urgent |
| Low | `priority: low` | Nice to have |

## Scope Labels

Based on affected package:
- `scope: cli`
- `scope: core`
- `scope: web`
- `scope: shared`

## Workflow

1. **Gather Info**: Ask user for missing details
2. **Generate Issue**: Create formatted issue body
3. **Confirm**: Show preview before creating
4. **Create**: Run `gh issue create`
5. **Output**: Return issue number and URL

## Output Format

After creating the issue, output:

```
Issue #<number> created: <title>
URL: <issue_url>

Start working on this issue:
/feature <number>
```

## Example

User: `/issue 세션 목록에서 검색 기능 추가`

Generated:
```bash
gh issue create \
  --title "feat(web): add search functionality to session list" \
  --label "enhancement" \
  --label "scope: web" \
  --body "## Summary
Add search/filter capability to the session list dashboard.

## Problem / Motivation
With many sessions, finding a specific one becomes difficult.

## Proposed Solution
- Add search input above session list
- Filter by session name, branch, or status
- Real-time filtering as user types

## Tasks
- [ ] Add search input component
- [ ] Implement filter logic
- [ ] Add keyboard shortcut (Cmd+K)
- [ ] Persist search state"
```
