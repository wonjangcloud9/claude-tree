# Commit Message Generator

Analyze git changes and generate a commit message.

## Steps

1. Run `git status` to list changed files
2. Run `git diff --staged` to review staged changes
3. Run `git diff` to review unstaged changes
4. Analyze changes and generate commit message

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Add/update tests
- `chore`: Build, config changes

### Scope
Package or module changed (cli, core, web, shared)

### Subject
- Use imperative present tense (add, fix, update)
- Lowercase first letter
- No period at end
- Max 50 characters

### Body
- Explain what and why (not how)
- Wrap at 72 characters

### Footer
- Breaking changes: `BREAKING CHANGE: <description>`
- Issue references: `Closes #123`

## Analysis Guidelines

### File Classification
- `*.test.ts` → test related
- `*.md` → docs related
- `src/commands/*` → cli scope
- `src/infra/*` → core scope
- `.github/*` → chore (ci)

### Change Type Detection
- Many new files → feat
- Existing file modifications → fix/refactor
- Mostly deletions → refactor

## ⚠️ CRITICAL RULES

1. **NEVER execute `git commit`** - Only suggest the message
2. **NEVER run any git write commands** - No `git add`, `git commit`, `git push`
3. **Wait for user confirmation** - User will copy and run the command themselves
4. **Warn about sensitive files** - (.env, credentials, secrets)

## Output Format

Provide a simple `git commit -m '...'` command that can be copy-pasted directly.

**IMPORTANT: Always use single quotes for commit messages.**

**Special character handling:**
- Use single quote to wrap the entire commit message
- Replace single quote inside message with backtick
- Avoid exclamation mark, dollar sign, backtick at the start of words

## Example Output

```bash
git commit -m 'feat(core): add GitHubAdapter for issue integration

- Implement Octokit-based GitHub API client
- Add issue fetching and PR creation
- Generate branch names from issue titles
- Parse GitHub issue/PR URLs'
```
