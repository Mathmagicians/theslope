# Feature Proposal: Admin Order Corrections

**Status:** Proposed | **Date:** 2026-01-21

## Problem

Live users need occasional admin support for corrections:
- User forgot to book
- User misunderstood preferences
- Wrong booking discovered after billing
- Need to delete order + transaction + history for closed orders

Current state: Admin can only VIEW households ("Kigge, ikke røre"), cannot make corrections.

## Decision Summary

### 1. Extend `requireHouseholdAccess` with Admin Bypass

Add optional predicate parameter with default `() => false`:

```
requireHouseholdAccess(event, householdId, adminBypass = () => false)
```

- When `adminBypass(user)` returns true → skip household membership check
- Pass `isAdmin` predicate only where admin corrections are intentional
- Existing calls unchanged (use default, no bypass)

### 2. Use Existing Order Endpoints (Not Scaffolder)

| Endpoint | Admin Change |
|----------|--------------|
| `PUT /api/order` | Add `isAdmin` bypass to `requireHouseholdAccess` |
| `POST /api/order/[id]` | Add `isAdmin` bypass + skip deadline logic for admin |
| `DELETE /api/order/[id]` | Already works (no household check) |

**Why not scaffolder?** Scaffolder has complex deadline logic (delete vs release, claim availability). Admin corrections need simple CRUD that bypasses all deadline rules.

### 3. Audit Trail: Use Existing USER_* Actions

- `USER_BOOKED` / `USER_CANCELLED` with admin's `performedByUserId`
- No new `ADMIN_CORRECTED` action needed
- Query admin corrections via: `WHERE performedByUserId IN (admin user IDs)`

**Why?** Adding new audit action would require changes to scaffolder intent lookup. Existing actions + admin userId is sufficient.

### 4. No JobRun Wrapper

- OrderHistory already tracks who performed each action
- Few corrections per month doesn't warrant job dashboard visibility
- Can add later if needed

### 5. UI Location: AdminEconomy

Reuse `DinnerBookingForm` by passing wrapped predicates from parent:

| Current | Admin Wrapper |
|---------|---------------|
| `canBook(date)` | `() => true` (always allowed) |
| `canChangeDiningMode(date)` | `() => true` (all modes available) |
| `isHouseholdMember(id)` | `() => true` (can edit any household) |

**Key:** Form doesn't know about admin mode - parent wraps existing predicates with admin override. Form just uses predicates it receives.

AdminEconomy already shows future orders per dinner - add edit button that opens DinnerBookingForm in modal with wrapped predicates.

## Implementation Scope

| Component | Change |
|-----------|--------|
| `authorizationHelper.ts` | Add `adminBypass` param to `requireHouseholdAccess` (default `() => false`) |
| `PUT /api/order` | Pass `isAdmin` as bypass predicate |
| `POST /api/order/[id]` | Pass `isAdmin` + skip deadline logic when admin |
| `DinnerBookingForm.vue` | Accept deadline predicates as props (instead of computing internally) |
| `bookings.ts` store | Add admin-aware methods (or flag) |
| `AdminEconomy.vue` | Add correction UI, pass wrapped predicates to DinnerBookingForm |

## UI Mockups

### AdminEconomy - Future Orders with Correction Button

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ØKONOMI                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ FREMTIDIGE BESTILLINGER                                                  │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ 📅 Onsdag 22. jan · Lasagne                              [✏️ Ret]   │ │
│ │   AR_1_st: Anna (🍽️), Peter (🕐)                                    │ │
│ │   BG_2_lej: Ole (🍽️), Marie (🛍️)                                   │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │ 📅 Torsdag 23. jan · Gryderet                            [✏️ Ret]   │ │
│ │   AR_1_st: Anna (🍽️)                                                │ │
│ │   CG_3_th: Lars (🍽️), Sofie (🍽️)                                   │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ FAKTURERINGSPERIODER                                                     │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ 🟢 Igangværende (15. jan - 14. feb)              42 ordrer · 2.340kr │ │
│ │ ✓  December 2025                                 156 ordrer · 8.580kr │ │
│ │ ✓  November 2025                                 148 ordrer · 8.140kr │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Correction Modal (DinnerBookingForm with adminOverride)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🛡️ ADMIN KORREKTION · Onsdag 22. jan · Lasagne                     [X] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Husstand: AR_1_st (Andersens)                                            │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ [▼] Hele familien                    ⚡ 3 beboere                  │   │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ [✏️] Anna Hansen                     🎟️ Voksen 55kr 🍽️            │   │
│ │ [✏️] Peter Hansen                    🎟️ Voksen 55kr 🕐            │   │
│ │ [✏️] Lille Emil                      🎟️ Barn 30kr ❌              │   │
│ ├────────────────────────────────────────────────────────────────────┤   │
│ │ [+] Tilføj gæst                                                    │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│ ⚠️ Admin mode: Deadline-regler ignoreres                                 │
│                                                                          │
│                                              [Annuller]  [💾 Gem ændringer] │
└──────────────────────────────────────────────────────────────────────────┘
```

### Expanded Row - Admin Can Select Any Mode

```
┌────────────────────────────────────────────────────────────────────┐
│ [▼] Anna Hansen                                                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Vælg spisning for Anna:                                        │ │
│ │                                                                │ │
│ │   [🍽️ Fællesspisning]  [🕐 Sen]  [🛍️ Takeaway]  [❌ Ingen]    │ │
│ │                                                                │ │
│ │ ⚠️ Admin: Alle valgmuligheder tilgængelige (deadline ignoreret) │ │
│ │                                                                │ │
│ │                                    [Annuller]  [Gem]           │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## Out of Scope (Future)

- Corrections to CLOSED orders with transactions (billing impact)
- Invoice corrections
- Bulk admin corrections

## Test Impact

Existing order E2E tests use admin's own household - no change needed. Tests creating orders for other households will need the admin bypass.
