# Release 0.9.0 — work-roster push overview

**Status:** Draft | **Date:** 2026-10-05 | **Updated:** 2026-10-08 (decisions round 9) | **Branch:** `feature/work-roster`

The umbrella spec for this push (the finished push earns v0.9). Each package is briefed and approved in chat before
any agent starts; detail lives in the linked docs. All Prisma work lands as ONE migration package (model sign-off
first, `.claude/skills/prisma/SKILL.md`). Every package runs `/dry` on its diff and follows `/code-comments`;
ADR-compliance rows update in the same change; broken windows in touched files are fixed by the touching package.
Sizing is informal t-shirt sizes.

## Package inventory

| Package | What | Detail | Size | Status |
|---|---|---|---|---|
| Framework research spike | prisma 7/8-RC + zod 4 + `zod-prisma-types` compatibility; removable workarounds and adoptable features; Nuxt roadmap evidence that `useAsyncData`'s option surface (`enabled`, `createUseAsyncData`) and named layout slots survive coming releases | `feature-proposal-framework-adoption.md` § Dependency clusters | S | ✅ decided — spike first |
| CI test reporting | Job summary: vitest's built-in GitHub summary + per-suite Playwright sections with report links | below | S | ✅ approved 2026-10-05 |
| Framework pair upgrade | pinia 4 + @pinia/nuxt 1, @vueuse/core 15, ical-generator 11 | `feature-proposal-framework-adoption.md` § Clusters and order | S | ✅ implemented 2026-10-05 — zero source changes, user commit pending |
| Store fetcher factory + store alignment | `useStoreAsyncData`, schema-driven types; every store converges on it (the misaligned fetch handling across stores, release-plan I2) | `feature-proposal-framework-adoption.md` | M–L | ✅ approved 2026-10-05 |
| Fetch gating | `enabled` carries the fetch condition; id-in-key gates need nothing extra, login gates clear on logout; folded in 2026-10-07: datasets key on the real selection (no copy refs, no component watches), `selectedSeasonId = userChoice ?? getDefaultSeasonId()`, `dependsOn` for SSR of dependent chains | `feature-proposal-framework-adoption.md` | M–L | ✅ implemented 2026-10-07 — both serial e2e specs green; user commit pending; fine-tuning OPEN (stale-selection 404) |
| Prisma bundle | ALL prisma/zod/migration work in one go: the prisma + zod majors the spike green-lights, `zod-prisma-types` regen, every new model of the push, one migration | below | L | 🔧 IN PROGRESS — model set signed 2026-10-07 (§ Prisma bundle is the contract); migration `0017_roster` applied on local, dev and prod 2026-10-08 |
| Duty roster (F5a) | Templates, duties, audit trail | `feature-proposal-duty-roster.md` | L | Draft |
| Joker + vacancy overviews | `JokerSlot`, dinner "missing" face, CTC faces, shift counts, volunteering moves to duty level + data separation | `feature-proposal-duty-roster.md` § Joker + § Roster UX | L | ✅ UX signed (CTC 2026-10-05, big overview + calendar markers 2026-10-06) |
| Roster sign-off + cross-team swap (F5b) | Derived auto-sign + godkend-alligevel, duty swap | `feature-proposal-duty-roster.md` Phases 4–5 | M | roster UX ✅ signed 2026-10-05 |
| Waitlist | Queue, auto-assign sweep, extra portions, UI | `feature-proposal-waitlist.md` | L | ✅ UX signed (chef 2026-10-05, member faces 2026-10-06); backend ✅ 2026-10-09 (queue, assignment, release-portions, maintenance sweep, four notification kinds; unit + API specs green); UI open |
| Kitchen allergy line | the dining-mode panels show the allergy kuverter; the expanded list opens with the allergen breakdown and chips beside each diner | this doc § Kitchen allergy line | S | ✅ UX signed 2026-10-08 |
| Chef allergen line | the chef's allergen section counts this dinner's diners in kuverter per menu allergen; the edit panel becomes the allergy panel | this doc § Chef allergen line | S | ✅ UX signed 2026-10-09 |
| Chef calendar header | the Agenda/Kalender tabs and the collapse chevron share one header row above a `UCollapsible`; `/chef` hydrates with one footer | this doc § Chef calendar header | S | ✅ option B signed 2026-10-10; implemented, user commit pending |
| Ticket allergies | the booking form shows a booked inhabitant's live allergies on the ticket card (glyph) and in the expanded row (compact elements); guest ids and swapped tickets: `../chores-0.9.1.md` § Ticket allergies on the order | this doc § Ticket allergies | S | ✅ UX signed 2026-10-11 |
| One team number | a team's number comes from its name, else its season position; every team band derives from it (`/admin/teams`, `/chef`, `/dinner`) | this doc § Decisions 2026-10-11 (one team number) | S | ordered 2026-10-11; implemented, user commit pending |
| Season pick prefers the one in progress | the season order is active, in progress, upcoming, ended; the e2e teardown keeps a non-past active season | this doc § Decisions 2026-10-11 (season pick) | S | signed 2026-10-11 |
| One breakpoint source | the design system is the one reader of the layout's `isMd`; components bind responsive tokens, behaviour reads `breakpoint`; the household calendar's open state moves to `?cal=` | this doc § Decisions 2026-10-11 (one breakpoint source) | S | signed 2026-10-11; implemented, user commit pending |
| Notifications | Waitlist + duty-swap kinds, buildup threshold | `feature-proposal-notification-triggers.md` § Trigger catalog | M | catalog updated |
| Adhoc billing + EXPENSE | Ad-hoc charges + chef spending as EXPENSE transactions; Mit forbrug + admin economy spending views | `feature-proposal-adhoc-admin-billing.md` | L | EXPENSE design ✅ signed 2026-10-08; E1 backend ✅ 2026-10-09 (Expense ledger, computed dinner cost, chef expense endpoints; unit + API specs green); E1b chef entry ✅ 2026-10-10 (`ExpenseLines` in the budget pane, store actions, component + ui e2e specs); Indkøbsomkostninger and the Budget pane ✅ 2026-10-11 (lines beside the edits, two-unit amounts, RÅDIGHEDSBELØB start/Brugt/Tilbage, named ticket table, Billetændringer, the team's round; paid tickets count released ones); chef browser specs on free days ✅ 2026-10-11 (`DinnerEventFactory.createDinnerEventOnFreeDay`: one dinner per day, as the chef and dinner pages select by date; `Chef.e2e` + `ChefExpenses.e2e`); OPEN — admin spending views, adhoc charges |
| PRF spike | Passkey/PRF research + device protocol | `../feature-proposal-relogin-faceid.md` (parked proposal), `../archived/feature-mobile-native-feel.md` | S | ✅ done 2026-10-06; S5 re-login parked out of 0.9, no option chosen |
| Page composition | Master/detail + tab frames, `md` breakpoint | `feature-proposal-framework-adoption.md` | M | OPEN — decided from spike findings |
| Order snapshot | Frozen `ticketType` on Order + backfill — the portion resolver reads it | `../chores-0.9.1.md` § Order snapshot | S | parked for the release after 0.9 (2026-10-08) |
| Booking one-path | One builder family for regular + guest orders across grid/preview/day; guest cells editable; power includes guests; honest toasts | `../archived/bug-fix-plan-v0.9.md` | M–L | ✅ approved 2026-10-06 — user commit pending |
| Billing delivery report + interrupted runs | Repository fills delivery state on every read; stale RUNNING runs | `bug-fix-billing-delivery-report.md` | M | OPEN decisions |
| Motion tokens | Raw motion classes into the design system | `bug-fix-motion-tokens.md` | S | parked for this release |
| Dinner-page follow-ups | PR #166 leftovers on `/dinner` | `bug-fix-dinner-page-and-dates.md` | S | parked for this release |

## Build order

The push starts from the framework corner (decision 2026-10-05): the upgrade philosophy is remove workarounds,
follow the framework's own shapes, adopt new features where they earn it.

1. Framework research spike ✅ + CI test reporting ✅ + PRF spike ✅ (S5 parked, nothing of it in the bundle)
2. Framework pair upgrade ✅ (pinia 4 + @pinia/nuxt 1, ical-generator 11; @vueuse/core removed)
3. Store fetcher factory + store alignment (in progress 2026-10-07) → Fetch gating — the spike found they order
   freely around the dependency clusters, so they run before the bundle
4. Prisma bundle: prisma 7.10 + zod 4.6 per spike findings + every model of the push + one migration (models
   signed off, Make targets produce the files, user applies)
5. Duty roster F5a → Joker + overviews (+ data separation) → F5b
6. Waitlist → Notifications
7. Adhoc + EXPENSE (this release, lower priority)
8. Page composition (if signed off)

One e2e runner at a time; packages that run Playwright are sequenced.

## CI test reporting

**Problem.** The pipeline summary reports counts without categories; the e2e api and ui suites appear in neither the
summary nor as result links; `continue-on-error: true` hides ui failures.
**Solution.** Per tool, no cross-format normalization. Vitest 5 reports itself: its `github-actions`
reporter (auto-enabled under `GITHUB_ACTIONS`) writes the Test Files / Test Results summary. Each Playwright suite — api, ui,
smoke — writes its JSON (`PLAYWRIGHT_JSON_OUTPUT_NAME`) and `make test-report` renders that suite's section: counts,
❌ heading on failures, the warning note (ui) and the report artifact link (`actions/upload-artifact` `artifact-url`).
`continue-on-error` stays (decision 2026-10-05).
**TDD.** `make test-report` rendered against sample reports (failing, green, missing file); the summary layout
verifies on a CI run of this branch.
**Affected.** `.github/workflows/cicd.yml`, `Makefile` (`test-report`), `package.json` (playwright json reporters).

## Prisma bundle

One package, one migration, produced by the Make targets after the user signs off every model. Contents:

| Model / change | Source |
|---|---|
| `DinnerDutyTemplate`, `DinnerDuty` (+ `jokerSlotId`), `DutyHistory`, `DutyState`, `DutyAuditAction` | `feature-proposal-duty-roster.md` § Schema additions |
| `JokerSlot` | `feature-proposal-duty-roster.md` § Joker |
| `TicketWaitlist` (an unplaced order in its create shape, as JSON) | `feature-proposal-waitlist.md` § Design |
| `LedgerEntryType` (`REGULAR`, `ADHOC`), `Transaction.type` + `description`, `Expense` (list per dinner, payee user), `DinnerEvent.totalCost` kept and deprecated | `feature-proposal-adhoc-admin-billing.md` § Data model — ledger and expenses modelled symmetrically |

### Signed model set (2026-10-07) — the contract for the implementing agent

**Majors** ✅ applied 2026-10-08. prisma + @prisma/client + @prisma/adapter-d1 7.10.0 (pinned; npm `latest` is the
8-RC), zod 4.6.5, zod-prisma-types 3.3.11.

- `prisma.config.ts` holds the CLI config (schema path, migrations path, the local sqlite url Migrate diffs against);
  the schema's datasource carries the provider only.
- Generator `prisma-client`, `output = "./generated/client"`, `runtime = "workerd"`, `previewFeatures =
  ["partialIndexes"]`; the client is committed; `make d1-prisma-check` fails CI when the generated layer drifts from
  the schema. `strictUndefinedChecks` stays a preview feature in 7 (the generated input types carry `Skip` only
  with the flag), so the flag remains; the 38 `Prisma.skip` sites read `skip` from
  `@prisma/client/runtime/wasm-compiler-edge` (the runtime module the generated client binds to — the same object the
  client compares against), `Prisma.validator<T>()({…})` is `{…} satisfies T`, the seven `@prisma/client` import
  sites point at `~~/prisma/generated/client/client`.
- The zod generator emits enums only (`createInputTypes = false`, `createModelTypes = false`): the code consumes 12
  enum schemas and nothing else; the file is 122 lines. The old 17,756-line file carried 1,846 `Prisma.*` input-type
  references, and instantiating them in every project that includes the zod layer pushed the root `npm run ts` past
  the 4 GB heap (prisma/orm#29011 reports +32 % tsc memory on 7 for the same reason); enums-only brings it back
  under the default heap.
- zod 4: `invalid_type_error`/`required_error` → `error` (6 sites), `.errors` → `.issues`, `z.number({coerce})` →
  `z.coerce.number()`, `.default({})` → `.prefault({})`, `z.string().email()/url()/uuid()/datetime()` →
  `z.email()/z.url()/z.uuid()/z.iso.datetime()` (15 sites), `.passthrough()` → `z.looseObject`, the sparse
  `TicketCountsByTypeSchema` → `z.partialRecord`; `mapZodErrorsToFormErrors` is `z.flattenError`, the 400 message
  and the sender logs use `z.prettifyError`; `useDateRangeValidation`'s own mapper is gone (one mapper).
- Manual chunking and raw-SQL joins stay (ADR-014). Gate: `make d1-prisma` + `npm run pre:all`.

**New tables** ✅ in the schema (group 1 signed 2026-10-07, group 2 2026-10-08; Prisma blocks in the linked docs; every
other column required):

| Table | Column | Decision |
|---|---|---|
| `DinnerDutyTemplate` | `role` | required, default `COOK` |
| `JokerSlot` | `role` / `allocationPercentage` / `affinity` / `startDate`, `endDate` / `note` | default `COOK` / default `100` / required (weekday map JSON) / required / nullable |
| `DinnerDuty` | `inhabitantId` | nullable — vacant duty |
| | `origin` | required, default `TEAM` (`DutyOrigin`: TEAM, JOKER, VOLUNTEER, SWAP) |
| | `role`, `minutesFromDinnerStart`, `durationMinutes`, `taskDescription` | required — copied from the template duty at creation |
| `DutyHistory` | `performedByUserId` | nullable (system actor), SET NULL |
| | `dinnerDutyId` | nullable, SET NULL — null on `ROSTER_SIGNED_OFF` |
| `TicketWaitlist` | `isGuestTicket` / `order` | default `false` / required JSON (order-create shape) |
| | unique | partial unique `(dinnerEventId, inhabitantId) WHERE isGuestTicket = 0` via `partialIndexes` |
| `Expense` | `type` / `dinnerEventId` / `paidByUserId` / `userSnapshot` / `amount`, `description` | default `REGULAR` / nullable, SET NULL (REGULAR set, ADHOC null) / nullable, SET NULL (null = the kitchen paid) / required JSON / required |
| enums | `DutyAuditAction`, `DutyOrigin`, `LedgerEntryType` | as signed |

**Columns on existing tables** — written as `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT` in the Prisma source (no
table rebuild on D1):

| Column | Decision | Convergent data line |
|---|---|---|
| `Transaction.type` | `LedgerEntryType`, required, default `REGULAR` | — (the default covers every existing row) |
| `Transaction.description` | nullable | — |
| `DinnerEvent.totalCost` | kept, `/// @deprecated` — the dinner's cost becomes `SUM(Expense.amount)` in the chef-spending package; the column is dropped by `../chores-0.9.1.md` next release | one REGULAR `Expense` per dinner with `totalCost > 0`: `amount = totalCost`, `description = 'Indkøb'`, `paidByUserId` null, `userSnapshot` = the SYSTEM snapshot (`{"id":null,"email":"SYSTEM"}`, one constant in the validation layer, asserted equal to the migration's literal); `WHERE NOT EXISTS` a REGULAR row for the dinner |
| `Order` partial unique `(inhabitantId, dinnerEventId) WHERE isGuestTicket = 0` | via `partialIndexes` (decision 2026-10-07, reverses the earlier drop) | none — zero duplicate regular orders verified in every environment; the index creation is the proof |

**Migration notes.** One migration, `0017_roster` (`make d1-create-migration name=roster`), with these rewrites in the Prisma
source before the flattened copy is regenerated (`.claude/skills/prisma/SKILL.md`):
- `Transaction.type` — Prisma emits a table rebuild for a required column; rewritten to
  `ALTER TABLE "Transaction" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'REGULAR'`.
- New tables (`DinnerDutyTemplate`, `JokerSlot`, `DinnerDuty`, `DutyHistory`, `TicketWaitlist`, `Expense`), the
  nullable `Transaction.description` and the two partial unique indexes
  (`CREATE UNIQUE INDEX … WHERE "isGuestTicket" = false`) are taken as Prisma emits them.
- Data line, convergent: the `totalCost` → `Expense` mapping (table above). No snapshot rewrite on `Transaction`.
- `tests/component/architecture/migrations.unit.spec.ts` keeps rejecting `DROP TABLE`.

**Migration safety.** The migration is additive: new tables, columns with a default or nullable, indexes, inserts
into a new table. The code deployed at the time of the apply keeps working on the migrated schema — it selects
columns that still exist and never touches the new tables; the one new behaviour it can meet is the `Order` partial
unique index refusing a duplicate regular order (zero exist; a race that used to create one now fails and the
idempotent job retries, ADR-015). The new code needs the migrated schema (`Transaction.type`), so the order per
environment is migrate, then deploy. Proof, in order:
1. local: `make d1-copy-dev-to-local` → `make d1-verify-local` (baseline) → `make d1-migrate-local` (the target
   fails on a changed child-without-parent count) → `make d1-verify-local` → `npm run dev` → api + ui e2e suites green
   (one runner at a time) → the chef, bookings and admin economy pages by hand. Database steps ✅ 2026-10-08 (one
   `Expense` per dinner with a cost; parent-link counts unchanged); api suites ✅ in CI at 541fc01
   (the framelding import test skipped, see round 8); the two failures seen only on the local dev copy (unfiltered
   dinner-event list, live edit of the active season) pass in CI; the ui suite and the page walk follow.
2. dev, old code first: deploy `main` to dev again so dev runs the released code → D1 Time Travel bookmark
   (`wrangler d1 time-travel info`; rollback = `make d1-time-travel-dev`) → `make d1-migrate-dev` → the released code
   still serves dev (login, dinner page, bookings) → `make deploy-dev` with the branch → smoke suite against dev → logs.
   Database steps ✅ 2026-10-08 (dev ran the code of main; one `Expense` per dinner with a cost; parent-link counts
   unchanged); the branch deploy and the smoke suite follow.
3. prod: bookmark → `make d1-migrate-prod` → `make deploy-prod` → smoke suite, outside the cron windows (01:00 and
   02:00 UTC daily, 03:00 UTC on the 18th). Database steps ✅ 2026-10-08 (one `Expense` per dinner with a cost, equal
   to it; parent-link counts unchanged); the deploy and the smoke suite follow.
4. next release: `../chores-0.9.1.md` drops the column once every environment runs the computed version.

**Sequence.** schema ✅ + config ✅ + majors ✅ → `make d1-prisma` + `pre:all` + unit (gate) → user:
`make d1-create-migration name=roster` → the rewrites and the data line in the Prisma source, flattened copy
regenerated by the target → user: `make d1-migrate-local` → suites + `make d1-verify-local` clean. Fixtures and spec
literals carry the new columns; validation composables re-export the new enums.

## Chef spending

Expenses are EXPENSE rows in the transaction ledger, excluded from invoicing (decision 2026-10-05) —
`feature-proposal-adhoc-admin-billing.md` § Expense type. Surfaces:

**Mockup — Madbestilling and the Budget pane on the chef card** ✅ signed 2026-10-11, revised and re-signed the same day; the unfolded pane, the editor table and Billetændringer revised and ✅ signed 2026-10-12 (the three things the chef edits sit together as section rows; the lines editor behind Rediger madbestilling; status and money read-only below; one chevron on Budget)

Folded (default):

```
┌ ChefMenuCard (edit) ──────────────────────────────────────────────────┐
│ MENU        Spaghetti Carbonara        [Rediger menu] [Publicer]      │
│ (allergy) ALLERGENER  12 kuverter · gluten 3     [Rediger allergener]  │
│ (cart) MADBESTILLING  1.310 / 1.638 kr        [Rediger madbestilling]  │  <- "Madbestilling mangler" without lines
├───────────────────────────────────────────────────────────────────────┤
│ PLANLAGT  ANNONCERET  BOOKING  INDKØB  AFHOLDT   (stepper, deadlines)   │
│                                                                       │
│ Budget                                                            [>] │
│ ┌ (money) INDTÆGTER ──┐ ┌ (cart) RÅDIGHEDSBELØB ─────────┐ ┌ (house) KØKKENBIDRAG ─┐ │
│ │ 1.875 kr            │ │ 1.425 / 1.781 kr                │ │ 75 / 94 kr            │ │
│ │                     │ │ ex     inkl. moms               │ │ ex   inkl. moms       │ │
│ │ 45 kuverter         │ │ Brugt        1.310 / 1.638 kr   │ │ 5% af indtægter       │ │
│ │                     │ │ Tilbage  +115 /  +143 kr (check) │ │                 │ │
│ └─────────────────────┘ └─────────────────────────────────┘ └───────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

Unfolded Budget (the chevron turns; the boxes stay, this opens under them). The ticket table carries its sums as its own bottom rows and ends at Rådighedsbeløb; this dinner is one spending fragment in the team table's shape, with its receipts as sub-rows; the team's round follows in the same shape:

```
│  Billettype   Antal     Stk pris     Total                            │
│  Voksen          30        50 kr   1.500 kr                           │
│  Barn            15        25 kr     375 kr                           │
│  ───────────────────────────────────────────────────────────────────  │
│  Indtægter                         1.875 kr                           │
│  Køkkenbidrag (5%)            -75 /   -94 kr                          │
│  ───────────────────────────────────────────────────────────────────  │
│  Rådighedsbeløb             1.425 / 1.781 kr                          │
│                                                                       │
│                                                       ex / inkl. moms │
│  Dato   Middag            Rådighedsbeløb      Brugt         Tilbage   │
│  14/04  (arrow) Risotto    1.498 / 1.873 kr  1.310 / 1.638 kr  +188 / +235 kr (check) │
│  12/04     Anna H.                         1.012 / 1.265 kr           │
│  14/04     Bo K.                             298 /   373 kr           │
│                                                                       │
│  Hele Madhold 2, for perioden 12/04–15/04             ex / inkl. moms │
│  Dato   Middag            Rådighedsbeløb      Brugt         Tilbage   │
│  12/04  Lasagne          1.425 / 1.781 kr  1.540 / 1.925 kr  -115 / -144 kr (overdraft) │
│  14/04  (arrow) Risotto    1.498 / 1.873 kr  1.310 / 1.638 kr  +188 / +235 kr (check)     │
│  15/04  Pasta                0 /     0 kr      0 /     0 kr      0 /     0 kr (waiting)   │
│  Hele Madhold 2          2.923 / 3.654 kr  2.850 / 3.563 kr   +73 /  +91 kr (check)     │
│                                                                       │
│  (history) Se billetændringer                                    [>]  │
```

An arrow before the menu title marks the dinner on view; the Budget shows no dinner status. A receipt sub-row carries its date, the bestiller in the Middag column in the muted ink, and its amount under Brugt. Without receipts the dinner row is followed by one sub-row reading "Madbestilling mangler". A dinner without tickets shows the timeline's waiting glyph (the "om n dage" badge's) in Tilbage instead of a check. A lone dinner shows the first fragment only; the Hele Madhold table appears when the team cooks consecutive days.

Madbestilling open, the editor: the same one table component with the entry row above it and slet in its last column; its sums are the table's bottom rows:

```
│ Hvad kostede indkøbene?                                         [Luk]    │
│ [ beløb        ] [ Ex moms v ] [Tilføj]                                  │
│  Dato   Bestiller                                   ex / inkl. moms      │
│  12/04  Anna H.                                   1.012 / 1.265 kr [slet]│
│  14/04  Bo K.                                       298 /   373 kr [slet]│
│  ──────────────────────────────────────────────────────────────────────  │
│         Rådighedsbeløb                            1.425 / 1.781 kr       │
│         Brugt                                     1.310 / 1.638 kr       │
│  ──────────────────────────────────────────────────────────────────────  │
│         Tilbage                                    +115 /  +143 kr (check) │
│                                                                          │
│  ──────────────────────────────────────────────────────────────────────  │
│         Hele Madhold 2, for perioden 12/04–14/04                         │
│         Rådighedsbeløb                            4.435 / 5.544 kr       │
│         Brugt                                     4.245 / 5.307 kr       │
│  ──────────────────────────────────────────────────────────────────────  │
│         Tilbage                                    +190 /  +237 kr (check) │
```

Se billetændringer opened after Framelding closed (the same chevron as Budget with the history glyph in its title, folded by default; the changes since the booking deadline, newest first; the button loads the rest once):

```
│  (history) Se billetændringer                                                 [v] │
│  Dato         Husstand  Ændring              Billetter · kuverter   Indtægter │
│  09/04 19:10  S_14      Købt fra anden  +1 B   29 V 11 B 3 b · 34,5   1.725 kr │
│  09/04 17:30  S_22      Afmeldt         -1 B   29 V 11 B 3 b · 34     1.725 kr │
│  ── Framelding lukker · 09/04 12:00 ───────────────────────────────────────── │
│  [Vis fuld historik]                                                          │
```

Opened before Framelding closes: the newest change, in the same columns and words, and the rest behind the button:

```
│  Dato         Husstand  Ændring                          Billetter · kuverter   Indtægter │
│  05/04 02:00  System    Automatisk bestilling  +28 V +11 B +3 b   28 V 11 B 3 b · 33,5   1.675 kr │
│  ── Framelding lukker · 09/04 12:00 ───────────────────────────────────────────────── │
│  [Vis fuld historik]                                                                  │
```

Vis fuld historik shows every row newest first, no line, no button.

- Indtægter and the ticket prices are what the households pay: plain kr, no VAT split; Billetændringer the same.
- Units: every money cell the chef reads shows the ex moms figure in the row's weight and the inkl. moms half in fine print after a slash; the unit words appear once per block, in the boxes as a fine-print line under the figure. Lines are stored gross; the select sets the unit of the typed amount.
- Bestiller is the reporting user, named with `formatNameWithInitials`; the note is written by the server as the dinner's date and menu title; the body is `{amount}`.
- Tilbage is what is left. With no Rådighedsbeløb yet, a dinner without tickets, it carries the timeline's waiting glyph (the "om n dage" badge's) and no check. At or above zero it reads in the card's ink with its plus and a check icon in the success colour; below zero in red with its minus and an exclamation circle in the error colour. The helping numbers above the entry row give this dinner's and the team round's figure.
- One spending table component, Dato, Middag, Rådighedsbeløb, Brugt, Tilbage, renders two fragments: this dinner as one row with its receipts as sub-rows, and, when the team cooks consecutive calendar days around it, the round headed by "Hele <madhold>, for perioden <first>–<last>" from `cookingRoundWords` with the team's total row. The ticket table ends at Rådighedsbeløb in its own bottom rows. The page computes it from the team's dinners, the bookings store loads their orders and `calculateBudget` gives each rådighedsbeløb.
- Billettype names the ticket (`useTicket`), not the enum.
- Se billetændringer sits last in the pane, behind the Budget pane's own chevron kind with the history glyph in its title, folded by default, and only while the dinner has tickets. Its window starts when Framelding closes, the booking deadline from the season's deadlines, and the line reads "Framelding lukker · <moment>". Before that moment it shows the newest change row, in the same columns and words as the full history, with the rest behind "Vis fuld historik". Moments compare through the date utilities, never by hand.
- Tickets read as count and letter, V, B, b, never icons; a change as its signed count and letter.
- Consecutive scaffold rows with no user change between them are one "Automatisk bestilling" line with the summed tickets, however many nights wrote them.
- Billetændringer: one row per order event of the dinner from `OrderHistory`, newest first: the household's short name (System for the scaffold), the event word the order history uses, the ticket moved as the ticket chip with its sign, the composition after the change as chips with counts and the kuverter, and Indtægter after the change in kr. After the booking deadline a released ticket stays paid, so Afmeldt and Købt fra anden move kuverter and the payer, not Indtægter. `GET /api/chef/dinner/[id]/order-history?since=` hands the rows from the menu deadline with the composition replayed server-side; the button fetches the rest.
- Madbestilling is the timeline's word; the row leads with the cart glyph like Allergener leads with its glyph. Folded, chef and team members read the total alone, or "Madbestilling mangler"; the budget math lives in the RÅDIGHEDSBELØB box. The chef's Rediger madbestilling opens the editor in place, headed "Hvad kostede indkøbene?" with Luk; the helping numbers Rådighedsbeløb, Brugt, Tilbage and the round sit above the entry row and follow the lines. A line saves on Tilføj and goes on slet; there is no draft, so no Gem and no Annuller.
- The editor leads with the action: the entry row, then the lines table, then the sums as the table's bottom rows; a rule sits above every result row (Rådighedsbeløb under the lines, Tilbage, the ticket table's Indtægter and Rådighedsbeløb; the box keeps its rows bare) and a gap with a rule sets the whole team's block apart; the folded total carries the unit words.
- Every amount sits in fixed columns with an icon slot that is always there, so kr lines up down a column with and without the check or exclamation icon, in the hint, the lines, the box and the round table.
- Every table is a UTable on the table token, the lines table of the editor included; a header row over rows is a table even when drawn with divs.
- The season status glyphs are one set, `STATUS_GLYPHS`, bound by the season status display; dinner rows carry no status.
- No figure is computed in a component: sums, what is left, the waiting state and the receipt sub-rows come from the composables (`useOrder` spending helpers, `useBookingUi` for the table rows), components bind them.
- View mode shows the folded row without its button.

**Mockup — season view (opens from [Se sæsontrend]; same component serves admin economy)** ✅ signed 2026-10-05

```
Sæsonstatus — Anna, 2026/1
  Budget i alt: 4.435 kr   Brugt: 2.935 kr   Balance: +2 kr   [I BALANCE]

  kr (akkumuleret)      graf: budget-linje vs forbrugs-linje over sæsonens
                        middage; grøn under budget / rød over

  Dato        Middag            Budget(ex)   Brugt      Balance
  15/04/2026  Lasagne           1.425 kr     1.540 kr   -115 kr
  22/04/2026  Boller i karry    1.512 kr     1.395 kr   +117 kr
  06/05/2026  Risotto (næste)   1.498 kr     —          —
  Sæson                         4.435 kr     2.935 kr   +2 kr

  Du kan bruge 1.500 kr til Risotto 06/05  (budget 1.498 kr + balance +2 kr)
```

**Mockup — admin economy "Forbrug" (big overview)** ✅ signed 2026-10-06 — months as rows, a month opens to its
dinners (the admin-economy drill-down pattern); same `SeasonBudgetOverview` component with the month table as the
admin layer

```
AdminEconomy — Forbrug
  Scope: [Alle chefkokke v]  (vælg chefkok | Madbudget)      Sæson: [2026/1 v]

  Budget i alt: 32.100 kr   Brugt: 21.362 kr   Balance: +38 kr   [I BALANCE]
  [graf: akkumuleret budget vs forbrug — grøn under / rød over]

  Måned        Middage   Budget(ex)   Brugt       Balance
  > august     8         9.500 kr     9.102 kr    +398 kr
  v september  10        11.900 kr    12.260 kr   -360 kr
      Dato     Middag        Chefkok   Budget(ex)   Brugt      Balance
      02/09    Lasagne       Anna      1.425 kr     1.540 kr   -115 kr
      09/09    Risotto       Bo        1.498 kr     1.395 kr   +103 kr
  > oktober    9         10.700 kr    —            —
  I alt        27        32.100 kr    21.362 kr    +38 kr
```

Grouping is a component parameter (`day` | `month`), not scope-wired: the mount decides the data points. The
chef's own view and the single-chef scope pass `day` (flat table, dinners as graph points); the aggregate
scopes pass `month` (month rows, drill-down to dinners). Madbudget scope: the graph plots køkkenbidrag-accrual vs
basisvarer-spend and the month drill-down lists basisvarer purchases (dato, note, beløb). Basisvarer entry lives
here, admin-only.

## Kitchen allergy line

**Problem.** A chef opening the kitchen stats sees the diners per dining mode and, in the panel head, the names
whose allergies match tonight's menu. The chefs (meeting 2026-10-08) want the count of allergic diners per panel at a
glance and, on opening a panel, which diners carry which allergies.

**Solution.** The panel head carries the allergy glyph and the number of diners in that mode with a registered
allergy counted in kuverter with the panel's portion weights, nothing else. The expanded list opens with the overview line, the same glyph and number followed by each
menu allergen as a compact `AllergyTypeDisplay` with its name and its kuverter, in menu order; every diner with an allergy carries one compact
`AllergyTypeDisplay` per allergy beside the name: the type's own icon or emoji and its name. A household row centres
its segments on one line. The panel
head's per-name flags go. `useAllergy().computeAffectedDiners` counts all registered allergies of the diners with
the menu filter optional, so the chefs' existing menu-match reads keep their behaviour.
The kitchen panels and the chef's allergen line count the menu's allergens only, through one `computeAllergenOverview`,
so the panel heads add up to the chef's total (signed 2026-10-09). A diner's allergy counts once however many rows
carry it, and a guest ticket counts the allergies named on the ticket, never its booker's.

**Mockup** ✅ signed 2026-10-08 (desktop; the phone wraps the overview line after the total)

```
Panel head, collapsed
| SPISESAL - 33% (v)                                  |
|  35 kuv. · Voksen: 25 | Barn: 8 | Baby: 2 # 35      |
|  (allergy) 3,5 kuv.                                 |

Expanded
|  (allergy) 3,5 kuv. | (wheat) Gluten · 1 | (milk) Mælk · 2,5         |   <- first line, the overview, kuverter
|  S_31 · 2 voksne, 1 barn · Anna (wheat) Gluten (milk) Mælk, Bo, Emil |
|  N_12 · 1 voksen · Maria (milk) Mælk                                 |
|  V_04 · 2 voksne · Per, Lise (wheat) Gluten                          |
```

A panel with no allergic diner shows no line and no allergy types.

**TDD.** `useAllergy.unit.spec`: a `describe.each` over orders with and without the menu filter (total, breakdown
order in kuverter, diners with their allergens). `KitchenPreparation.nuxt.spec`: a mode with an adult and a child allergic renders the head
1,5 kuv., the overview line with one compact `AllergyTypeDisplay` per menu allergen, and one compact `AllergyTypeDisplay` with
its name per diner allergy; a mode without renders neither.

**Affected.** `useAllergy.ts`, `KitchenPreparation.vue` (header mockup), `docs/adr-compliance-frontend.md`.

**Stats bar ink** (option C signed 2026-10-10). The stats bar's label and ticket breakdown bind
`COMPONENTS.kitchen.totalsSecondary`: `TEXT.mocha[800]` (`text-amber-800`) on the bar's `BG.mocha[50]`, 8.37:1 in light and
dark mode. The contrast gate measures the pair on its own fill.

**No-allergy ink.** The sun of the no-allergy state binds `COMPONENTS.allergyTypeDisplay.noneAvatarUi`: the white disc
carries `TEXT.gray[500]` in light and gray-800 in dark, and the icon inherits it. 5.59:1 light and 14.67:1 dark in Glade
farver and Til farveblinde, 8.52:1 and 14.67:1 in Høj kontrast. A type's own icon or emoji keeps its ink.

## Chef allergen line

**Problem.** Under the chef portrait the allergen section shows the menu's allergens as chips and counts everyone
in the community with those allergies; the chef needs the diners of this dinner, in kuverter, split on the menu's
allergens. In the edit face the detail panel is titled "Statistik" with a chart glyph.

**Solution.** The view line is the kitchen's overview on this dinner's diners filtered by the menu's allergens:
total kuverter, then every menu allergen as a compact `AllergyTypeDisplay` with its name and its kuverter, a zero included;
"ingen" when the menu names no allergen. The edit face's allergen table counts this dinner's kuverter per allergen
and its detail panel becomes the allergy panel: `ICONS.allergy` large, the title "Allergier blandt gæsterne", the
overview line, and the names, each allergy a compact `AllergyTypeDisplay` with its name, behind a flip-open "Hvem". The community-wide count and avatars go.
`useAllergy().computeAffectedDiners` with the menu filter supplies both.
Both places count the menu's allergens only, the kitchen panels splitting the chef's total by dining mode (signed
2026-10-09). A diner's allergy counts once however many rows carry it, and a guest ticket counts the allergies named on
the ticket, never its booker's.

**Mockup** ✅ signed 2026-10-09 (desktop; the phone wraps the line after the total)

```
View, under the chef portrait
| (allergy) ALLERGENER   3,5 kuv. | (milk) Mælk · 2,5 | (nuts) Nødder · 1 | (wheat) Gluten · 0   [Rediger allergener] |
| (allergy) ALLERGENER   ingen                                                                  [Rediger allergener] |

Edit, the allergen selector
| ☑ (milk)  Mælk & Smør     2,5  |  (allergy) Allergier blandt gæsterne                        |
| ☑ (nuts)  Nødder           1   |  (allergy) 3,5 kuv. | (milk) Mælk · 2,5 | (nuts) Nødder · 1 |
| ☐ (wheat) Gluten           0   |  [v] Hvem                                                   |
|                                |      Dorthe (milk) Mælk, Skraaningen (milk) Mælk,           |
|                                |      Martin (nuts) Nødder                                   |
```

**TDD.** `ChefMenuCard.nuxt.spec`: the line shows the total and each menu allergen as its compact `AllergyTypeDisplay`
with its kuverter, "ingen" with no allergens. `AllergenMultiSelector.nuxt.spec`: counts per allergen from the diners; the panel's title and glyph; the
names behind the toggle.

**Affected.** `ChefMenuCard.vue`, `AllergenMultiSelector.vue` (header mockups), `docs/adr-compliance-frontend.md`.

**Compact title placeholder ink.** A dinner without a menu title reads in `COMPONENTS.chefMenuCard.compactTitlePlaceholder`,
which carries `TEXT.muted` on the compact face (the page surface, selected or not): 5.59:1 light and 5.45:1 dark in Glade
farver, 5.59:1 and 5.51:1 in Til farveblinde, 8.52:1 and 8.43:1 in Høj kontrast.

## Chef calendar header

**Problem.** `/chef` renders two footers and logs 18 hydration warnings.

**Root cause.** `ChefCalendarDisplay` rendered the Agenda/Kalender `UTabs` in the `UAccordion` `#leading` slot, inside the
accordion trigger `<button>`. The HTML parser closes the outer button at the first tab button, the hydrated DOM differs
from the Vue tree, and the repair inserts a second footer outside the Nuxt root.

**Solution.** The header is one row (`COMPONENTS.chefCalendar.header`): the tabs on the left, a chevron `UButton` bound
to `BUTTONS.flipOpen(accordionOpen)` with `aria-expanded` on the right. The agenda or calendar sits in a `UCollapsible`
(`COMPONENTS.collapsible.chefCalendar`). The component keeps its contract: `accordionOpen` in, `update:accordion-open`
from the chevron, `tab-click` from a tab; `/chef` keeps the `view` query parameter (`mode:open`).

**Mockup** ✅ signed 2026-10-10 (option B): `ChefCalendarDisplay.vue` header.

**TDD.** `ChefCalendarDisplay.nuxt.spec`: a tab click emits `tab-click` with its mode, the chevron emits the toggled open
state and carries `aria-expanded`, the content renders when open and is absent when closed, the header holds three buttons
with no button inside another. `Chef.e2e.spec`: the chef page hydrates without a warning and renders one `footer`.

**Affected.** `ChefCalendarDisplay.vue` (header mockup), `useTheSlopeDesignSystem.ts` (`COMPONENTS.collapsible`,
`COMPONENTS.chefCalendar`, `COMPONENTS.table.agendaUi`, `ICONS.agenda`), `ChefMenuCard.vue` and `RoleAssignment.vue`
(`COMPONENTS.collapsible.belowTrigger`), `designSystemUsage.unit.spec.ts`, `docs/ui.md`, `docs/adr-compliance-frontend.md`.

## Ticket allergies

**Problem.** A booked inhabitant's allergies are on their profile and on the chef's allergen line, and the booking
form shows nothing on the ticket: the household detail loads each inhabitant's allergies (`fetchHousehold`) and
`HouseholdDetailSchema` parses the inhabitants without them; the ticket card and the form read `provenanceAllergies`,
a field no path writes (`../chores-0.9.1.md` § Ticket allergies on the order holds the guest and swap report).

**Solution.** The household detail's inhabitants carry `allergies` with their `allergyType`, through the deserializer
and the schema. A booked inhabitant's ticket card shows `ICONS.allergy` in row 1 when the profile has an allergy; the
expanded row opens with the same glyph followed by one compact `AllergyTypeDisplay` per allergy. The names badge on
the card and the badge in the name cell go. Guest and swapped tickets read the stored list in 0.9.1 through the same
prop.

**Mockup** ✅ signed 2026-10-11: `DinnerTicket.vue` header.

**TDD.** `Dinner.e2e.spec`: GIVEN an inhabitant with an allergy WHEN their ticket is booked THEN the card shows the
glyph and the expanded row names the type. `DinnerTicket.nuxt.spec` (new): glyph with allergies, none without, no
names on the card. `DinnerBookingForm.nuxt.spec`: one `AllergyTypeDisplay` per allergy in the expanded row, no badge
in the name cell. `useCoreValidation.unit.spec`: the household detail keeps the inhabitants' allergies.

**Affected.** `useCoreValidation.ts` (household detail inhabitants and their deserializer), `DinnerTicket.vue`
(header mockup, tokens), `DinnerBookingForm.vue` (expanded row, name cell, touched classes),
`useTheSlopeDesignSystem.ts` (ticket allergy tokens), `docs/ui.md`, `docs/adr-compliance-frontend.md`.

## Decisions

**2026-10-05** (questions round 1)
- One Prisma migration package for the whole push; CI reporting added as a package; t-shirt sizing; the push earns v0.9.
- Joker: per-dinner volunteering; any inhabitant; vacancy surfaces as a "missing" on the dinner; team-card and big
  overview (split on teams / on people) for the admin; per-member shift counts (chefkok / fast tjans / joker) in the
  team card; `/chef` is the member planning surface.
- Volunteering today writes season membership (`CookingTeamAssignment`) — the designed way to live without a roster.
  The roster replaces it; the shipped rows get a one-time data separation the user reviews and applies before ship.
- Waitlist: auto-assign; the queue is authoritative, idempotent, safe to replay; one inhabitant one ticket; chef
  releases extra portions, resolver fits queue entries by portion weight in strict FIFO; all four notifications plus
  the chef buildup threshold.
- Chef spending is the EXPENSE transaction type in the adhoc design, answering "how much can I spend": dinner
  expenses balance per chef across the season (overspending a single dinner is fine when the season balances);
  basisvarer expenses are dinner-less and track against the køkkenbidrag pool; payment happens automatically in the
  bank — the feature is tracking only, excluded from invoicing, no PBS flow.
- Framework corner first; research spike before any major upgrade. e2e ui keeps `continue-on-error`, failures red.
- CI reporting is per-tool (correction 2026-10-05): vitest 5's built-in GitHub summary reports the unit run (2026-10-07); `make test-report` is
  Playwright-only, one call per suite (api, ui, smoke) — no cross-format normalization.

**2026-10-05** (round 2, after the spike)
- Store fetcher factory approved, paired with the store alignment sweep: every store converges on the factory in
  the same package (the misaligned fetch handling across stores, release-plan I2).
- No experimental framework features unless avoiding one costs heavy workarounds — named layout slots stay out;
  `enabled` is stable and in.
- Framework pair upgrade approved, runs first. Prisma + zod ride the Prisma bundle pinned at 7.10 + 4.6 — RC
  versions are out of discussion (npm `latest` of prisma is an 8-RC).
- No dependency we don't actively import: `@vueuse/core` (zero imports) leaves package.json; the package that
  first imports it (the `isMd` work) adds it back.
- Adhoc + EXPENSE ship in this release, sequenced last among the feature packages (not highest priority).
- All prisma, zod and migration work happens in one go: the Prisma bundle carries the majors, the regen and every
  new model in a single package.
- Waitlist is strict FIFO: no overtaking — a smaller entry behind a too-big head waits.
- **OPEN — page composition:** decided from the spike's research results, presented with findings, recommendations
  and options per topic (two-pane frame, tab scaffolding, `isMd` source). Direction stated 2026-10-05: a layout
  already exists and the hope is the new Nuxt reduces complexity — the spike verifies whether named layout slots
  and `useBreakpoints`/`ssrWidth` carry that.
- **OPEN — store fetcher factory API:** drafted in `feature-proposal-framework-adoption.md`; signoff waits for the
  spike's Nuxt-roadmap evidence that the underlying option surface stays — building on a surface Nuxt is about to
  change is premature (user, 2026-10-05).

**2026-10-05** (round 3, `/chef` UX iteration — all signed, mockups in the linked docs)
- CTC drives the roster: dinner face leads with "who comes today" (vacancies, swaps, joker status), season face
  (admin teams) leads with the regular team + jokertjanser + shift counts + view-only game-plan drill-down; which
  face leads follows the dinner context. The Flytter badge is dropped from `/chef`.
- A template row IS one seat — capacity is modelled with rows, counts in the UI are derived; no `requiredCount`.
  Slot times/tasks are templates, edited in the team's template editor, not on the daily roster.
- Sign-off is derived: all seats filled → auto-signed (system actor); short → "MANGLER n" + chef's
  [Godkend alligevel] (chef actor). Members self-serve their own rows; duty-level admin bypass parked.
- Release-portions is demand-driven with a permanent home: entry in ChefMenuCard's [Flere]-menu + a CTA alert under
  the action row while the queue is non-empty; both open one form prefilled with the queue's portion need.
- Queue/for-sale status is the kitchen stats panel's alternating fourth box (TIL SALG n / VENTELISTE n — never both).
- The dinner economy is one collapsed Budget pane (3 boxes + ticket table + Forbrug entry + [Se sæsontrend] button
  unfolding the season view). Broken window fixed with the package: the budget's ticket table renders raw enum
  (`ADULT`/`CHILD`, `DinnerBudget.vue:171`) — Danish names via `useTicket`.

**2026-10-06** (round 4, UX)
- Waitlist member faces: queued is a badge on Ingen, never a mode — `ICONS.waitlist` (hourglass) through the
  `useBookingUi` badge path, "#n i køen"; assignment defaults the order to Spiser med, changeable afterwards.
- Admin economy Forbrug: month rows with dinner drill-down, scope switcher (alle chefkokke / én chefkok /
  Madbudget); basisvarer entry is admin-only, in that section. `SeasonBudgetOverview` takes `grouping: day | month`.
- Vacancy big overview: per team, chronological, origin on each hole (joker note / who released); no person
  linkage — no `coversInhabitantId`. Calendar gap markers as DS tokens, ink-coloured: chef hat = missing chef,
  joker hat = unfilled joker seat, dot = unfilled regular seat.
- PRF spike complete; S5 re-login parked out of 0.9 — the lightweight-vs-full comparison by platform, the
  hypotheses and the spike findings live in `../feature-proposal-relogin-faceid.md`; `WebAuthnCredential` leaves
  the bundle; the mobile-native-feel sprint doc is archived to pointers.

**2026-10-07** (round 5, Prisma bundle fine-tuning)
- The bundle is the ux session's with the user (model set + implementation); the majors install and the
  orchestrator's store packages never run concurrently — the bundle starts after the factory package lands and is
  committed.
- `TicketWaitlist` carries an unplaced order: the order-create shape as JSON (`order`), keyed by dinner, inhabitant
  and `isGuestTicket`; a guest entry sits on the booking member's `inhabitantId`. Assignment places the order through
  `createOrders` and deletes the entry; the chef's release is an action, nothing about supply is stored on the dinner;
  portion weights stay the config mapping (no `portionSize` column).
- Partial unique indexes via Prisma 7.4's `partialIndexes` preview: one regular waitlist entry per person per
  dinner, and one regular order per person per dinner (reverses the 2026-10-05 drop; zero duplicates verified, no
  backfill).
- The zod-4 surface includes the error utilities outside the composables (`validtation.ts`,
  `useDateRangeValidation.ts`, `eventHandlerHelper.ts`, the two sender sites).

**2026-10-08** (round 6, ledger)
- Ledger and expenses are modelled symmetrically: one `LedgerEntryType { REGULAR, ADHOC }` on `Transaction` and
  `Expense`; a REGULAR entry hangs off its source (order, dinner), an ADHOC entry stands alone with a description.
- Expenses are their own table, a list per dinner (REGULAR) plus basisvarer rows (ADHOC); the payee is a `User`
  (`paidByUserId`, SET NULL) with a `userSnapshot`, the reporting user is the payer; the reimbursement stream
  reads `User.expenses`.
- `DinnerEvent.totalCost` is kept and deprecated; the dinner's cost is the sum of its expense rows, GROCERIES_DONE
  derives from them, and `../chores-0.9.1.md` drops the column in the release after 0.9.
- An adhoc charge's household lives in `orderSnapshot`, as an order's does; no `householdId` column, no snapshot
  rewrite.
- `strictUndefinedChecks` stays a preview feature in 7 (the generated types carry `Skip` only with the flag); the
  zod generator emits enums only (`createInputTypes`/`createModelTypes` false), which brought the root typecheck back
  under the default heap.

**2026-10-08** (round 7, migration)
- B6 `Order.orderSnapshot` is parked for the release after 0.9 (`../chores-0.9.1.md` § Order snapshot); the 0.9 schema set is
  closed with the six new tables, the two `Transaction` columns and the two partial unique indexes.
- Migration `0017_roster`: the `Transaction` rebuild Prisma emitted is rewritten to `ALTER TABLE … ADD COLUMN` (the
  existing `orderId` and `invoiceId` indexes stay); the `totalCost` → `Expense` data line is appended; the flattened
  copy is regenerated and identical; `migrations.unit.spec.ts` passes.
- Local rehearsal on a dev copy: `make d1-copy-dev-to-local` → `make d1-check-order-duplicates-local` (`[]`) →
  `make d1-migrate-local` (parent-link counts unchanged) → one `Expense` per dinner with a cost, equal to it.
- dev and prod migrated 2026-10-08 with the old code serving: one `Expense` per dinner with a cost, equal to it;
  parent-link counts unchanged in both. The temporary `d1-check-order-duplicates-*` targets leave
  the Makefile.

**2026-10-08** (round 8, order uniqueness in the tests)
- A second regular order for an inhabitant on a dinner answers 409 Conflict: Prisma's unique violation is mapped in
  `eventHandlerHelper` beside the not-found mapping, and ADR-002's code table carries 409. No upsert; the UI sends the
  order id for updates (ADR-016).
- Tests rewritten to the rule: `order.e2e.spec.ts` cleans up after each test and asserts 409 for a duplicate and for
  two regular items in one batch, 201 for regular plus guest; `dinnerEvent.e2e.spec.ts` asserts one 201 and one 409
  for two parallel creates; `household.e2e.spec.ts` asserts 409 for a duplicate pbsId; `season.e2e.spec.ts` puts its
  holiday on the first cooking day (the holiday fell on a weekend on some weekdays, which failed main's pipeline the
  same day).
- Every schema change is followed by a review of the tests and the validation comments that encode the old rule,
  before the suites run.
- The framelding billing import books every ticket on the first inhabitant and now answers 409; its e2e test is skipped
  and the import in the export format is the third chore in `../chores-0.9.1.md`.
- Local Playwright runs use three workers (CI runs one): at the default of half the cores the local D1 proxy drops
  requests, seen as `fetch failed` 500s and a data-mapper error on the dev copy; both vanish at one worker and in CI.

**2026-10-08** (round 9, ui suite on the local dev copy)
- Dependency policy: `.npmrc` saves tilde ranges and every `package.json` range is `~<locked version>`; a minor or
  major moves only through an explicit install. Nuxt stays on 4.6.0 (an unasked move from 4.5.2 that a regenerated
  lockfile let through); local Playwright runs use three workers.
- Two causes behind the stable ui failures, both proven in the browser against the running app:
  `useQueryParam` instances on one page navigated from private snapshots of the query and the last writer dropped
  the others' keys (URL writes now queue on the Nuxt app, `_urlWrites`); and `CookingTeamCard` seeded its edit
  field from a computed at setup, which the server rendered before the team resolved while the client hydrated the
  real name, so hydration replaced the field under the user's typing (the draft now starts on focus). The same
  server-rendered-but-unhydrated window is why interacting e2e tests wait for hydration before typing, and URL
  assertions poll instead of reading once.
- One URL writer for the app (`useUrlQueryWriter`, ADR-006 § URL Writes): the writes of a tick batch per app instance,
  apply in priority order and land in one navigation; `useQueryParam`, `useEntityFormManager`, `useSeasonSelector` and
  `useTabNavigation` write through it, an explicit write outranks a parameter's auto-sync. The ui specs that interact
  navigate through `gotoHydrated` (docs/testing.md Rule 3a), since the server renders the controls 9 to 15 seconds
  before the handlers attach on the local dev server. Two e2e tests waited for a household response the server render
  now answers; they wait for the rendered page instead. Targeted proof 2026-10-09 (AdminTeams, household, SeasonSelector,
  HouseholdCard, HouseholdMembers, HouseholdAllergies, Dinner, Chef): every case outside AdminTeams passes; the three
  AdminTeams cases (rename, member finder, joker slot) sit on the roster package's in-flight AdminTeams and store work.
- Open: the season dropdown cases under load, the holiday list editor's double-matched locator, and the full-suite
  run once the roster package has landed.
**2026-10-11** (ticket allergies)
- A ticket carries a stored allergy list or follows its holder's live profile: own tickets live, guest tickets the ids
  chosen at booking, swapped tickets the releasing owner's profile ids frozen at the claim (after the deadline; a
  second swap keeps the first list). Ids, never names. The stored list and the guest allergy report move to
  `../chores-0.9.1.md` § Ticket allergies on the order (in the `Order.orderSnapshot` column of its § Order snapshot); 0.9 shows the live profile on the
  ticket.
- The ticket signals allergies with `ICONS.allergy` on the card and the compact `AllergyTypeDisplay` line in the
  expanded row; the names badge on the card and the name-cell badge go.
- The card's row 1 is three fixed slots: special (state | guest | allergy cells), type, how you eat. The state colour
  paints the edge and the state glyph; the type colour paints the badge and the guest and allergy glyphs. One 20px
  glyph size.
**2026-10-11** (one team number)
- A cooking team's number has one source: the number in its name, else its position in the season's full team list plus
  one (`getTeamNumber`). Every site that shows a team passes the season's list, so a renamed team without a number
  wears the same rainbow stop on `/admin/teams`, `/chef` and `/dinner`.
**2026-10-11** (season pick)
- Seasons order active > current > future > past (`sortSeasonsByActivePriority`); the pick is the first non-past season of that order, so the e2e teardown keeps a non-past active season and activates only when the pick differs.
**2026-10-11** (one breakpoint source)
- `useTheSlopeDesignSystem` is the one place that injects the layout's `isMd`: a value that follows the breakpoint is a responsive token (`SIZES`, `RESPONSIVE_ICONS`, `TABLE_COLUMNS`, `COMPONENTS.masterDetail.detailAsPane`), behaviour reads `breakpoint` (`isMd`, `measured`), and the household calendar's open state is `?cal=`, defaulting to the measured viewport; `designSystemUsage.unit.spec.ts` fails a `.vue` outside the layout that injects `isMd`.

## Coverage

| Package | Tests |
|---|---|
| Framework spike | report only; upgrade clusters verify with `npm run pre:all`, `make unit-test`, `npm run test:e2e:api` per cluster |
| CI test reporting | CI run on this branch |
| Factory + gating | per `feature-proposal-framework-adoption.md` § Coverage |
| Prisma bundle | `npx prisma validate`, generated-zod regen, suites green post-migration |
| Duty roster + joker | per `feature-proposal-duty-roster.md` (API spec per endpoint, BDD e2e + component spec per surface, unit per util) |
| Waitlist | per `feature-proposal-waitlist.md` § TDD |
| Notifications | serial e2e per kind: event writes its Delivery row |
| Adhoc + EXPENSE | per `feature-proposal-adhoc-admin-billing.md` phases |

## Verifications with human eyes

| Check | Where | When |
|---|---|---|
| Visual check per UI package | route → viewport → DS element → expectation, posted per package, carried into the PR description | per package |
| PWA install + icon | phone home screen (carried over from `chore/npm-dependencies`) | any time |
| CI summary | Actions run page: categories, counts, red ui failures, report links | first CI run |
| Data separation list | membership vs one-off volunteer rows, reviewed and applied by the user | before duty roster ships |
| Admin economy spending | totals sanity against a real season | after the package lands |
| Page composition | `/chef`, `/dinner`, `/admin/*`, `/household/*` render identically | if the package ships |

## ADR notes

- ADR-007 amendment (factory + gating) per `feature-proposal-framework-adoption.md`.
- Duty roster ADR table in `feature-proposal-duty-roster.md` § ADR compliance; the waitlist sweep follows ADR-015
  (idempotent reconciliation) and ADR-016 (pure resolver → executor).
- ADR-011 supplement (transaction variants) per `feature-proposal-adhoc-admin-billing.md`.
