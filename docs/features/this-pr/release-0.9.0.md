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
| Framework pair upgrade | pinia 4 + @pinia/nuxt 1, @vueuse/core 15, ical-generator 11 | `feature-proposal-framework-adoption.md` § Clusters and order | S | ✅ implemented 2026-10-05 — zero source changes, user commit pending |
| Store fetcher factory + store alignment | `useStoreAsyncData`, schema-driven types; every store converges on it (the misaligned fetch handling across stores, release-plan I2) | `feature-proposal-framework-adoption.md` | M–L | ✅ approved 2026-10-05 |
| Fetch gating | `enabled` carries the fetch condition | `feature-proposal-framework-adoption.md` | M | ⏳ awaiting signoff |
| Prisma bundle | ALL prisma/zod/migration work in one go: the prisma + zod majors the spike green-lights, `zod-prisma-types` regen, every new model of the push, one migration | below | L | models drafted, sign-off pending |
| Duty roster (F5a) | Templates, duties, audit trail | `feature-proposal-duty-roster.md` | L | Draft |
| Joker + vacancy overviews | `JokerSlot`, dinner "missing" face, CTC faces, shift counts, volunteering moves to duty level + data separation | `feature-proposal-duty-roster.md` § Joker + § Roster UX | L | ✅ UX signed (CTC 2026-10-05, big overview + calendar markers 2026-10-06) |
| Roster sign-off + cross-team swap (F5b) | Derived auto-sign + godkend-alligevel, duty swap | `feature-proposal-duty-roster.md` Phases 4–5 | M | roster UX ✅ signed 2026-10-05 |
| Waitlist | Queue, auto-assign sweep, extra portions, UI | `feature-proposal-waitlist.md` | L | ✅ UX signed (chef 2026-10-05, member faces 2026-10-06) |
| Notifications | Waitlist + duty-swap kinds, buildup threshold | `feature-proposal-notification-triggers.md` § Trigger catalog | M | catalog updated |
| Adhoc billing + EXPENSE | Ad-hoc charges + chef spending as EXPENSE transactions; Mit forbrug + admin economy spending views | `feature-proposal-adhoc-admin-billing.md` | L | ⏳ EXPENSE design awaiting signoff; OPEN — in this push or next |
| Sealed cookies | PRF spike, then S5 passkey re-login | `feature-proposal-mobile-native-feel.md` | S + M | spike first; S5 brief after |
| Page composition | Master/detail + tab frames, `md` breakpoint | `feature-proposal-framework-adoption.md` | M | OPEN — decided from spike findings |
| Order snapshot | Frozen `ticketType` on Order + backfill — the portion resolver reads it | `bug-fix-order-snapshot.md` | S | schema in the Prisma bundle |
| Grid booking save | One `buildDesiredOrder` builder for day/grid/preview; toast severity | `bug-fix-plan-v0.9.md` § B1 | M | ✅ implemented 2026-10-05 — user commit pending |
| Motion tokens | Raw motion classes into the design system | `bug-fix-motion-tokens.md` | S | parked for this release |
| Dinner-page follow-ups | PR #166 leftovers on `/dinner` | `bug-fix-dinner-page-and-dates.md` | S | parked for this release |

## Build order

The push starts from the framework corner (decision 2026-10-05): the upgrade philosophy is remove workarounds,
follow the framework's own shapes, adopt new features where they earn it.

1. Framework research spike ✅ + CI test reporting ✅ + PRF spike (runs early so the `WebAuthnCredential`
   shape is fixed before the single migration)
2. Framework pair upgrade (pinia 4 + @pinia/nuxt 1, @vueuse/core 15, ical-generator 11)
3. Prisma bundle: prisma 7.10 + zod 4.6 per spike findings + every model of the push + one migration (models
   signed off, Make targets produce the files, user applies)
4. Store fetcher factory + store alignment → Fetch gating (on the new zod)
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

**Mockup — ChefMenuCard budget expand** ✅ signed 2026-10-05 (the dinner economy lives in one collapsed pane)

```
Budget: 1.425 kr til rådighed                                [v]
 +- udfoldet:
    INDTÆGTER / RÅDIGHEDSBELØB / KØKKENBIDRAG   (3 bokse, exists)
    Billettype-tabel: Voksen / Barn / Baby      <- FIX: dansk navn via useTicket;
                                                   i dag rå enum (DinnerBudget.vue:171)
    Forbrug
      12/04  Grønt + kolonial         1.012 kr   [slet]
      14/04  Mejeri                     298 kr   [slet]
      [ beløb ] [ note          ]  [Tilføj]
      Brugt: 1.310 kr   Balance denne middag: +115 kr
    [Se sæsontrend]                             <- knap, udfolder sæsonvisningen
```

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
