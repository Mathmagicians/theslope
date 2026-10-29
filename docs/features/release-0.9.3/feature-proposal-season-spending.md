# Feature Proposal: Season spending — Sæsontrend, admin Forbrug, basisvarer

**Status:** Mockups signed (season view 2026-10-05, admin Forbrug 2026-10-06) | **Builds on:** the chef budget pane of release 0.9 (`../archived/release-0.9.0.md` § Chef spending) and the expense ledger (`feature-proposal-adhoc-admin-billing.md` § Expenses)

## Problem

A chef reads one dinner's money in the Budget pane. Whether the season balances, how much the next dinner may cost
against the balance, and how the whole kitchen spends against the køkkenbidrag pool has no surface. Basisvarer, the
kitchen's dinner-less purchases, has no entry.

## Decisions

- Dinner expenses balance per chef across the season; overspending a single dinner is fine when the season balances
  (2026-10-05). Basisvarer expenses are dinner-less and track against the køkkenbidrag pool.
- Admin economy Forbrug: month rows with dinner drill-down, scope switcher (alle chefkokke / én chefkok / Madbudget);
  basisvarer entry is admin-only, in that section. `SeasonBudgetOverview` takes `grouping: day | month` (2026-10-06).

## Mockups

**Season view (opens from [Se sæsontrend] in the Budget pane; the same component serves admin economy)** ✅ signed 2026-10-05

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

  Du kan bruge 1.500 kr til Risotto 06/05/2026  (budget 1.498 kr + balance +2 kr)
```

**Admin economy "Forbrug" (big overview)** ✅ signed 2026-10-06 — months as rows, a month opens to its dinners (the
admin-economy drill-down pattern); the same `SeasonBudgetOverview` component with the month table as the admin layer

```
AdminEconomy — Forbrug
  Scope: [Alle chefkokke v]  (vælg chefkok | Madbudget)      Sæson: [2026/1 v]

  Budget i alt: 32.100 kr   Brugt: 21.362 kr   Balance: +38 kr   [I BALANCE]
  [graf: akkumuleret budget vs forbrug — grøn under / rød over]

  Måned        Middage   Budget(ex)   Brugt       Balance
  > august     8         9.500 kr     9.102 kr    +398 kr
  v september  10        11.900 kr    12.260 kr   -360 kr
      Dato     Middag        Chefkok   Budget(ex)   Brugt      Balance
      02/09/2026    Lasagne       Anna      1.425 kr     1.540 kr   -115 kr
      09/09/2026    Risotto       Bo        1.498 kr     1.395 kr   +103 kr
  > oktober    9         10.700 kr    —            —
  I alt        27        32.100 kr    21.362 kr    +38 kr
```

Grouping is a component parameter (`day` | `month`), not scope-wired: the mount decides the data points. The chef's
own view and the single-chef scope pass `day` (flat table, dinners as graph points); the aggregate scopes pass `month`
(month rows, drill-down to dinners). Madbudget scope: the graph plots køkkenbidrag-accrual vs basisvarer-spend and the
month drill-down lists basisvarer purchases (dato, note, beløb). Basisvarer entry lives here, admin-only.

## Rules the release 0.9 tables set

Every table is a UTable on the table token with its empty state in the `#empty` slot; amounts render through
`VatAmount` in fixed columns; dates render whole through `formatDate`; no figure is computed in a component (the
spending helpers in `useOrder`, the rows in `useBookingUi`). A data-heavy table scrolls sideways on the phone.

## TDD

Component spec for `SeasonBudgetOverview` in both groupings and the three scopes; an API spec for the season spending
read; a BDD e2e opening Se sæsontrend from a dinner and the Forbrug tab in admin economy; the basisvarer entry through
the chef expenses API spec's shape with the ADHOC type.

## Affected

`SeasonBudgetOverview.vue` (new), `ChefMenuCard.vue` (the [Se sæsontrend] button), `AdminEconomy.vue` (the Forbrug
tab with the scope switcher and the basisvarer entry), a season spending read endpoint and the ADHOC expense write,
`useOrder` and `useBookingUi` spending helpers, `docs/adr-compliance-*.md` rows.
