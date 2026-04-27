# Contributing to nahook-node

Thanks for considering a contribution! A few important things to know first.

## Source of truth

This repository is a **subtree-split mirror** of the Node SDK from our private monorepo `getnahook/nahook`. PRs filed directly here **cannot be merged** — the next subtree-push from the monorepo will force-overwrite this branch.

## What we welcome

- **Bug reports** — open a GitHub issue with: reproduction steps, SDK version, Node.js version, OS.
- **Feature requests** — open an issue describing the use case and the API surface you'd want.
- **Small code suggestions** — paste a snippet in an issue and describe intent; we'll port it into the monorepo and credit you in the resulting commit.
- **Substantial patches** — email `support@nahook.com` first; we'll hand-port your change into the monorepo and credit you in the resulting commit.

## Local development

```bash
git clone https://github.com/getnahook/nahook-node
cd nahook-node
npm ci
npm run build      # builds @nahook/client + @nahook/management with tsup
npx vitest run     # full unit test suite
```

The monorepo uses npm workspaces — `@nahook/core` is private and bundled into both published packages at build time.

### Code style

- TypeScript strict mode (`tsc --noEmit` passes)
- Build emits CJS + ESM + DTS via tsup; CI fails on any `[WARNING]` line in build output.
- No required formatter, but match surrounding style.

## License

By contributing, you agree your changes are released under the [MIT License](LICENSE).
