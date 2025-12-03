# Feature: CSV Billing Import/Export System

**Status:** Implemented (Phase 1-3) | **Date:** 2025-12-02
**Updated:** 2025-12-03

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
| **Season** | Imports to ACTIVE season only |
| **Address Match** | Via computed `shortName` from address |
| **Inhabitant** | Assign to first inhabitant in household |
| **BABY tickets** | Ignored (only ADULT/CHILD) |
| **Missing DinnerEvent** | Error (fail import) |
| **Missing Inhabitant** | Error (fail import) |
| **Unmatched Address** | Error (fail import with list) |

### Make Targets

```bash
make heynabo-import-local  # Test CSV to localhost
make heynabo-import-dev    # Test CSV to dev
make heynabo-import-prod   # Prod CSV to production
```

CSV files configured in Makefile:
- `CSV_TEST` → `.theslope/order-import/test_import_orders.csv`
- `CSV_PROD` → `.theslope/order-import/skraaningen_2025_december_framelding.csv`

### Response

```json
{
  "orders": [...],
  "count": 150
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

## Error Handling

| Condition | Behavior |
|-----------|----------|
| No active season | **400** - "No active season" |
| Address not found | **400** - fail with unmatched addresses list |
| DinnerEvent not found | **400** - "No dinner event for {date}" |
| No inhabitant in household | **400** - "No inhabitants in household" |
| Missing ticket price | **400** - "Season has no ADULT/CHILD ticket price" |

---

## Test Data

Test CSV in `.theslope/test_import_orders.csv` with 2 households, 2 dates each.

```bash
make import-orders FILE=.theslope/test_import_orders.csv
```

---

## Implementation Phases

### Phase 1: Master Data (Job 1) ✅
- [x] Created master data SQL files
- [x] Make targets `d1-seed-master-data-{local,dev,prod}`

### Phase 2: Configuration (Job 3)
- [ ] Add `billing.cutoffDay` to `app.config.ts`
- [ ] Expose `getBillingCutoffDay()` in `useSeason`

### Phase 3: Import API (Job 2) ✅
- [x] Create `useBillingValidation.ts` composable
- [x] Create `import.post.ts` endpoint (ADR-002 compliant)
- [x] Make targets `heynabo-import-{local,dev,prod}`
- [x] Test CSV `.theslope/order-import/test_import_orders.csv`
- [ ] E2E tests

---

## File Structure

```
.theslope/                                    # Gitignored
  dev-master-data-households.sql              # Dev address → PBS mapping
  prod-master-data-households.sql             # Prod address → PBS mapping
  order-import/
    test_import_orders.csv                    # Test data
    skraaningen_2025_december_framelding.csv  # Prod data

app/
  composables/
    useBillingValidation.ts                   # Import schemas ✅

server/
  routes/api/admin/billing/
    import.post.ts                            # Import endpoint ✅

Makefile                                      # heynabo-import-* targets ✅
```
