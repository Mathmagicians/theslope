# Release 0.9.0 — work-roster push overview

**Status:** Draft | **Date:** 2026-10-05 | **Updated:** 2026-10-05 (decisions round 1) | **Branch:** `feature/work-roster`

The umbrella spec for this push (the finished push earns v0.9). Each package is briefed and approved in chat before
any agent starts; detail lives in the linked docs. All Prisma work lands as ONE migration package (model sign-off
first, `.claude/skills/prisma/SKILL.md`). Every package runs `/dry` on its diff and follows `/code-comments`;
ADR-compliance rows update in the same change; broken windows in touched files are fixed by the touching package.
Sizing is informal t-shirt sizes.

## Package inventory

| Package | What | Detail | Size | Status |
|---|---|---|---|---|
| Framework research spike | prisma 7/8-RC + zod 4 + `zod-prisma-types` compatibility; removable workarounds and adoptable features; Nuxt roadmap evidence that `useAsyncData`'s option surface (`enabled`, `createUseAsyncData`) and named layout slots survive coming releases | `feature-proposal-framework-adoption.md` § Dependency clusters | S | ✅ decided — spike first |
| CI test reporting | Job summary: vitest stats line + per-suite Playwright sections with report links | below | S | ✅ approved 2026-10-05 |
| Store fetcher factory | `useStoreAsyncData`; schema-driven types | `feature-proposal-framework-adoption.md` | M | ⏳ API awaiting signoff |
| Fetch gating | `enabled` carries the fetch condition | `feature-proposal-framework-adoption.md` | M | ⏳ awaiting signoff |
| Prisma bundle | ALL prisma/zod/migration work in one go: the prisma + zod majors the spike green-lights, `zod-prisma-types` regen, every new model of the push, one migration | below | L | models drafted, sign-off pending |
| Duty roster (F5a) | Templates, duties, audit trail | `feature-proposal-duty-roster.md` | L | Draft |
| Joker + vacancy overviews | `JokerSlot`, dinner "missing" face, team-card + big overview, shift counts, volunteering moves to duty level + data separation | `feature-proposal-duty-roster.md` § Joker | L | ⏳ mockups awaiting signoff |
| Roster sign-off + cross-team swap (F5b) | Chef sign-off, duty swap | `feature-proposal-duty-roster.md` Phases 4–5 | M | Draft |
| Waitlist | Queue, auto-assign sweep, extra portions, UI | `feature-proposal-waitlist.md` | L | ⏳ mockups awaiting signoff |
| Notifications | Waitlist + duty-swap kinds, buildup threshold | `feature-proposal-notification-triggers.md` § Trigger catalog | M | catalog updated |
| Adhoc billing + EXPENSE | Ad-hoc charges + chef spending as EXPENSE transactions; Mit forbrug + admin economy spending views | `feature-proposal-adhoc-admin-billing.md` | L | ⏳ EXPENSE design awaiting signoff; OPEN — in this push or next |
| Sealed cookies | PRF spike, then S5 passkey re-login | `feature-proposal-mobile-native-feel.md` | S + M | spike first; S5 brief after |
| Page composition | Master/detail + tab frames, `md` breakpoint | `feature-proposal-framework-adoption.md` | M | OPEN — decided from spike findings |
| Order snapshot | Frozen `ticketType` on Order + backfill — the portion resolver reads it | `bug-fix-order-snapshot.md` | S | schema in the Prisma bundle |
| Grid booking save | One `buildDesiredOrder` builder for day/grid/preview; toast severity | `bug-fix-plan-v0.9.md` § B1 | M | root-caused, unblocked |
| Motion tokens | Raw motion classes into the design system | `bug-fix-motion-tokens.md` | S | parked for this release |
| Dinner-page follow-ups | PR #166 leftovers on `/dinner` | `bug-fix-dinner-page-and-dates.md` | S | parked for this release |

## Build order

The push starts from the framework corner (decision 2026-10-05): the upgrade philosophy is remove workarounds,
follow the framework's own shapes, adopt new features where they earn it.

1. Framework research spike + PRF spike + CI test reporting (independent; the PRF spike runs early so the
   `WebAuthnCredential` shape is fixed before the single migration)
2. Prisma bundle: prisma/zod majors per spike findings + every model of the push + one migration (models signed
   off, Make targets produce the files, user applies)
3. Store fetcher factory → Fetch gating (on the new zod)
4. Duty roster F5a → Joker + overviews (+ data separation) → F5b
5. Waitlist → Notifications
6. Adhoc + EXPENSE (this release, lower priority)
7. Sealed cookies S5 (model already in the bundle)
8. Page composition (if signed off)

One e2e runner at a time; packages that run Playwright are sequenced.

## CI test reporting

**Problem.** The pipeline summary reports counts without categories; the e2e api and ui suites appear in neither the
summary nor as result links; `continue-on-error: true` hides ui failures.
**Solution.** Per tool, no cross-format normalization. Vitest keeps its own reporter: the unit step tees the output
and the summary prints the stats lines (`Test Files` / `Tests` / `Duration`). Each Playwright suite — api, ui,
smoke — writes its JSON (`PLAYWRIGHT_JSON_OUTPUT_NAME`) and `make test-report` renders that suite's section: counts,
❌ heading on failures, the warning note (ui) and the report artifact link (`actions/upload-artifact` `artifact-url`).
`continue-on-error` stays (decision 2026-10-05).
**TDD.** `make test-report` rendered against sample reports (failing, green, missing file); the grep against a real
vitest run; the summary layout verifies on a CI run of this branch.
**Affected.** `.github/workflows/cicd.yml`, `Makefile` (`test-report`), `package.json` (playwright json reporters).

## Prisma bundle

One package, one migration, produced by the Make targets after the user signs off every model. Contents:

| Model / change | Source |
|---|---|
| `DinnerDutyTemplate`, `DinnerDuty` (+ `jokerSlotId`), `DutyHistory`, `DutyState`, `DutyAuditAction` | `feature-proposal-duty-roster.md` § Schema additions |
| `JokerSlot` | `feature-proposal-duty-roster.md` § Joker |
| `TicketWaitlist`, `WaitlistState`, `DinnerEvent.extraPortionsReleased` | `feature-proposal-waitlist.md` |
| `TicketPrice.portionSize` (closes the `useOrder.ts` TODO; portion weights become data) | waitlist resolver |
| `Transaction.type` (+ `EXPENSE`), `householdId`, `description` + snapshot migration | `feature-proposal-adhoc-admin-billing.md` — the type/snapshot changes ship with chef spending; the adhoc-charge endpoints are the OPEN part |
| `WebAuthnCredential` incl. wrapped-password ciphertext | sealed cookies — shape fixed by the PRF spike |
| `Order.orderSnapshot` (frozen `ticketType`) + backfill | `bug-fix-order-snapshot.md` |

## Chef spending

Expenses are EXPENSE rows in the transaction ledger, excluded from invoicing (decision 2026-10-05) —
`feature-proposal-adhoc-admin-billing.md` § Expense type. Surfaces:

**Mockup — expense entry (ChefMenuCard, under Budget)** ⏳ awaiting signoff

```
Forbrug
  12/04  Grønt + kolonial         1.012 kr   [slet]
  14/04  Mejeri                     298 kr   [slet]
  [ beløb ] [ note          ]  [Tilføj]
  Brugt: 1.310 kr   Rådighedsbeløb (ex moms): 1.425 kr   Rest: 115 kr
```

**Mockup — single-chef overview (`/chef`, "Mit forbrug" card)** ⏳ awaiting signoff

```
Mit forbrug — sæson 2026/1
  Dato        Middag            Budget(ex)   Brugt      Balance
  15/04/2026  Lasagne           1.425 kr     1.540 kr   -115 kr
  22/04/2026  Boller i karry    1.512 kr     1.395 kr   +117 kr
  06/05/2026  Risotto (næste)   1.498 kr     —          —
  Sæson                         4.435 kr     2.935 kr   +2 kr

  Du kan bruge 1.500 kr til Risotto 06/05  (budget 1.498 kr + balance +2 kr)
```

**Mockup — admin economy spending section** ⏳ awaiting signoff

```
Forbrug — [periode-vælger]

Middage (pr. chefkok)
  Chefkok   Middage   Budget(ex)   Brugt       Balance
  Anna      4         5.698 kr     5.540 kr    +158 kr
  Bo        3         4.230 kr     4.390 kr    -160 kr
  I alt     12        14.250 kr    13.980 kr   +270 kr

Basisvarer (køkkenbidrag)
  Dato     Note              Beløb
  03/04    Olie, salt, mel   642 kr
  Køkkenbidrag i perioden: 712 kr · Basisvarer: 642 kr · Balance: +70 kr
```

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
- CI reporting is per-tool (correction 2026-10-05): vitest prints its own stats line; `make test-report` is
  Playwright-only, one call per suite (api, ui, smoke) — no cross-format normalization.
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
| Sealed cookies S5 | spike protocol; S5 specs in its brief |

## Verifications with human eyes

| Check | Where | When |
|---|---|---|
| Visual check per UI package | route → viewport → DS element → expectation, posted per package, carried into the PR description | per package |
| PRF spike | installed PWA on iOS 18+, Android, one desktop | before the S5 brief |
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
