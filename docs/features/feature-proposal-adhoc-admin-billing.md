# Feature Proposal: Ad-hoc Admin Billing

**Status:** Proposal
**Date:** 2026-04-20

## Problem

- Every `Transaction` today flows from a closed `Order` on a `DinnerEvent` — there is no primitive for charges that are not dinner-related
- Treasurers resort to spreadsheets outside TheSlope, breaking single-source-of-truth for household billing
- The PBS share view is incomplete for households carrying non-dinner obligations
- Corrections to already-billed mistakes have no audit-clean path

## Scope

- Admins create ad-hoc charges against a household from `/admin/economy`
- Charges flow through the same billing pipeline as dinner transactions (current period → PBS invoice → CSV export)
- Unbilled mistakes: hard delete. Billed mistakes: negative-amount credit, auto-linked to the original.
- Households see charges read-only in `/household/<short>/økonomi`
- This is a supplement to **ADR-011**, not a new ADR. Reuses the snapshot + `SetNull` resilience pattern the order model already established.

## UX Design

### Entry point — single admin panel at the page header

`/admin/economy` is restructured to match the `AdminHouseholds` layout: one outer `UCard` wraps the whole page. Header shows the page title and a single plain `Admin-handlinger` button (admin-only). Clicking it opens an inline `AdminActionPanel` between the header and the two sections. Section 1's per-dinner `Admin Korrektion` button and inline correction UI are removed — all admin billing actions consolidate in this panel.

Flow inside the panel: pick household → pick action → **confirm the specific (household, action) pair via `DangerButton` 2-phase** → dinner selector (if correcting orders) → form. The confirmation message names both the household and the action, e.g. `Bekræft: Opret ekstra opkrævning på Skovgårdsvej 12` or `Bekræft: Ret middagsordrer for Skovgårdsvej 12`. Changing either the household or the action resets the confirm; browsing before that point is risk-free.

```
+-------------------------------------------------------------------------+
| Økonomi                                     [Admin-handlinger]          |
|                                             ↑ plain button, admin-only  |
+-------------------------------------------------------------------------+
|  ↓ when Admin-handlinger clicked (inline panel, admin-only):            |
|  +-------------------------------------------------------------------+  |
|  | Admin-handlinger                                   [x Afslut]     |  |
|  |                                                                    |  |
|  | 1. Vælg husstand:  [USelectMenu ▾]                                |  |
|  |                                                                    |  |
|  | 2. Handling:  ( ) Ret middagsordrer                                |  |
|  |               ( ) Opret ekstra opkrævning                          |  |
|  |                                                                    |  |
|  | 3. [Bekræft: <action> for <address>]   ← DangerButton, 2-phase    |  |
|  |    (disabled until both chosen; resets if either changes)          |  |
|  |                                                                    |  |
|  | 4. ↓ after 2-phase confirm, form unlocks:                          |  |
|  |    → Ret middagsordrer:                                            |  |
|  |      Vælg middag: [USelectMenu: all season dinners, by date ▾]   |  |
|  |      DinnerBookingForm renders inline — component unchanged       |  |
|  |      Save button: plain (single final commit)                     |  |
|  |                                                                    |  |
|  |    → Opret ekstra opkrævning:                                      |  |
|  |      AdhocChargeForm inline (see Create form below)                |  |
|  |      Submit button: plain (single final commit)                   |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-- Section: Fremtidige bestillinger ------------------------------------+
|   (existing table, unchanged content; no admin button here)             |
+-- Section: Faktureringsperioder ---------------------------------------+
|   (existing table, unchanged content)                                   |
+-------------------------------------------------------------------------+
```

Reuse from existing Admin Korrektion: `USelectMenu` household picker, `householdOptions` / `selectedHouseholdOption` / `fetchHouseholdDetail`, admin state (`editingHouseholdId`, `editingHousehold`, `editingDinnerId`, `editingDinnerEvent`, `editingOrders`, `ticketPrices`, `adminDeadlines`), `DangerButton` 2-phase pattern, `DinnerBookingForm`, `processAdminCorrection` — all lifted from their current location in Section 1 into the new `AdminActionPanel` component. The DangerButton is preserved, just scoped to the concrete (household, action) pair instead of a dinner.

### Create form (inline expansion)

```
+------------------------------------------------------------+
|  Ny ekstra opkrævning - Skovgårdsvej 12                    |
|                                                            |
|  Beløb (kr)                                                |
|  +-----------------------+                                 |
|  | 500,00                |                                 |
|  +-----------------------+                                 |
|                                                            |
|  Beskrivelse                                               |
|  +------------------------------------------------------+  |
|  | Ødelagt glas ved fællesmøde 12/3                     |  |
|  +------------------------------------------------------+  |
|                                                            |
|  [Opret]        [Fortryd]                                  |
+------------------------------------------------------------+
```

After save, the form collapses and a new row appears under the household in a sibling bucket "Ekstra opkrævninger":

```
|     Middage:                                               |
|       Tirs. 21. apr ...                                   |
|                                                            |
|     Ekstra opkrævninger:                                   |
|       Ødelagt glas ved fællesmøde 12/3    500 kr  [x]    |
|                                                            |
```

The `[x]` deletes if the charge is still unbilled.

### Credit a billed charge

In a closed-invoice drill-down, each adhoc row carries a "Kreditér" action. Clicking it expands a reason prompt:

```
|     Ekstra opkrævninger:                                   |
|       Ødelagt glas ved fællesmøde 12/3    500 kr [Kreditér]|
|         ^ expanded:                                        |
|         Begrundelse: [Forkert husstand opkrævet       ]    |
|         [Opret kreditering]   [Fortryd]                    |
```

Result — a new negative-amount row referencing the original:

```
|       Rettelse af #412: Forkert husstand  -500 kr         |
```

### Sibling bucket in all views

The "Ekstra opkrævninger" bucket appears inside every household / invoice expansion across:
- Admin virtual period (current month)
- Admin closed invoices (drill-down)
- Household economy (read-only, same structure)
- Public billing page (flat invoice view — adhoc is already included in `invoice.amount`, no drill-down change needed)

Stat box "Ekstra: N" appears alongside "Middage" / "Kuverter" only when N > 0.

### Toast messages

```
Create:  Ekstra opkrævning oprettet på <address>
Delete:  Ekstra opkrævning slettet
Credit:  Kreditering oprettet (-<amount> kr)
```

## Architecture

### Data model

New on `Transaction`:

```prisma
enum TransactionType {
  ORDER_CHARGE
  ADHOC_CHARGE
}

model Transaction {
  // existing fields preserved — userSnapshot + userEmailHandle also capture the admin for adhoc
  type        TransactionType @default(ORDER_CHARGE)
  householdId Int?
  household   Household?      @relation(fields: [householdId], references: [id], onDelete: SetNull)
  description String?

  @@index([householdId])
  @@index([type])
}
```

`Transaction.orderId` stays nullable (existing `SetNull`). `Invoice.householdId` already nullable. Both FKs on the Transaction use `SetNull` so the row survives deletion of related entities.

### Shared-root snapshot (DRY)

The `orderSnapshot` JSON column is widened to a discriminated union with a common root carrying the denormalized `household`. Existing rows are migrated in-place.

```ts
TransactionSnapshotBase = z.object({
  type:      TransactionTypeSchema,    // discriminator
  household: HouseholdInfoSchema       // always present post-migration
})

OrderChargeSnapshotSchema = TransactionSnapshotBase.extend({
  type:        z.literal('ORDER_CHARGE'),
  dinnerEvent: z.object({id, date, menuTitle}),
  inhabitant:  z.object({id, name}),    // household hoisted to root
  ticketType:  TicketTypeSchema.nullable()
})

AdhocChargeSnapshotSchema = TransactionSnapshotBase.extend({
  type:        z.literal('ADHOC_CHARGE'),
  description: z.string()
})

OrderSnapshotSchema = z.discriminatedUnion('type', [
  OrderChargeSnapshotSchema,
  AdhocChargeSnapshotSchema
])
```

`TransactionDisplay` mirrors this shape. Top-level `household` is always populated, resolved as: live `Transaction.household` relation → else `snapshot.household`. Same live-first pattern the order variant already uses for `inhabitant` / `dinnerEvent`.

### Query ergonomics

```sql
WHERE type = 'ADHOC_CHARGE'
WHERE type = 'ORDER_CHARGE' AND orderId IS NULL     -- orphaned deleted-orders
WHERE type = 'ORDER_CHARGE' AND orderId IS NOT NULL -- normal order-charges
WHERE type = 'ADHOC_CHARGE' AND householdId = ? AND invoiceId IS NULL
```

The enum earns its keep by distinguishing "deleted order" from "adhoc" when `orderId IS NULL`.

### API

**Create**

```
POST /api/admin/billing/adhoc
  body: { householdId: number, amount: number, description: string }
  -> TransactionDisplay (type: ADHOC_CHARGE)
```

**Delete (unbilled only)**

```
DELETE /api/admin/billing/adhoc/:id
  -> 204 when invoiceId === null && type === ADHOC_CHARGE
  -> 409 when already billed
```

**Credit (billed only)**

```
POST /api/admin/billing/adhoc/:id/reverse
  body: { reason: string }
  -> TransactionDisplay (new row with negative amount,
                         description = "Rettelse af #<id>: <reason>")
```

### Validation schemas

```ts
const AdhocChargeCreateSchema = z.object({
  householdId: z.number().int().positive(),
  amount:      z.number().int(),              // DKK øre, may be negative for credit (internal use)
  description: z.string().trim().min(1)
})

const AdhocChargeReverseSchema = z.object({
  reason: z.string().trim().min(1)
})
```

### Component structure

```
AdhocChargeForm.vue (NEW)
  Props: { householdId }
  Fields: amount (DKK/øre), description
  Emits: success(tx) | cancel
  UForm + useTemplateRef + formRef.submit() pattern

AdminEconomy.vue (extend)
  - Swap grouping accessor: tx.inhabitant.household -> tx.household
  - Partition tx into dinnerItems / adhocItems via useBilling.partitionDinnerFromAdhoc
  - Render sibling bucket "Ekstra opkrævninger" inside household / invoice expansions
  - Gated DangerButton per household row; Delete icon on unbilled adhoc;
    Kreditér action on billed adhoc

HouseholdEconomy.vue (extend)
  - Same partition + sibling bucket; read-only (no create/delete/credit UI)

CostLine.vue (extend)
  - Item shape adds description?, type?
  - When type === ADHOC_CHARGE: description as primary label, hide dinner-mode
    and order-state badges, render small "Ekstra" badge
```

### Store actions (bookings)

```ts
createAdhocCharge(householdId, amount, description) -> POST /adhoc, refresh current period
deleteAdhocCharge(transactionId)                    -> DELETE /adhoc/:id, refresh
reverseAdhocCharge(transactionId, reason)           -> POST /adhoc/:id/reverse, refresh
```

### Billing pipeline changes (`server/utils/generateBilling.ts`)

- Period assignment: branch on `tx.type` — adhoc uses `tx.createdAt` (no dinner date)
- Household grouping: use top-level `tx.household` (resolved via live-first fallback)
- `BillingPeriodSummary.ticketCount` filters to `ORDER_CHARGE` only — adhoc contributes to `totalAmount` but not to ticket counts
- CSV "Note" column: populate `"+N ekstra opkrævning(er)"` when invoice contains adhoc

No change to `createTransactions` nightly job (scoped to `Order.state: CLOSED`, invisible to adhoc), `dailyMaintenanceService`, `monthlyBillingService`, or `/public/billing/[token]`.

### Migration (next after `20260416091019_severalhouseholdsonsameadress`)

1. `ALTER TABLE Transaction` — add `type`, `householdId`, `description` columns + indexes
2. `UPDATE Transaction SET type = 'ORDER_CHARGE'`
3. Rewrite every existing `orderSnapshot` JSON: inject `type: 'ORDER_CHARGE'`, hoist `inhabitant.household` → top-level `household`, strip `household` from `inhabitant`

Step 3 is idempotent. Keeps all downstream zod free of legacy-shape handling.

### ADR Compliance

- **ADR-001**: `AdhocChargeCreateSchema` / `AdhocChargeReverseSchema` in `useBillingValidation`; `TransactionTypeSchema` re-exported
- **ADR-002**: Separate try-catch for validation vs business logic in all three endpoints
- **ADR-004**: `console.info` structured logging on create / delete / reverse; no sensitive fields
- **ADR-005**: `SetNull` on `Transaction.household` (mirrors `Transaction.order`, `Invoice.household`)
- **ADR-007**: Store-owned network; `bookingsStore` actions + `refresh()` after mutation
- **ADR-009**: `TransactionDisplay` returned from mutations (Detail-shaped)
- **ADR-010**: Discriminated union lives in `useBillingValidation` composable; repository handles serialization
- **ADR-011 supplement**: This feature extends ADR-011's snapshot pattern to a second Transaction variant; ADR-011 will get a short supplement section documenting the enum, shared-root snapshot, and reversal convention

## UX Decisions Made

1. **Per-household gate** — admin must activate admin mode on a specific household row before the "Opret ekstra opkrævning" button appears (mirrors current Admin Korrektion)
2. **Inline form** — expands below the household row; no modal, no route change
3. **One sibling bucket label** — "Ekstra opkrævninger", consistent across admin/household/closed-invoice views
4. **Delete vs credit** — unbilled: hard DELETE. Billed: new negative-amount adhoc row. Unambiguous and accounting-correct.
5. **Description required** — non-empty after trim; no minimum length policy
6. **Reversal auto-description** — `"Rettelse af #<id>: <reason>"` for traceability without a dedicated FK column
7. **Household as billing entity** — charge targets household, not inhabitant; no inhabitant selector. The admin user is captured via existing `userSnapshot` + `userEmailHandle`.
8. **Public billing view unchanged** — flat invoice totals already include adhoc via `invoice.amount`
9. **No recurring adhoc / no editing** — immutable; corrections via reverse + create

## Phases

### Phase 0: This proposal
Review + sign-off.

### Phase 1: Schema + serialization
- Prisma migration (3 steps: columns, set type, rewrite snapshots)
- Shared-root union zod schemas in `useBillingValidation`
- Rewrite `deserializeTransaction` with live-FK-first fallback for `household`
- Filter adhoc out of `computeStatsFromSnapshots`
- **Tests first (ADR-003)**: parametrized round-trip over both variants; deletion-resilience unit (FK null → snapshot resolves); migration transform fixture

### Phase 2: Backend endpoints + billing pipeline
- Repository: OR clauses in `fetchUnbilledTransactions` / `fetchHouseholdBilling`; include direct `household` in `fetchTransactionsForInvoice`; `createAdhocTransaction`; `deleteAdhocTransaction` with guard
- Endpoints: `adhoc.post.ts`, `adhoc/[id].delete.ts`, `adhoc/[id]/reverse.post.ts`
- `generateBilling`: branch on type, use top-level `household`, exclude adhoc from `ticketCount`, CSV Note
- **Tests first**: `AdhocChargeFactory`; E2E BDD scenarios (create → appears in unbilled; delete unbilled → 204; delete billed → 409; reverse billed → negative tx; household delete → snapshot resolves; billing roll-up → invoice total + ticketCount + CSV Note)

### Phase 3: Frontend read path
- `partitionDinnerFromAdhoc` helper in `useBilling`
- Swap `tx.inhabitant.household` → `tx.household` in grouping accessors
- Sibling bucket "Ekstra opkrævninger" in `AdminEconomy` + `HouseholdEconomy`
- `CostLine` adhoc rendering branch
- **Tests first**: parametrized partition helper tests; `CostLine` parametrized over both variants; component tests on `AdminEconomy` / `HouseholdEconomy` partition scope

### Phase 4: Admin trigger UI + store actions
- `AdhocChargeForm.vue` (UForm + validation)
- Gated `DangerButton` flow in `AdminEconomy.vue` household row; Delete icon on unbilled rows; Kreditér action on billed rows
- `createAdhocCharge`, `deleteAdhocCharge`, `reverseAdhocCharge` actions in `bookings` store
- **Tests first**: `AdhocChargeForm` unit (validation + emit); store action mocks; full UI E2E (admin creates → appears admin + household + closed invoice + public view; delete unbilled; credit billed)

### Phase 5: ADR-011 supplement + compliance
- Append ADR-011 supplement to `docs/adr.md`
- Update `docs/adr-compliance-backend.md` with the three new endpoints
- Update `docs/adr-compliance-frontend.md` with `AdhocChargeForm` + updated `AdminEconomy` / `HouseholdEconomy` / `CostLine` rows

## Out of Scope

- Editing an existing adhoc charge (immutable — reverse + re-create)
- Recurring ad-hoc charges
- Backfilling `Transaction.householdId` for existing order-charge rows
- Adhoc drill-down in `/public/billing/[token]` (view is flat; amount already rolls up via `invoice.amount`)
- Refunds to a bank account (PBS-level, outside TheSlope)
