# Feature Proposal: GuestBookingForm Component

## Overview

Refactor `GuestBookingFields` → `GuestBookingForm` as a self-contained, reusable form for adding guest tickets. Used by both `DinnerBookingForm` (day view) and `BookingGridView` (week/month view).

## ASCII Design

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🎫 Tilføj gæst til Onsdag 15. januar                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DEADLINE BADGES (reuse DinnerDeadlineBadges component)             │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ 🔓 Tilmelding        │  │ 🔓 Hvordan spiser I                  │ │
│  │    Åben for tilmeld. │  │    Du kan vælge spisesal/takeaway    │ │
│  └──────────────────────┘  └──────────────────────────────────────┘ │
│                                                                     │
│  ── or after booking deadline with released tickets ──              │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ (3) Tilmelding       │  │ 🔒 Hvordan spiser I                  │ │
│  │     3 ledige billetter│  │    Du kan ikke længere ændre        │ │
│  └──────────────────────┘  └──────────────────────────────────────┘ │
│                                                                     │
│  ── or fully locked ──                                              │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ 🔒 Tilmelding        │  │ 🔒 Hvordan spiser I                  │ │
│  │    Lukket            │  │    Du kan ikke længere ændre         │ │
│  └──────────────────────┘  └──────────────────────────────────────┘ │
│                                                                     │
│  FORM FIELDS                                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────────────┐ │
│  │ Antal gæster    │ │ Billettype      │ │ Allergier (valgfrit)   │ │
│  │ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌────────────────────┐ │ │
│  │ │     2     ▲▼│ │ │ │ Voksen    ▼│ │ │ │ 🌾 🥛 Gluten...  ▼│ │ │
│  │ └─────────────┘ │ │ └─────────────┘ │ │ └────────────────────┘ │ │
│  └─────────────────┘ └─────────────────┘ └────────────────────────┘ │
│                                                                     │
│  DINNER MODE SELECTOR                                               │
│  Hvordan spiser gæsten?                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐                                   │
│  │  🍽️   │ │  🕐   │ │  🛍️   │                                   │
│  │Spisesal│ │  Sen   │ │Takeaway│                                   │
│  │   ✓    │ │        │ │        │                                   │
│  └────────┘ └────────┘ └────────┘                                   │
│  ↑ NONE hidden (guests must eat)                                    │
│  ↑ All disabled if canChangeDiningMode = false                      │
│                                                                     │
│  VALIDATION                                                         │
│  ⚠️ Du kan kun tilføje 3 gæster (antal ledige billetter)           │
│                                                                     │
│  ACTIONS                                                            │
│                              ┌──────────┐ ┌──────────────────────┐  │
│                              │ Annuller │ │ 👤+ Tilføj 2 gæster │  │
│                              └──────────┘ └──────────────────────┘  │
│                                            ↑ disabled if:           │
│                                              - count > available    │
│                                              - no mode available    │
│                                              - fully locked         │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Enhance DinnerDeadlineBadges (EXISTING)

Extend `DinnerDeadlineBadges.vue` with unified visual language for chef and booking users.

**Current badges:**
- `menuBadge` (step 1) - chef only
- `bookingClosedBadge` (step 2) - **ENHANCE** with ticket count
- `groceriesDoneBadge` (step 3) - chef only
- `consumedBadge` (step 4) - chef only

**Add:**
- `diningModeBadge` - **NEW** for both chef and booking

**New props:**
```typescript
interface Props {
  dinnerEvent: DinnerEventDisplay
  deadlines: SeasonDeadlines
  mode?: 'standalone' | 'stepper' | 'booking'
  releasedTicketCount?: number  // For ticket-aware booking badge
}
```

**Unified visual language (chef + booking):**

```
┌─────────────────────────────────────────────────────────────────┐
│ bookingClosedBadge:                                             │
│                                                                 │
│   BEFORE deadline (isOpen = true):                              │
│     → 🔓 green lock, "Åben for tilmelding"                      │
│     (users manage their own bookings freely)                    │
│                                                                 │
│   AFTER deadline (isOpen = false):                              │
│     releasedCount > 0  → (N) chip, warning, "N ledige billetter"│
│                          (can claim released tickets)           │
│     releasedCount = 0  → 🔒 red lock, "Lukket"                  │
│                          (fully booked, no tickets)             │
│     releasedCount = undefined → 🔒 red lock, "Lukket"           │
│                          (safe default for chef views)          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ diningModeBadge (NEW):                                          │
│                                                                 │
│   isOpen  → 🔓 green lock, "Du kan vælge spisesal/takeaway"     │
│   !isOpen → 🔒 red lock, "Du kan ikke længere ændre"            │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Single component for chef + booking views
- Consistent UX across all deadline displays
- Ticket count immediately visible when relevant
- Lock metaphor is intuitive (open/closed/semi-locked)
- Chip pattern already used in calendar/grid

**Updated DEADLINE_LABELS in useBooking.ts:**
- Added `availableText(count)` to `BOOKING_CLOSED`
- Added `DINING_MODE` with label/openText/closedText

### 2. AllergySelectMenu (NEW - extract pattern)

Simple multi-select for allergy types with icons. Reuses `AllergenMultiSelector` pattern but simplified.

```typescript
interface Props {
  modelValue: number[]
  allergyTypes: AllergyTypeDisplay[]
  placeholder?: string
  size?: string
}
```

**Currently duplicated in:**
- `GuestBookingFields.vue` (inline USelectMenu with manual options)

**Reuses from AllergenMultiSelector:**
- Allergy type icons display
- Multi-select behavior

### 3. GuestBookingForm (RENAME from GuestBookingFields)

Self-contained guest booking form with validation and actions.

```typescript
interface Props {
  // Required
  ticketPrices: TicketPrice[]
  dinnerEvent: DinnerEventDisplay
  deadlines: SeasonDeadlines

  // For validation
  releasedTicketCount: number

  // Optional
  allergyTypes?: AllergyTypeDisplay[]
}

const emit = defineEmits<{
  submit: [data: {
    ticketPriceId: number
    allergies: number[]
    count: number
    dinnerMode: DinnerMode
  }]
  cancel: []
}>()
```

**Composes:**
- `DinnerDeadlineBadges` (mode='booking') - deadline status
- `AllergySelectMenu` - allergy multi-select
- `DinnerModeSelector` - dining mode with disabled states
- Form fields (count, ticket type)
- Action buttons (Cancel, Add)

**Validation:**
- `count <= releasedTicketCount` when deadline passed
- `dinnerMode` required (NONE not allowed for guests)
- `ticketPriceId` required

**Disabled states:**
- Save disabled if validation fails
- DinnerModeSelector buttons disabled if `!canChangeDiningMode`
- Form disabled if fully locked (no tickets + deadline passed)

## DRY Wins

| Current State | After Refactor |
|---------------|----------------|
| Deadline badges inline in DBF | `DinnerDeadlineBadges` enhanced, reused |
| Allergy select duplicated | `AllergySelectMenu` component |
| Guest form fields + buttons separate | `GuestBookingForm` self-contained |
| GridView would duplicate | Reuses `GuestBookingForm` |
| Ticket count logic scattered | Centralized in badge component |

## Migration Path

### Step 1: Enhance DinnerDeadlineBadges
- Add `releasedTicketCount` prop
- Add `diningModeBadge` computed
- Add `mode: 'booking'` support
- Update visual to use lock icons + chip
- Update `useBooking.DEADLINE_LABELS`

### Step 2: Extract AllergySelectMenu
- Create simple multi-select component
- Use allergy type icons from store
- Replace inline select in GuestBookingFields

### Step 3: Rename + Enhance GuestBookingForm
- Rename `GuestBookingFields` → `GuestBookingForm`
- Add `DinnerDeadlineBadges` (mode='booking')
- Add `DinnerModeSelector` with disabled modes
- Add action buttons (Cancel, Add)
- Add validation logic
- Emit submit/cancel

### Step 4: Update Consumers
- `DinnerBookingForm`: Replace inline guest fields with `GuestBookingForm`
- `BookingGridView`: Show `GuestBookingForm` below table when adding guest

## File Changes

```
app/composables/
└── useBooking.ts                    → UPDATE (add DEADLINE_LABELS)

app/components/
├── booking/
│   ├── GuestBookingFields.vue       → RENAME → GuestBookingForm.vue
│   └── BookingGridView.vue          → UPDATE (add form below table)
├── allergy/
│   └── AllergySelectMenu.vue        → NEW
├── chef/
│   └── DinnerDeadlineBadges.vue     → UPDATE (add booking mode, diningMode badge)
└── dinner/
    └── DinnerBookingForm.vue        → UPDATE (use GuestBookingForm)
```

## Test Updates

```
tests/component/components/booking/
├── GuestBookingFields.nuxt.spec.ts  → RENAME → GuestBookingForm.nuxt.spec.ts
└── BookingGridView.nuxt.spec.ts     → UPDATE

tests/component/components/chef/
└── DinnerDeadlineBadges.nuxt.spec.ts → UPDATE (add booking mode tests)

tests/component/components/allergy/
└── AllergySelectMenu.nuxt.spec.ts   → NEW
```
