# Feature Proposal: Billing & Economy Views

**Status:** Complete | **Date:** 2025-12-14 | **Completed:** 2025-12-16

## Business Context

- **Billing Period**: 18th of previous month → 17th of current month (consumption period)
- **Statement Date (cutoffDate)**: 17th when billing period closes
- **PBS Collection (paymentDate)**: 1st-last of the FOLLOWING month
- **Example**: Consumption 18. feb - 17. mar → Collected via PBS in April
- **Magic Link**: Community-wide CSV shared with accountant (no login required)

---

## Views Overview

### 1. Household Economy (`HouseholdEconomy.vue`)
- Current period transactions (not yet billed)
- Past invoices with PBS collection month

### 2. Admin Economy (`AdminEconomy.vue`)
- Community-wide overview stats
- Month-by-month billing periods
- Detail view per period (all households)
- Share link generation for accountant

### 3. Public Billing (`/public/billing/[token]`)
- Magic link page for accountant
- Community summary + CSV download
- No authentication required

---

## Schema Addition

```prisma
model BillingPeriodSummary {
  id             Int      @id @default(autoincrement())
  billingPeriod  String   @unique  // "18.10.2025 - 17.11.2025"
  shareToken     String   @unique  // For magic link
  totalAmount    Int               // Sum in øre
  householdCount Int
  ticketCount    Int
  createdAt      DateTime @default(now())
}
```

---

## CSV Export Format

Matches existing administrator export format:

```csv
Kunde nr,Adresse,Total DKK/måned,Opkrævning periode start,Opkrævning periode slut,Opgørelsesdato,Måltider total,Evt ekstra,Note
2002,Smedekildevej 49,553,01/12/2025,31/12/2025,17/11/2025,553,,,
2004,Smedekildevej 47,1572,01/12/2025,31/12/2025,17/11/2025,1572,,,
```

---

## API Endpoints

| Endpoint | Method | Auth | Description | Status |
|----------|--------|------|-------------|--------|
| `/api/admin/billing/periods` | GET | Admin | List BillingPeriodSummary records | ✅ |
| `/api/admin/billing/periods/[id]` | GET | Admin | Detail with invoices | ✅ |
| `/api/admin/maintenance/monthly` | POST | Admin/Cron | Generate invoices + summary | ✅ |
| `/api/public/billing/[token]` | GET | Public | Public billing view | ✅ |
| `/api/public/billing/[token]/csv` | GET | Public | Public CSV download | ✅ |
| `/api/billing?householdId=X` | GET | Household | Household billing data | ✅ |

---

## Implementation Status

### Completed

- [x] Add `BillingPeriodSummary` and `Invoice` to Prisma schema
- [x] Create `useBillingValidation.ts` composable (schemas, types, CSV functions)
- [x] Create `useBilling.ts` composable (billing period calculation logic)
- [x] Unit tests for `useBilling.ts` (`useBilling.nuxt.spec.ts`)
- [x] Implement `POST /api/admin/maintenance/monthly` (generates BillingPeriodSummary + Invoices)
- [x] Implement `GET /api/admin/billing/periods` (list summaries)
- [x] Implement `GET /api/admin/billing/periods/[id]` (detail with invoices)
- [x] Implement `GET /api/public/billing/[token]` (public view via magic link)
- [x] Implement `GET /api/public/billing/[token]/csv` (CSV download)
- [x] Implement `GET /api/billing?householdId=X` (household billing view)
- [x] E2E tests for monthly billing in `maintenance.e2e.spec.ts`

### Remaining

- [ ] Update `HouseholdEconomy.vue` (display billing data from API)
- [ ] Update `AdminEconomy.vue` (admin billing management UI)
- [ ] Create `pages/public/billing/[token].vue` (magic link page for accountant)
