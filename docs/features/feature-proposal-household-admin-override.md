# Feature Proposal: Household Admin Override & Move-Out UX

**Status:** In Progress (Phases 1-4)
**Date:** 2026-02-22
**Last Updated:** 2026-02-23 (Implementation started: schema alignment, admin override, settings move-out, ribbon)
**Companion to:** `feature-proposal-move-out-date.md` (backend/schema)

## Overview

Admin needs to act on behalf of households for cases where members are inactive (e.g. Judith in T46 who moved out but never logged in). Household members need self-service move-out date setting. Admin needs to create new households for house sales with date validation.

This proposal covers the **UX/frontend** side. The companion proposal covers scaffolding guards, schema migration, and Heynabo import routing.

## Context: House Sale Timeline

A house sale unfolds over ~3 months with two families overlapping at the same address:

```
MONTH 1                  MONTH 2                  MONTH 3
───────────────────────────────────────────────────────────────

Family A sets             Admin gets PBS 1047      Family A out
move-out: 01/06/2026      from administrator,      Family B in
(self-service             creates Family B
 in Settings)             move-in: 01/06/2026+
```

Same address can have 0, 1, or 2 households listed. PBS ID is the unique billing identifier — new family always gets a new PBS ID, even at the same address.

## Date Validation Rules

All dates displayed using `formatDate()` (`dd/MM/yyyy`).

| # | Rule | Trigger |
|---|------|---------|
| 1 | `moveIn(B) >= moveOut(A)` | Admin creates new household |
| 2 | A pushes moveOut later → auto-push B moveIn | Member/admin changes moveOut |
| 3 | A can remove moveOut entirely | Regret — only when no new family exists |
| 4 | A can change moveOut freely | While no new family at address |
| 5 | Admin creates B without A moveOut → auto-set A moveOut = B moveIn | Admin creates household |

## Decisions

### Decision 1: Admin Override Toggle on Household Pages

Reuse existing `canEditAdminOverride` pattern from `AdminEconomy.vue` / `DinnerBookingForm.vue`. Apply to **entire household page** via the visitor banner.

```
Current visitor banner (non-member visitors):
┌───────────────────────────────────────────────────────────┐
│  👁️ "Du besøger nu en anden husstand end din egen"        │
│     "Admin kigge, ikke røre"                               │
└───────────────────────────────────────────────────────────┘

New visitor banner (admin only — same UAlert, adds DangerButton):
┌───────────────────────────────────────────────────────────┐
│  👁️ "Du besøger nu en anden husstand end din egen"        │
│     "Admin kigge, ikke røre"                               │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🛡️ Admin røre alligevel           (DangerButton)   │  │
│  └─────────────────────────────────────────────────────┘  │
│                          ↓ click                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🛡️ Klik igen for at låse op               ██████░░ │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘

After activating (persists across all tabs):
┌───────────────────────────────────────────────────────────┐
│  🛡️ "Admin rører, men forsigtigt"                         │
│                                          [ ✕ Afslut ]     │
└───────────────────────────────────────────────────────────┘
```

Playful callback: "Admin kigge, ikke røre" → "Admin røre alligevel" → "Admin rører, men forsigtigt".
Icon: `ICONS.authorize` (`i-heroicons-shield-check`).

State management:
- `ref<boolean>` in `[tab].vue`, passed as prop to all tab components
- Persists across tab switches, resets on navigation away
- `canEdit = isMemberOfHousehold(id) || adminOverrideActive`

### Decision 2: Move-Out Date in Settings Tab (DangerButton)

Move-out is rare (once per household lifetime). Settings tab is the right place — not in-your-face on booking tab. Uses `DangerButton` 2-state confirmation, same as dinner cancellation.

**State 1 — No move-out date set:**

```
── Fraflytning ──────────────────────────────────────────────

ℹ️ Når datoen er sat, stopper automatiske bookinger
   efter denne dato.

Udflytningsdato   [📅 _____________ ]

┌────────────────────────────────────────────────────────┐
│  📦 Sæt udflytningsdato               (DangerButton)  │
└────────────────────────────────────────────────────────┘
                        ↓ click
┌────────────────────────────────────────────────────────┐
│  💀 Tryk igen for at bekræfte...            ██████░░   │
└────────────────────────────────────────────────────────┘
```

**State 2 — Move-out set, no new family:**

```
── Fraflytning ──────────────────────────────────────────────

Udflytningsdato      01/06/2026

ℹ️ Automatiske bookinger stopper efter denne dato.

[ ✏️ Ændr dato ]

┌────────────────────────────────────────────────────────┐
│  ↩️ Fjern udflytningsdato          (DangerButton undo) │
└────────────────────────────────────────────────────────┘
                        ↓ click
┌────────────────────────────────────────────────────────┐
│  ↩️ Tryk igen for at fjerne...          ██████░░       │
└────────────────────────────────────────────────────────┘
```

**State 3 — Move-out set AND new family exists:**

```
── Fraflytning ──────────────────────────────────────────────

Udflytningsdato      01/06/2026

ℹ️ Automatiske bookinger stopper efter denne dato.
ℹ️ Ny husstand (PBS 1047) overtager fra 01/06/2026.

[ ✏️ Ændr dato ]

(no "Fjern" button — can't remove when new family depends on date)
```

**Pushing date later with existing new family:**

```
── Fraflytning ──────────────────────────────────────────────

Udflytningsdato      [📅 15/06/2026      ]    (was 01/06/2026)

⚠️ Ny husstand (PBS 1047) har indflytning 01/06/2026.
   Deres indflytningsdato flyttes automatisk til 15/06/2026.

                             [ 💾 Gem ]   [ Annuller ]
```

### Decision 3: Reusable Ribbon in Design System

Extract the diagonal ribbon from `ChefMenuCard.vue` into `useTheSlopeDesignSystem` as a `RIBBON` constant. Same `bg-red-600` for both cancelled dinners and move-out.

**Ribbon on household page header (same position as AFLYST on dinner cards):**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                          ╱╱╱╱╱ │
│  🏠 Skråvej 14B · Fam. Judith                    ╱ Fraflytter╱ │
│                                               ╱ 01/06/2026╱   │
│  Tabs: [ Booking 📅 ← ] [ Allergier ] [ ⚙️ ] ╱╱╱╱╱╱╱╱╱╱╱    │
└─────────────────────────────────────────────────────────────────┘
```

| | Cancelled Dinner | Move-out Household |
|---|---|---|
| **Text** | `AFLYST` | `Fraflytter` + `formatDate()` |
| **Color** | `bg-red-600` | `bg-red-600` (same) |
| **Location** | Dinner card | Household page header |

Design system `RIBBON` provides: `base` classes, `container` class for parent, `colors` map.

### Decision 4: Admin Table — Inline Badges + Create Button

Move-out/move-in shown as inline `UBadge` on the address cell. Rare data doesn't deserve its own column.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🏠 Husstande på Skråningen                                             │
│                                                           [ + Opret ]   │
│                                                [🔍 Search...         ]  │
├──────────┬──────────────────────────────────────────┬───────┬───────────┤
│ Kort     │ Adresse                                  │ PBS   │ Beboere   │
├──────────┼──────────────────────────────────────────┼───────┼───────────┤
│ 12A  →   │ Skråvej 12A                              │ 1001  │ 👤👤      │
│ 14B  →   │ Skråvej 14B  ⊘ Fraflytter 01/06/2026    │ 1002  │ 👤 Judith │
│ 14B  →   │ Skråvej 14B  🆕 Indflytter 01/06/2026   │ 1047  │ 👤👤      │
│ 16C  →   │ Skråvej 16C                              │ 1003  │ 👤👤👤   │
└──────────┴──────────────────────────────────────────┴───────┴───────────┘
```

Badge logic:
- `moveOutDate` set → `⊘ Fraflytter` + `formatDate()` (error/subtle)
- `movedInDate` in future → `🆕 Indflytter` + `formatDate()` (success/subtle)

### Decision 5: Create Household Modal

```
┌──────────────────────────────────────────────────────────┐
│  + Opret ny husstand                                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Adresse *          [Skråvej 14B             ]           │
│  Navn *             [                        ]           │
│  PBS ID *           [1047                    ]           │
│  Heynabo ID         [42                     ]            │
│                                                          │
│  Indflytningsdato * [📅 01/06/2026          ]            │
│                                                          │
│  (dynamic validation box — see states below)             │
│                                                          │
│             [ Annuller ]    [ 💾 Opret ]                  │
└──────────────────────────────────────────────────────────┘
```

**Validation box states:**

| State | Color | Message |
|-------|-------|---------|
| No existing household at address | hidden | — |
| Existing has moveOut, new moveIn >= moveOut | `info` | ✅ Indflytning er på eller efter udflytningsdato |
| Existing has moveOut, new moveIn < moveOut | `error` | ❌ Kan ikke være før eksisterende hustands udflytning |
| Existing has NO moveOut | `warning` | ⚠️ Udflytningsdato sættes automatisk til `formatDate()` for PBS [X] |

### Decision 6: Settings Tab Structure

The currently sparse Settings tab gets proper sections:

```
/household/14B/settings

┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  ── Husstandsoplysninger ──────────────────────────────────   │
│                                                               │
│  Adresse          Skråvej 14B                                 │
│  Indflyttet       01/08/2019                                  │
│  PBS              1002                                        │
│                                                               │
│  ── Fraflytning ───────────────────────────────────────────   │
│                                                               │
│  (DangerButton flow — see Decision 2)                         │
│                                                               │
│  ── Kalenderabonnement ────────────────────────────────────   │
│  [📥 Download .ical]                                          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Files to Change

### Phase 1: Design System — Reusable Ribbon

| File | Change |
|------|--------|
| `app/composables/useTheSlopeDesignSystem.ts` | Add `RIBBON` constant (base, container, colors) |
| `app/components/chef/ChefMenuCard.vue` | Refactor hardcoded ribbon classes to use `RIBBON` |

### Phase 2: Admin Override Toggle

| File | Change |
|------|--------|
| `app/pages/household/[shortname]/[tab].vue` | Add override ref, update visitor banner, pass `canEdit` with override logic |

### Phase 3: Move-Out Date in Settings Tab

| File | Change |
|------|--------|
| `app/components/household/HouseholdSettings.vue` | Add "Husstandsoplysninger" + "Fraflytning" sections with DangerButton |
| `app/stores/households.ts` | Add `setMoveOutDate()` and `clearMoveOutDate()` actions |
| `app/composables/useCoreValidation.ts` | Ensure `moveOutDate` in `HouseholdDisplaySchema` and `HouseholdDetailSchema` |
| New: `server/routes/api/household/[shortname]/move-out.post.ts` | Member-facing endpoint with household auth |
| `server/routes/api/admin/household/[id].post.ts` | Accept `moveOutDate` in update body |

### Phase 4: Move-Out Ribbon on Household Header

| File | Change |
|------|--------|
| `app/pages/household/[shortname]/[tab].vue` | Add ribbon div using `RIBBON` from design system |

### Phase 5: Admin Table — Create Household + Inline Badges

| File | Change |
|------|--------|
| `app/components/admin/AdminHouseholds.vue` | Add "Opret" button, create modal, inline badges in address cell |
| `app/stores/households.ts` | Add `createHousehold()` action |
| `app/composables/useCoreValidation.ts` | Add `HouseholdCreateSchema` with required `movedInDate` |
| `server/routes/api/admin/household/index.put.ts` | Handle create with date validation + auto-set old moveOut |

## Verification Plan

| # | Verification | Phase |
|---|-------------|-------|
| 1 | ChefMenuCard cancelled ribbon unchanged after refactor | 1 |
| 2 | Admin visits household → sees override button | 2 |
| 3 | Admin activates override → can edit preferences across all tabs | 2 |
| 4 | Non-admin visitor → no override button | 2 |
| 5 | Member sets moveOutDate via DangerButton in Settings | 3 |
| 6 | Member removes moveOutDate via DangerButton (undo) | 3 |
| 7 | Admin sets moveOutDate via override mode | 3 |
| 8 | Ribbon appears on household page header when moveOutDate set | 4 |
| 9 | Admin table shows inline badges for moveOut/moveIn | 5 |
| 10 | Admin creates household → date validation enforced | 5 |
| 11 | Auto-set old family moveOut when no date and new family created | 5 |
| 12 | Push moveOut later → cascade to new family moveIn | 3 |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Admin accidentally edits preferences via override | Low | Medium | Explicit toggle, visual state change, prominent "Afslut" button |
| Member sets moveOut too early, loses bookings | Low | Medium | DangerButton 2-step confirmation, clear info text |
| Date cascade pushes new family moveIn unexpectedly | Low | Medium | Warning alert shown before save |
| Ribbon text too long for narrow cards on mobile | Low | Low | Use `formatDate()` consistent format, test on mobile |

## References

- Companion proposal: `docs/feature-proposal-move-out-date.md`
- DangerButton: `app/components/shared/DangerButton.vue`
- Cancelled ribbon: `app/components/chef/ChefMenuCard.vue` (lines 421-428)
- Admin override precedent: `app/components/admin/AdminEconomy.vue` (`canEditAdminOverride`)
- Visitor banner: `app/pages/household/[shortname]/[tab].vue` (lines 131-139)
- Date formatting: `app/utils/date.ts` (`formatDate()`, `dd/MM/yyyy`)
