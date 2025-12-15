# Feature Proposal: Billing & Economy Views

**Status:** Draft | **Date:** 2025-12-14

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

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/billing/periods` | GET | Admin | List BillingPeriodSummary records |
| `/api/admin/billing/periods/[period]` | GET | Admin | Invoices for specific period |
| `/api/admin/billing/periods/[period]/csv` | GET | Admin | Download CSV |
| `/api/admin/billing/generate` | POST | Admin/Cron | Generate invoices + summary |
| `/api/public/billing/[token]` | GET | Public | Public billing view |
| `/api/public/billing/[token]/csv` | GET | Public | Public CSV download |
| `/api/household/[id]/billing` | GET | Household | Household's invoices |

---

## Stubs Created

- [x] `GET /api/public/billing/[token]/csv` - Public CSV export stub (headers only)
- [x] `HouseholdEconomy.vue` - ASCII mockup added
- [x] `AdminEconomy.vue` - ASCII mockup added

## Implementation Tasks

- [ ] Add `BillingPeriodSummary` to Prisma schema
- [ ] Create `useBillingValidation.ts` composable
- [ ] Implement `POST /api/admin/billing/generate`
- [ ] Implement `GET /api/admin/billing/periods`
- [ ] Implement `GET /api/public/billing/[token]`
- [ ] Implement `GET /api/public/billing/[token]/csv` (data)
- [ ] Update `HouseholdEconomy.vue` (implementation)
- [ ] Update `AdminEconomy.vue` (implementation)
- [ ] Create `pages/public/billing/[token].vue`
