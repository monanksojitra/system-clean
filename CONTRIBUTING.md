# Contributing

Thanks for your interest in improving system-clean.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Run tests:

```bash
npm test
```

4. Run a local smoke scan:

```bash
node bin/system-clean.js scan --simple
```

## Pull Request Guidelines

- Keep changes focused and small.
- Add or update tests for behavior changes.
- Update README if CLI behavior or options change.
- Ensure `npm test` and `npm pack --dry-run` both pass.

## Commit Messages

Use clear, descriptive commit messages, for example:

- `fix(cli): replace require readline with ESM import`
- `fix(core): avoid duplicate scan paths`
- `ci: add node matrix test workflow`
