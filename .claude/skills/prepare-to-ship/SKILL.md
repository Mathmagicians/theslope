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
| 1 | Lint, generated layers, typecheck | `npm run pre:all` |
| 2 | Unit tests | `npm run test:unit` |
| 3 | Build the app | `npm run build` |
| 4 | Seed local D1 | `npm run db:migrate:local && npm run db:seed:local` |
| 5 | E2E API | `CI=true npm run test:e2e:api` |
| 6 | E2E API serial | `CI=true npm run test:e2e:api-serial` |
| 7 | E2E UI | `CI=true npm run test:e2e:ui` |
| 8 | E2E UI serial | `CI=true npm run test:e2e:ui-serial` |

## Gotchas

- `pre:all` = `npm run lint && npm run pre:gh-actions && npm run pre:prisma && npm run pre:c4 && npm run ts && npm run ts:server && npm run ts:node && npm run ts:workers` (eslint; CodeQL's Actions queries when the branch or the working tree changes `.github/`, skipped in CI; `make d1-prisma-check` when they change `prisma/schema.prisma`, which regenerates `prisma/generated` and fails on a diff against the committed layer, so a schema change ships with its regenerated client; the C4 diagram check; `vue-tsc --noEmit` for the root/app project, the Nitro server project via `server/tsconfig.json`, the node/build-time project and the sender worker). Server-reachable composables get no Nuxt auto-imports at runtime; only the server project check catches a bare `useX()` there (ADR-017). CI runs `pre:all` as its "Lint and typecheck" step and the Prisma check on its own.
- Use Vitest reporters (`--reporter=verbose` or `dot`) for unit tests. Never pass `--reporter=line` to Vitest — `line` is a Playwright reporter and Vitest fails to load it.
- E2E gates need gate 3 (the build the suites run on) and gate 4 (the seeded local D1), or they fail at the server start or with missing-data errors. `CI=true` runs a suite as CI does: on the built app under wrangler's local runtime on port 3000 (stop a dev server on it first), one worker, two retries; without it the suite runs on `npm run dev` or reuses it.
- Scope a targeted e2e re-run to the affected spec, e.g. `npx playwright test tests/e2e/ui/serial/Waitlist.e2e.spec.ts --no-deps --reporter=line`.
- CI runs the four e2e suites on a runner each (`cicd.yml` job `e2e`); the `ui` and `ui-serial` rows carry `gate: false`, so a red one does not block deploy. Treat them as blocking locally unless the user says otherwise.

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
