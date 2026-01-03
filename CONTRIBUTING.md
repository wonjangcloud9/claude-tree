# Contributing to claudetree

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/claude-tree.git
cd claude-tree

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Project Structure

```
packages/
├── cli/      # CLI tool (@claudetree/cli)
├── core/     # Domain + Infrastructure (@claudetree/core)
├── shared/   # Shared types (@claudetree/shared)
└── web/      # Next.js dashboard (@claudetree/web)
```

## Development Workflow

### TDD Approach

We follow Test-Driven Development:

1. Write a failing test
2. Implement minimal code to pass
3. Refactor while keeping tests green

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run specific package tests
pnpm --filter @claudetree/core test
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @claudetree/cli build
```

## Code Style

- TypeScript strict mode
- Functions under 30 lines
- Clear, descriptive naming
- Early returns preferred

## Commit Messages

Format: `type: description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

Example: `feat: add GitHub issue integration`

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes with tests
4. Ensure all tests pass: `pnpm test`
5. Submit a pull request

## Questions?

Open an issue or start a discussion!
