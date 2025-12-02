# Feature: CSV Billing Import/Export System

**Status:** Proposed | **Date:** 2025-12-02

## Overview

CSV-based order import for billing data with idempotent API and address-based household matching.

| Job | Description | Location |
|-----|-------------|----------|
| **Job 1** | Bootstrap master data SQL (Address → PBS ID) | `.theslope/master-data-households.sql` |
| **Job 2** | Order import API endpoint + Make target | `server/routes/api/admin/billing/import.post.ts` |
| **Job 3** | Billing cutoff config | `app.config.ts` + `useSeason` |

## Job 1: Master Data Bootstrap ✅

Created: `.theslope/dev-master-data-households.sql`, `.theslope/prod-master-data-households.sql`, Make targets `d1-seed-master-data-{local,dev,prod}`

---

## Job 2: Order Import

### Endpoint

`POST /api/admin/billing/import`

### Input Format

CSV pivot table matching the "framelding" format:

```
                    ,Total DKK/måned,DD/MM/YYYY,DD/MM/YYYY,...
{Address}           ,{total}        ,          ,          ,...
Voksne              ,               ,{count}   ,{count}   ,...
Børn (2-12 år)      ,               ,{count}   ,{count}   ,...
```

### Behavior

| Aspect | Rule |
|--------|------|
| **Idempotency** | Re-running same import produces same result |
| **Address Match** | Exact match on `Household.address` or computed `shortName` |
| **Inhabitant** | Assign to first adult inhabitant in household |
| **BABY tickets** | Ignored |
| **Missing DinnerEvent** | Warning (skip row, continue) |
| **Date outside season** | Error (fail import) |

### Make Target

```bash
make import-orders FILE=path/to/file.csv
```

### Response

```json
{
  "ordersCreated": 150,
  "ordersSkipped": 10,
  "warnings": ["No DinnerEvent for 2025-12-25"],
  "errors": []
}
```

---

## Job 3: Billing Configuration

### app.config.ts Addition

```typescript
theslope: {
    billing: {
        cutoffDay: 17  // Day of month (1-28) when billing period closes
    }
}
```

### useSeason Exposure

```typescript
const getBillingCutoffDay = (): number => theslope.billing.cutoffDay
```

---

## Idempotency Strategy

Orders uniquely identified by: `(householdId, dinnerEventId, ticketType)`

| Scenario | Action |
|----------|--------|
| No existing orders | Create new |
| Same count exists | Skip (no-op) |
| Different count | Delete existing, create new |

Audit trail via `OrderHistory` with action `BILLING_IMPORT`.

---

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Address not found | **Error** - fail with unmatched addresses list |
| DinnerEvent not found | **Warning** - log, skip row, continue |
| Date outside active season | **Error** - fail import |
| No adult in household | **Warning** - skip household, continue |

---

## Test Data

Test CSV in `.theslope/test_import_orders.csv` with 2 households, 2 dates each.

```bash
make import-orders FILE=.theslope/test_import_orders.csv
```

---

## Implementation Phases

### Phase 1: Master Data (Job 1) ✅

### Phase 2: Configuration (Job 3)
- [ ] Add `billing.cutoffDay` to `app.config.ts`
- [ ] Expose `getBillingCutoffDay()` in `useSeason`

### Phase 3: Import API (Job 2)
- [ ] Create `useBillingValidation.ts` composable
- [ ] Create `import.post.ts` endpoint
- [ ] Add `make import-orders` target
- [ ] Create test CSV
- [ ] E2E tests

---

## File Structure

```
.theslope/                           # Gitignored
  master-data-households.sql         # Address → PBS mapping
  test_import_orders.csv             # Test data

app/
  composables/
    useBillingValidation.ts          # Import schemas
  app.config.ts                      # + billing.cutoffDay

server/
  routes/api/admin/billing/
    import.post.ts                   # Import endpoint

Makefile                             # + targets
```
