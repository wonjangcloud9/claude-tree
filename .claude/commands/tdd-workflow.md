# TDD Workflow

Test-Driven Development workflow. Use when implementing new features with tests first.

## Trigger Keywords
- "TDD", "test first", "write tests"

## Workflow

You MUST follow TDD (Red-Green-Refactor) strictly:

### 1. RED - Write Failing Test First
- Understand the requirement
- Write a test that describes the expected behavior
- Run the test - it MUST fail (no implementation yet)
- Commit: `test: add failing test for [feature]`

### 2. GREEN - Minimal Implementation
- Write the MINIMUM code to make the test pass
- No extra features, no optimization
- Run the test - it MUST pass now
- Commit: `feat: implement [feature] to pass tests`

### 3. REFACTOR - Clean Up
- Improve code quality without changing behavior
- All tests must still pass
- Commit: `refactor: clean up [feature] implementation`

## Rules

1. **NEVER write implementation before tests**
2. **One test at a time** - don't write multiple failing tests
3. **Small commits** - commit after each phase (red/green/refactor)
4. **Run tests frequently** - after every change

## Test File Conventions

- TypeScript/JavaScript: `*.test.ts`, `*.spec.ts`
- Python: `test_*.py`, `*_test.py`
- Go: `*_test.go`

## Example Flow

```
1. Read issue/requirement
2. Write test: expect(add(1, 2)).toBe(3)
3. Run test → FAIL (add doesn't exist)
4. Commit: "test: add failing test for add function"
5. Write: function add(a, b) { return a + b }
6. Run test → PASS
7. Commit: "feat: implement add function"
8. Refactor if needed
9. Create PR with all tests passing
```

## PR Checklist

Before creating PR:
- [ ] All tests pass
- [ ] No skipped tests
- [ ] Coverage maintained or improved
- [ ] Lint passes
