---
name: prepare-to-ship
description: Use when the user wants to ship, push upstream, open a PR, or verify a branch is green before pushing. Runs TheSlope's pre-ship gates locally in the same order as the CI/CD pipeline (.github/workflows/cicd.yml), stopping at the first failure.
---

# Prepare to Ship

Mirror the CI/CD pipeline locally and confirm every gate is green before the branch is pushed. Run gates one-by-one in CI order. Stop at the first failure, report which gate failed and why, and do not run later gates.

## Pre-flight

- Confirm the branch is not `main`: `git branch --show-current`.
- Confirm the working tree is committed — uncommitted work is not what CI tests: `git status -s`.
- Confirm the branch sits on current `main`; offer `git fetch origin main` when unsure.

## Gates (run in this order)

| # | Gate | Command |
|---|------|---------|
| 1 | Lint + typecheck | `npm run pre:all` |
| 2 | Prisma schema | `npx prisma validate` |
| 3 | Unit tests | `npm run test:unit` |
| 4 | Seed local D1 | `npm run db:migrate:local && npm run db:seed:local` |
| 5 | E2E API | `npm run test:e2e:api` |
| 6 | E2E UI | `npm run test:e2e:ui` |

## Gotchas

- `pre:all` = `npm run lint && npm run ts && npm run ts:server && npm run ts:node` (eslint + `vue-tsc --noEmit` for the root/app project, the Nitro server project via `server/tsconfig.json`, and the node/build-time project). Server-reachable composables get no Nuxt auto-imports at runtime; only the server project check catches a bare `useX()` there (ADR-017). CI runs `pre:all` as its "Lint and typecheck" step.
- Use Vitest reporters (`--reporter=verbose` or `dot`) for unit tests. Never pass `--reporter=line` to Vitest — `line` is a Playwright reporter and Vitest fails to load it.
- E2E gates need gate 4 to have seeded the local D1 DB first, or they fail with missing-data errors.
- Scope a targeted e2e re-run to the affected spec, e.g. `npx playwright test tests/e2e/ui/serial/ChefSwap.e2e.spec.ts --no-deps --reporter=line`.
- CI marks the E2E UI step `continue-on-error`, so it does not block deploy on CI. Treat it as blocking locally unless the user says otherwise.

## Reporting

Report ✅/❌ with a one-line summary after each gate (e.g. "unit: 2043 passed"). End with a gate table. When all gates pass, surface the push and PR commands, writing the PR body to a file to avoid shell-quoting issues:

```bash
git push -u origin <branch>
gh pr create --base main --head <branch> --title "<title>" --body-file .git/PR_BODY.md
```

## Guardrails

- Never run `git commit`, `git push`, or `gh pr create` unprompted — the user owns commits and PRs (see CLAUDE.md).
- Keep AI attribution and co-author lines out of commit messages and PR descriptions.
- Merge a PR only on explicit request (`gh pr merge`).
