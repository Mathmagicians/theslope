---
name: dry
description: Use when the user asks for a DRY check, a duplication review, or "/dry" on the current branch. Audits changed code for copy-paste, repetition, unfinished refactorings, and extracted helpers/components not applied everywhere. Reports violations and a cleanup plan the user signs off before any edit. Pre-existing duplicates of a pattern the branch abstracts are IN scope (no broken windows).
---

# DRY Check

Audit the current branch for duplication and for refactorings left half-done. Report first; edit only after the user signs off on the plan.

## Principles

- **No broken windows.** When the branch introduces a helper, component, constant, factory or test id, every place the old pattern still lives is a violation - including code the branch never touched. "Pre-existing" and "out of scope" are not defences; the branch is what made it a duplicate.
- **A refactoring is done when nothing of the old shape remains:** no local copies, no dead exports, no unreferenced files, no stale comments or docs describing the old way.
- **Report, then ask.** Never fix while auditing. The user signs off on the plan.

## Step 1: Scope

- `git log --oneline main..HEAD`, `git diff --stat main...HEAD`, `git status --short`.
- Separate committed branch changes from uncommitted work. Files another session is editing (`ListAgents`, `git status`) are audited but marked "listed, not edited here".

## Step 2: Inventory what the branch extracted

List every abstraction the diff introduces: helpers/utilities, composables, components, shared constants (test ids, labels, enums), factories, mocks/stubs, config keys. For each, write down the literal shape of the old code it replaces - that string is what Step 3 greps for.

## Step 3: Sweep the WHOLE repo for the old shape

The search is derived from the abstraction, never from memory. Its body *is* the pattern: whatever the new thing encapsulates is exactly what a remaining duplicate still spells out by hand. Read the implementation, extract the distinctive expression, grep the entire tree for it. Every hit outside the abstraction is a remaining instance.

| Kind of abstraction | The old shape is | So grep for |
|---------------------|------------------|-------------|
| Function or helper | The expression or statement sequence its body wraps | The distinctive call, selector or operator inside that body |
| Component | The template fragment it now owns | Its distinctive markup, slot names or class combinations in other components |
| Shared constant or map | The literal values it names | The string or number literals themselves |
| Factory | The field set it assembles | Object literals carrying those keys, especially in specs |
| Setup or mount wrapper | The wiring it performs | Specs that perform the same wiring by hand, or that mock the thing away instead |
| Store or composable method | The data flow it centralises | Components or pages reproducing the same fetch, reduce, sort or format inline |

Also grep for the abstraction's own name. **A new file or export nothing imports is a violation:**
`grep -rl "<name>" --include='*.ts' --include='*.vue' . | grep -v node_modules`

## Step 4: Duplication inside the diff

- Near-identical blocks across files, compared by structure not whitespace: mock setup, helpers, `beforeEach`, mount functions.
- Test cases differing only by data → `describe.each` / `it.each` (docs/testing.md Rule 1).
- The same template fragment in two components → an atom.
- The same formatting or pluralisation expression repeated → a utility.
- The same store + composable wiring in several components (e.g. `storeToRefs(useXStore())` feeding the same call) → a wrapper.

## Step 5: Unfinished refactorings

- Old helper still defined beside the new one; old export still exported; wrapper functions that only rename the new helper.
- Files the branch added that nothing references.
- Comments, JSDoc, diagrams and docs (`docs/testing.md`, `docs/adr-compliance-*.md`, `docs/features/*`) still describing the replaced shape; a JSDoc block stranded above the wrong declaration.
- Mocks that survived although the real thing now works (docs/testing.md Rule 6).
- Docs contradicting the diff (a file listed "untouched" that the branch modifies).

## Step 6: Report

One table, most severe first:

| # | Violation | Where (file:line) | Extracted thing | Remaining instances | Fix |

Severity order: unreferenced new abstraction → old shape surviving beside the new → copy-paste inside the diff → missing parametrization → comment/doc drift.

Follow with a numbered **cleanup plan**: what changes, in which files, and which lint and test runs verify it. Mark items in another session's files "listed, not edited here".

## Step 7: Sign-off gate

Present the plan and stop. Use `AskUserQuestion` when available so the user can approve, amend or reject each item. Do not edit before approval. On approval: apply, run `npx eslint` on the touched files, the affected specs, then `npm run test:unit`; report counts faithfully, including anything left out and why.

## Guardrails

- Dedupe the mechanism, never the coverage: preserve test cases when refactoring them.
- Scripted rewrites (perl/sed over many files) get a `git diff -U0` read-through before the tests run.
- Never commit; the user owns commits (CLAUDE.md).
