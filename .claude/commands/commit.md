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

## Example Output

```
feat(core): add GitHubAdapter for issue integration

- Implement Octokit-based GitHub API client
- Add issue fetching and PR creation
- Generate branch names from issue titles
- Parse GitHub issue/PR URLs

Tested with 9 unit tests.
```

## Important

- Do NOT execute the commit
- Only suggest the message and wait for user confirmation
- Warn if sensitive files (.env, credentials) are included
