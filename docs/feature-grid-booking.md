# Feature: BookingGridView

## Overview
Unified week/month grid for household booking management. Full-width layout (no calendar master) with horizontal scroll for day columns.

## Layout
```
┌────────────────────────────────────────────────────────────────────┐
│  ◀ Januar 2025 ▶                    [Dag][Uge][Mnd] [Annuller][Gem]│
├──────────────────┬─────────────────────────────────────────────────┤
│ FIXED            │ SCROLLABLE (dinner days only)                   │
├──────────┬───────┼──────┬──────╫──────┬──────╫──────┬──────────────┤
│ Beboer   │Status │ Ti 7 │ To 9 ║Ti 14 │To 16 ║Ti 21 │ ...          │
│          │       │      │  🟡  ║      │      ║      │              │
├──────────┼───────┼──────┼──────╫──────┼──────╫──────┼──────────────┤
│ Voksen   │       │      │      ║      │      ║      │              │
│ Anna     │ ~2    │  🍽️  │  🍽️  ║  🛍️  │  🍽️  ║  🍽️  │              │
├──────────┼───────┼──────┼──────╫──────┼──────╫──────┼──────────────┤
│ Barn     │       │      │      ║      │      ║      │              │
│ Lars     │ +1    │  🍽️  │  🕐  ║  🍽️  │  ❌  ║  🍽️  │              │
└──────────┴───────┴──────┴──────╨──────┴──────╨──────┴──────────────┘
Legend: 🍽️ Spiser  🕐 Sen  🛍️ Take  ❌ Nej  ~frigivet  +hentet  🟠Lukket 🟡Ledige
```

## Key Features
- **Single component** for week + month (`view` prop)
- **Only dinner days** as columns
- **Week boundary accent** (thicker border)
- **Lock chips** like calendar (peach=locked, yellow=tickets)
- **Mode toggle** cycles: DINEIN→LATE→TAKE→NONE
- **Fixed columns** (name/status) with scrollable days
- **Edit/View mode** with Save/Cancel

## Files
| File | Action |
|------|--------|
| `booking/BookingGridView.vue` | Create |
| `booking/DinnerModeToggle.vue` | Create |
| `booking/BookingWeekView.vue` | Delete |
| `booking/BookingMonthView.vue` | Delete |
| `household/HouseholdBookings.vue` | Modify |

## Status Indicators
- `~N` (error color) = N tickets released by you
- `+N` (success color) = N tickets claimed from others
