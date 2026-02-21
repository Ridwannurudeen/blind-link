# Contributing to Blind-Link

Thanks for your interest in contributing! This guide covers setup, standards, and the PR process.

## Prerequisites

- [Arcium CLI](https://docs.arcium.com/developers/hello-world)
- Solana CLI (`solana config set --url devnet`)
- Node.js 18+
- Rust (stable toolchain)

## Setup

```bash
# Clone and install
git clone https://github.com/Ridwannurudeen/blind-link.git
cd blind-link
npm install        # root dependencies (ESLint, Mocha, test tooling)
cd app && npm install  # frontend dependencies

# Copy environment configs
cp .env.example .env
cp app/.env.example app/.env
```

## Development Workflow

### Frontend

```bash
cd app
npm run dev          # start dev server on port 3000
npx eslint src --ext .ts,.tsx   # lint
npx vitest run       # run unit tests
npm run build        # production build (tsc + vite)
```

### Rust (Circuit + Solana Program)

```bash
arcium build                    # build circuits + Anchor program
rustfmt --check encrypted-ixs/src/lib.rs   # check circuit formatting
rustfmt --check programs/blind_link/src/lib.rs  # check program formatting
```

### Integration Tests

```bash
arcium test --cluster devnet    # requires Solana devnet wallet with SOL
```

## Code Standards

- **Rust**: Run `rustfmt` before committing. CI enforces formatting.
- **TypeScript**: Follow the ESLint config in `app/.eslintrc.json`. No errors allowed; warnings are acceptable.
- **Tests**: Add tests for new functionality. Unit tests go in `app/src/` alongside the source (e.g., `foo.test.ts`). Integration tests go in `tests/`.
- **Contact hashing**: Any changes to `app/src/utils/contact-hash.ts` must preserve hash consistency between registration and discovery. Run `npx vitest run` to verify.

## Project Structure

| Directory | What lives here |
|---|---|
| `encrypted-ixs/src/` | Arcis MXE circuit (Rust) |
| `programs/blind_link/src/` | Anchor Solana program (Rust) |
| `app/src/pages/` | React page components |
| `app/src/components/` | Shared React components |
| `app/src/services/` | PSI client and API logic |
| `tests/` | Integration tests (Mocha + devnet) |

## Pull Request Process

1. Fork the repo and create a feature branch from `master`
2. Make your changes with clear, focused commits
3. Ensure CI passes: lint, tests, build, and rustfmt
4. Open a PR with a description of what changed and why
5. Link any related issues

## Reporting Issues

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser/OS if frontend-related
