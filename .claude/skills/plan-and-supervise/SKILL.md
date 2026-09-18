---
name: plan-and-supervise
description: Use when writing or updating a feature / bug-fix plan doc in docs/features, when asked to "assess and plan the work left", or when supervising subagents that implement such a plan. Encodes the user's working preferences - named packages (no codes), ASCII mockups signed off in the doc and moved to the component header on implementation, implemented fixes trimmed to pointers, per-package approval before any agent starts, endpoint→API spec and component→BDD spec coverage, design-system tokens over raw Nuxt UI props, code traced before claims.
---

# Plan and Supervise

The user is the architect of record. Plans are read line by line, every decision is theirs, and implementation runs one package
at a time behind an explicit approval. The plan document is the deliverable; the dialogue is how it gets right.

## Where the plan lives

- `docs/features/<kind>-<name>.md` (`bug-fix-…`, `feature-proposal-…`); rename when the scope outgrows the name (plain `mv`, the user stages).
- A shipped doc moves to `docs/features/archived/`, trimmed to pointers, and a proposal becomes a feature there:
  `feature-proposal-<name>.md` → `archived/feature-<name>.md`. What did not ship moves to its own proposal or the branch's follow-up doc first.
- Header: **Status** | **Date** | **Updated** | **Branch**. A **Fix inventory** table at the top; one section per fix below in this order:
  **Problem → Root cause → Solution → Mockup → TDD → Affected areas** (see `bug-fix-admin-ux.md` for the shape).
- A dated **Decisions** section records what the user decided and why; open decisions are marked **OPEN** with the options compared,
  never silently picked.
- References to an accepted ADR are `ADR-NNN [Title]`. A new ADR is proposed in the doc's ADR Notes by its semantic name only; it gets its number
  when it is written into `docs/adr.md`.
- Prose in the doc follows the `documentation` skill (compact, factual, only what we do); decisions and OPEN items are the one place alternatives are written down.

## Naming

- Packages, fixes and mockups are named by what they are: "Alerts on mobile", "Planning form", "Mockup — Poster".
  Never `U1`, `M3`, `WP-A`, `Phase 1`. Existing ids in shipped sections (D1, A1, C1) are history and stay.

## Mockups gate every UX change

- ASCII mockups live in the doc (desktop and mobile where they differ) until they are implemented, marked `⏳ awaiting signoff`
  until the user marks them `✅`.
- Implementing a mockup moves it into the changed component's header comment (`AdminPlanning.vue`, `SeasonSelector.vue`,
  `UserProfileCard.vue` style); the doc then keeps the signoff line and points to that header.
- Parent owns the composition, child owns its layout: the container's header mockup draws how the children are arranged
  (each child as a labelled box, no internals); each child's header mockup draws its own internals. No drawing line appears
  in two files.
- No implementation of a UX package before its mockup is ✅.

## Cleaning up the doc once a fix is implemented

- An implemented fix shrinks to pointers: the files, functions and specs that carry it, the signoff date, the component header
  that holds its mockup. Code snippets, token and hex tables, red/green logs and old → new tables leave the doc; git history
  holds them.
- Anything not implemented keeps its full detail: open decisions with the options and their measurements, findings still
  standing, deferred work, notes on what a later package has to do.
- Detail that belongs to another feature moves to that feature's doc in full (the notification triggers moved from the
  notifications doc to `feature-proposal-notification-triggers.md`), and this doc points there.

## Investigate before you claim

- Trace the code path and cite `file:line` for every safety or behaviour statement. Check **every caller** before saying something is or
  is not handled (`grep -rn "fn(" server app`).
- Answer the question that was asked. When asked "is X safe / does the existing mechanism cover it", explain what the existing design
  does (e.g. ADR-015 reconcile + scaffold, ADR-013 schema-designed cascade) and whether a gap exists. Do not propose new guards, locks or
  alternative semantics for behaviour the ADRs designed on purpose unless the user asks for options.
- Nuxt config is build/deploy-time; anything editable at runtime by users lives in the database.

## Design-system rule

- Shared UI patterns are tokens in `useTheSlopeDesignSystem` (`BUTTONS`, `ALERTS`, `COMPONENTS.calendarGrid`, …). Components bind the
  token (`v-bind="ALERTS.info"`) and pass only domain props. No `app.config` theme overrides, no per-site `:ui` patches.
- A fix to a Nuxt UI component family = add the token, sweep **all** instances onto it, add an architecture test under
  `tests/component/architecture/` so the raw form cannot come back.

## Coverage rule (show it as a matrix in the plan)

| Change | Required tests |
|---|---|
| New or changed endpoint | Playwright API spec under `tests/e2e/api/` (parallel, or serial when it needs the active season) |
| New or changed UX component / behaviour | BDD e2e (GIVEN/WHEN/THEN, Playwright) **and** a component spec (Vitest, real components and stores, `registerEndpoint` for HTTP) |
| Utility / composable | unit spec |
| Test-id changes | an old → new contract table |

Everything follows `docs/testing.md` (factories, salting, `describe.each`, no mocks of house components or stores).

## Package brief (posted for approval before any agent starts)

```
Package: <name>
Goal: <one sentence>
Files: create / modify / delete
Red tests first: <spec → cases>
Test-ids: <old → new>
Open decisions: <none | list>
Agent: tdd-pair-programmer | nuxt-typescript-developer | test-automation-engineer
User actions: <npm i …, migration, none>
```
Wait for approval or fine-tuning. Launch one agent per package with the brief, the mockup and `docs/testing.md` rules.

## Per-package gate

1. Red run output shown → 2. green run output shown → 3. `npm run pre:all` → 4. architect diff review against the brief, the coverage
matrix and the design-system rule → 5. compliance rows (`docs/adr-compliance-*.md`) updated in the same change → 6. the **user commits**.

## Hard rules (from `working-style-rules`)

- Agents never commit, never `git add`, never run migrations, db or infra commands; prepare files and command lines, the user runs them.
- No python. Stay inside the project folder (transient files go to gitignored dirs such as `test-results/`).

## Extraction rule

- **A one-liner is never a component.** Extract a component when it owns behaviour, state, or a multi-element template. A single
  span or expression that repeats stays inline; its shared logic lives once in a util or a design-system token (e.g. three
  identical `#week-day` slot bodies calling `translateToDanish` are fine — the mapping is the single source, the wiring is not).
- An alert plus a button is still not a component. To show the same empty state in two modes, render the existing branch
  or slot that owns it (e.g. let the table branch render when there are no rows, in edit mode too) instead of extracting
  a wrapper or copying the block.

## One e2e runner at a time

- Never let two agents run Playwright concurrently: they share the local dev server and the D1 database, so one agent's
  `beforeAll` season activation or a server restart shows up as random timeouts in the other's suite. Sequence packages that
  run e2e; if a suite looks flaky, rerun it alone before blaming the change. No DB reseed between test runs.

## Visual check before a package is done

- Every package that changes rendered UI ends with a **Visual check** table the user walks through in the browser, on top of the
  automated tests: `route (+ query / state to reach it) → viewport (phone 375px and/or desktop) → DS element to expect (`ALERTS.<kind>`, `BUTTONS.<kind>`, component) → what to expect`.
  The agent produces the list from the files it actually changed; the architect verifies it against the diff and relays it.
  A package is not approved as done until the user has seen every changed surface.
- Prefer reuse over new code: bind design-system tokens (`ALERTS`, `BUTTONS`, `COMPONENTS.*`), reuse existing components,
  slots and helpers; a table's own empty slot (`#empty`) is preferred over a standalone alert whenever a table is on the surface.
- The visual-check table of every package on the branch is carried into the **PR description** (the user opens the PR; the
  architect drafts the description text with the table, next to the test results). Keep the same route/state → viewport →
  change → expected columns so the reviewer can walk the app.

## Do not test design-token values

- A test that asserts a token's class string, text size, colour or padding (`expect(ui.title).toContain('text-lg')`) restates
  the design and guards nothing. Design values are the user's visual-check business.
- Test **usage** (architecture tests: every site binds the token) and **behaviour** (text renders, CTA present/absent, events
  emitted, no horizontal overflow at 375px in e2e). A getter that branches on `isMd` may get one case for the branch.

## Signoffs happen in chat

- Anything that needs the user's signoff — a mockup, a decision, a package brief — is presented in the conversation itself,
  in full (ASCII mockup pasted, options listed). The doc is the record, never the place the user is sent to look.

## Token sweeps are value-preserving

- Moving colours, sizes or spacing into design-system tokens must not change one rendered class. Two sites with different
  values (`dark:bg-gray-800` vs `dark:bg-gray-900`, `/50` alpha, a different grey step) get two tokens, named by where they
  are used; unifying them is a separate design decision the user takes from a visual proposal. Prove it: compare the set of
  classes each template renders before and after the sweep.

## ADR numbers are taken at write time

- A plan or proposal refers to a future ADR by title only ("the settings ADR"). The number is the next free one in
  `docs/adr.md` at the moment the ADR is written; numbers grow by one per decision and are never reserved or hardcoded.
