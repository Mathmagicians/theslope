# Feature Proposal: Developer Companion and BDD E2E

**Status:** Proposed | **Date:** 2026-10-18 | **Updated:** 2026-10-18 | **Branch:** `feature/developer-companion` (after 0.9.0 ships)

## Goal

A developer clicks from a CI summary to the test result, reads what each environment runs and how it behaved, and reads
the e2e suite as living documentation. The e2e specs become Gherkin features run by playwright-bdd;
`developer.skraaningen.dk` publishes the Cucumber reports, the API reference and the docs per environment.

## Package inventory

| Package | State | Goal |
|---|---|---|
| BDD foundation | not started | playwright-bdd wired, `make bdd-report` in the summaries, one api and one ui feature migrated |
| Developer companion | not started | the site on GitHub Pages, published by its own workflow on a publish to an environment |
| API reference | not started | the OpenAPI spec of the deployed version, a Scalar page |
| Feature migration | not started | every suite as features, `test-report` retired, the features section with live results |

## Mockup — Site map ✅ 2026-10-18

```
developer.skraaningen.dk        GitHub Pages from the gh-pages branch; CNAME in Cloudflare DNS
├── /                           the environments at a glance: version, commit, deployed at, green or red
├── /environments/<env>/        the living documentation of the deployed version: the Cucumber report per
│                               suite (api, ui) and the smoke run against the live server; its API reference
├── /features/…                 every feature file with each scenario's latest result
├── /api                        Scalar over the OpenAPI spec of the deployed version
└── /guides  /adr  /testing  /ui   docs/*.md as they are
```

An environment is a path; the home page lists the manifests under `environments/`, so a new environment appears when
its deploy writes `environments/<name>.json`.

## Package: BDD foundation

**Problem.** An e2e case is readable only by its title, and a result is a Playwright table.

**Solution.** playwright-bdd 9 generates a Playwright spec per `.feature` before the run (`bddgen`); the Playwright
runner, the projects, the setup chain and the factories stay.

- Layout: `tests/e2e/features/<domain>/*.feature`, `tests/e2e/steps/<domain>.steps.ts`, `tests/e2e/fixtures.ts`
  (`adminContext`, `memberContext`, the ids a scenario creates with their teardown through the factories, the
  scenario's scene); parameter types bind the domain words to the enum schema members.
- Config: `defineBddProject` per Playwright project; a feature picks its project by tag (`@api`, `@ui`, `@serial`,
  `@smoke`); `.features-gen/` is gitignored and excluded from eslint and the tsconfigs; the `.spec.ts` `testMatch`
  stays until the last spec migrates.
- Reports: `cucumberReporter('json')` and `cucumberReporter('html', {skipAttachments: ['trace']})` per suite into
  `test-results/`, uploaded as the artifact `bdd-<suite>`; `make bdd-report report=<cucumber json> title=<text>
  [link=<url>]` writes the summary table: features and scenarios passed and failed, each failing scenario with its
  failed step. It stands beside `make test-report` while specs remain.
- Step rules, written into `docs/testing.md`: a step names a domain fact, never a screen; one phrasing per fact; steps
  grouped by domain file; the domain words are parameter types; scenario state and cleanup live in fixtures;
  Backgrounds carry shared GIVENs; Scenario Outlines replace `forEach` examples; `bddgen export` lists the steps an
  author reuses before writing one.
- Commands: `npx bddgen && npx playwright test --project=chromium-api --grep "<scenario>"` runs one scenario;
  `CLAUDE.md` names it.

**TDD.** Each migrated spec's cases map one to one to scenarios; the package report carries the old → new case table;
the suite is green in CI with both tables in the summary.

**Affected areas.** `package.json` (devDependency, `test:e2e*` scripts), `playwright.config.ts`, `.gitignore`, the
eslint config, the tsconfigs, `Makefile`, `.github/workflows/cicd.yml` (artifacts, `bdd-report` calls),
`tests/e2e/features`, `tests/e2e/steps`, `tests/e2e/fixtures.ts`, `docs/testing.md`, `CLAUDE.md`,
`.claude/agents/test-automation-engineer.md` (`Bash(npx bddgen:*)`), the test columns of the compliance docs.

## Package: Developer companion

**Problem.** A result is an artifact zip, and nothing shows what a server runs and how it behaved.

**Solution.** A VitePress site in `developer/` with its own `package.json`, published to the `gh-pages` branch by
`.github/workflows/developer.yml`, served by GitHub Pages at `developer.skraaningen.dk`.

- Trigger: `deployment_status` of the smoke job's `environment` (`dev`, `prod`), states success and failure;
  `workflow_dispatch` with `environment` and `run_id` republishes by hand; `concurrency: developer-site`. The CICD
  job's `CLOUDFLARE_THESLOPE` deployment is filtered out by name.
- Steps: checkout `main`; checkout `gh-pages` into the output, so the other environments' content stays;
  `gh run download` of `bdd-api`, `bdd-ui`, `bdd-smoke` of the pipeline run named in the status's log URL;
  `make developer-assemble env=<env> run=<id> version=<v> sha=<sha>` lays `environments/<env>/<suite>/` and writes
  `environments/<env>.json` (environment, version, sha, deployed at, run, result per suite); `make developer-build`
  renders the site; `make developer-publish` commits once and force-pushes, so the branch stays the size of its content.
- Pipeline addition: the `bdd-<suite>` artifacts after each suite; the smoke suite's report carries no screenshots,
  as it runs against live data. Until the BDD foundation lands, the Playwright JSON stands in for the result per suite.
- Pages: the home page with one card per manifest; `environments/<env>` with the manifest and a link per suite;
  `guides`, `adr`, `testing`, `ui` rendered from `docs/`.
- DNS and settings, the user's actions: Pages source `gh-pages`, root; `CNAME developer.skraaningen.dk →
  mathmagicians.github.io`, DNS-only; the `CNAME` file in the site root. `docs/ops-runbook.md` gets the republish
  command and the record.

**Mockup — Environment page** ✅ 2026-10-18

```
dev   v0.9.0   31e6b6b   deployed 2026-10-18 10:42   run 39079217611

| Suite | Scenarios | Result   |                        |
|-------|-----------|----------|------------------------|
| api   | 212       | passed   | Cucumber report        |
| ui    | 148       | 1 failed | Cucumber report        |
| smoke | 6         | passed   | Cucumber report (live) |

API reference of this version
```

**Mockup — Home** ✅ 2026-10-18

```
| dev                      | prod                     |
| v0.9.0 · 31e6b6b         | v0.8.4 · c1d2e3f         |
| deployed 2026-10-18      | deployed 2026-10-02      |
| api ✓  ui ✗  smoke ✓     | api ✓  ui ✓  smoke ✓     |
```

**TDD.** `make developer-assemble` and `make developer-build` run locally on a downloaded run; the first publish is the
browser check: the home page, the environment page, a Cucumber report, a guide, on phone and desktop.

**Affected areas.** `developer/` (new), `.github/workflows/developer.yml` (new), `Makefile`,
`.github/workflows/cicd.yml` (artifacts), `docs/ops-runbook.md`, the repo's Pages setting, one DNS record.

## Package: API reference

**Problem.** The endpoint inventory is kept by hand in `docs/adr-compliance-backend.md`.

**Solution.** Nitro's OpenAPI generation (`nitro.experimental.openAPI`, production spec written at build time) lists
every handler under `server/routes/api`; the pipeline uploads the spec with the run, `developer-assemble` lays it at
`environments/<env>/openapi.json`, and a Scalar page in the site reads the environment's spec. Route metadata comes
through `defineRouteMeta` per handler, domain by domain, with request and response schemas derived from the Zod schemas
of the validation composables. The first step is the inventory: every route, tagged by its directory.

**TDD.** An architecture unit spec under `tests/component/architecture/`: every handler under `server/routes/api`
appears in the generated spec.

**Affected areas.** `nuxt.config.ts`, `server/routes/api/**` (route meta), `.github/workflows/cicd.yml` (artifact),
`developer/` (the page), `docs/adr-compliance-backend.md` (points to the spec).

## Package: Feature migration

Suite by suite: api parallel (26 specs), api serial (8), ui (28), ui serial (7), smoke (1). Each suite is one package:
its specs become features with an old → new case table, and its `make test-report` call becomes `make bdd-report`.
After the last suite: the `test-report` target and the `.spec.ts` `testMatch` go; the features section of the site
renders every feature with each scenario's latest result from the environment's Cucumber JSON; ADR-003 is updated.

## Coverage matrix

| Change | Required tests |
|---|---|
| playwright-bdd wiring and a migrated feature | the feature green in CI; the old → new case table in the package report |
| make targets and workflows | run on the branch; the summary table and the published page in the browser check |
| Nitro OpenAPI | the architecture unit spec: every handler in the spec |
| Site pages | the VitePress build in the workflow; the browser check table per package |

## Decisions (2026-10-18)

- Tool: playwright-bdd. cucumber-js as the runner loses the Playwright projects, the setup chain, fixtures and
  `--no-deps`; Serenity/JS adds a pattern of its own. playwright-bdd keeps all of it and migrates spec by spec.
- Summaries: the BDD table comes from `make bdd-report`, the house style for summaries; it replaces `make test-report`
  when the last spec has migrated, and both stand in the summary until then.
- Hosting: GitHub Pages. Everything published is public already (the feature files, the docs, seed data in the
  reports), so no gate is needed; GitHub's sign-in gate for Pages exists on Enterprise Cloud only. Cloudflare with
  Access, R2 and a Worker was the design while the Playwright report was to be published; it is not.
- The Playwright report stays an artifact (30 days): its traces carry the test accounts' session cookies and the
  bypass header.
- Retention: the latest per environment, replaced by the next publish; no PR folders, a PR run's results are in its
  step summary; no pruning.
- Trigger: the site's own workflow on `deployment_status` of the smoke job's environment, success and failure, plus
  `workflow_dispatch` to republish. `workflow_run` fires on every pipeline run and needs a manifest artifact;
  `workflow_dispatch` from the pipeline couples the pipeline to the site.
- One site holds every environment as a path; a third environment is one more manifest.
- Hostname `developer.skraaningen.dk`; VitePress; API reference inventory first, schemas domain by domain; the work
  starts on its own branch after 0.9.0 ships; the smoke report publishes without screenshots.

**OPEN**

- Package order: BDD foundation first, so the companion publishes Cucumber reports from its first run (as listed) /
  Developer companion first with the Playwright JSON standing in.
- The two features of the BDD foundation: `preferences.e2e.spec.ts` (api, holds a Scenario Outline) and
  `Waitlist.e2e.spec.ts` (ui serial, three cases, exercises the serial tag) (as drawn) / another pair.
- Feature language: English with the Danish domain words, as the spec titles today (as drawn) / Danish Gherkin
  (`# language: da`: Egenskab, Scenarie, Givet, Når, Så).
- Prod kept per release version in addition to the latest: later, when a release needs looking back.

## ADR notes

- ADR-003 [BDD-Driven Testing Strategy with Factory Pattern] gains the feature files, the step rules and the living
  documentation.
- A new ADR, the developer companion: the site, its workflow, the latest-per-environment rule and what is public.
