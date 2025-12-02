# 🎯 Chef/Team Management Feature - Implementation Workplan

**Status**: 90% Complete | **Started**: 2025-11-01 | **Last Updated**: 2025-12-02

---

## API Endpoints

| Directory       | Actor             | Authority               | When                     |
|-----------------|-------------------|-------------------------|--------------------------|
| /api/admin/     | Admins            | System configuration    | Always                   |
| /api/team/      | Team members      | Self-service operations | Pre-event (planning)     |
| /api/chef/      | Assigned chef     | Dinner management       | During event (execution) |
| /api/household/ | Household members | Participation           | Booking/allergies        |

---

## 🎯 REMAINING WORK

| Component | Location | Status | Remaining Work |
|-----------|----------|--------|----------------|
| `ChefMenuCard` | `chef/ChefMenuCard.vue` | ⚠️ | Add `totalCost` input (ALL states), Zod form validation, wire handler |
| `DinnerBudget` | `chef/DinnerBudget.vue` | ⚠️ | **NOT INTEGRATED** - Add to `chef/index.vue` `#stats` slot |
| `KitchenPreparation` | `dinner/KitchenPreparation.vue` | ⚠️ | Show 0 values when no orders (don't hide with UAlert) |
| `ChefDinnerCard` | `chef/ChefDinnerCard.vue` | ⚠️ | Missing component tests |
| `ChefCalendarDisplay` | `calendar/ChefCalendarDisplay.vue` | ⚠️ | Missing component tests |
| `DinnerStatusStepper` | `chef/DinnerStatusStepper.vue` | ⚠️ | Missing component tests |
| `TeamRoleStatus` | `chef/TeamRoleStatus.vue` | ⚠️ | Missing component tests |
| `DinnerDetailHeader` | `dinner/DinnerDetailHeader.vue` | ⚠️ | Missing component tests |
| `DinnerDetailPanel` | `dinner/DinnerDetailPanel.vue` | ⚠️ | Missing component tests |
| `AllergenMultiSelector` | `shared/AllergenMultiSelector.vue` | ⚠️ | Missing component tests |

**Design Decisions:**
- Deadline logic in `useSeason` (no micro composables)
- Budget input visible in ALL states
- Kitchen stats shows 0s when no orders (don't hide)

---

## 📋 ARCHIVED STATUS (Phase 1-4.5)

**ASCII Mockup - Chef Assignment:**
```
┌────────────────────────────────────────────────────┐
│ DinnerMenuHero (Chef Mode)                        │
├────────────────────────────────────────────────────┤
│ 👨‍🍳 CHEFKOK                                       │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ ℹ️ Ingen chefkok tildelt                     │  │
│ │ Vil du påtage dig ansvaret som chefkok?      │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ [✋ BLIV CHEFKOK]                                   │
│                                                    │
└────────────────────────────────────────────────────┘

After assignment:
┌────────────────────────────────────────────────────┐
│ 👨‍🍳 CHEFKOK                                       │
│                                                    │
│ 👤  Anna Nielsen                                   │
│     Det er dig!                                    │
│                                                    │
│ [🔄 BYT CHEF (kommer snart)]  ← disabled          │
│                                                    │
└────────────────────────────────────────────────────┘
```

**API Endpoint:**
- `POST /api/admin/dinner-event/[id]/assign-chef`
- Body: `{ inhabitantId: number }`
- Logic: Update dinnerEvent.chefId + create/update CookingTeamAssignment with role=CHEF

**Detail Panel Refactoring (Phase 6):** See Section 3 below for mockups and status table.

**State Transitions:**
- ❌ SCHEDULED → ANNOUNCED (announce menu)
- ❌ Any state → CANCELLED (with refund logic)
- ❌ Auto-consumed batch script

**Deadline System:**
- ❌ `useChefDeadlines()` composable
- ❌ Deadline warnings (⚠️ < 3 days, 🚨 overdue)
- ❌ Calendar deadline overlays

**Testing:**
- ⚠️ Component tests for MyTeamSelector, TeamCalendarDisplay
- ⚠️ E2E tests for chef workflow, team switching

---

## 🏗️ Architecture Refactoring (Phase 6) - FINAL

**Status**: Architecture Decided | **Updated**: 2025-01-30 | **Priority**: High

### Senior Architect Decision: DELETE DinnerMenuHero

**Problem**: DinnerMenuHero was an unnecessary abstraction layer causing duplication:
- Menu title/description/date logic duplicated between DinnerMenuHero and ChefMenuCard
- Mode prop explosion ('household', 'chef', 'view') made component complex
- Chef decides the menu - so menu content belongs in ChefMenuCard, not a separate hero

**Solution**: Slot-based composition with ChefMenuCard as the content provider

```
BEFORE (complex, duplicated):
┌─────────────────────────────────────────────────────────────────────────┐
│ DinnerDetailPanel                                                       │
│ ├── #header: DinnerMenuHero (menu, allergens, booking - DUPLICATED)    │
│ ├── ChefMenuCard mode="edit" (menu, state, deadlines - DUPLICATED)     │
│ ├── CookingTeamCard                                                     │
│ └── KitchenPreparation                                                  │
└─────────────────────────────────────────────────────────────────────────┘

AFTER (DRY, slot-based):
┌─────────────────────────────────────────────────────────────────────────┐
│ DinnerDetailPanel (LAYOUT CONTAINER)                                    │
│ ├── #top: Date, State badge, Heynabo link                              │
│ ├── #main: ChefMenuCard + slot content                                 │
│ │   ├── ChefMenuCard (menu, allergens, state, deadlines, budget)       │
│ │   └── <slot> for page-specific: DinnerBookingForm (household only)   │
│ ├── #team: CookingTeamCard                                             │
│ └── #stats: KitchenPreparation                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Component Architecture

#### 1. DinnerDetailPanel (LAYOUT CONTAINER)

**Purpose**: Layout container with slots for dinner detail pages
**Location**: `app/components/dinner/DinnerDetailPanel.vue`
**Role**: Fetches dinner data, provides layout structure, handles loading/error states

**Props**:
```typescript
interface Props {
  dinnerEventId: number | null
  ticketPrices?: TicketPrice[]
  formMode?: FORM_MODES  // VIEW or EDIT (from ~/types/form)
}
```

**Slots**:
```typescript
interface Slots {
  top?: () => any       // Date, state badge, Heynabo link
  main?: () => any      // ChefMenuCard + page-specific content
  team?: () => any      // CookingTeamCard
  stats?: () => any     // KitchenPreparation
}
```

**Provides**: `dinnerEvent` via inject for child components

---

#### 2. ChefMenuCard (CONTENT PROVIDER)

**Purpose**: ALL dinner content display and editing
**Location**: `app/components/chef/ChefMenuCard.vue`
**Role**: Menu display/editing, allergens, state stepper, deadlines, budget, action buttons

**Props**:
```typescript
interface Props {
  dinnerEvent: DinnerEventDetail
  formMode?: FORM_MODES          // VIEW or EDIT
  showStateControls?: boolean    // Show stepper, deadlines, budget, actions (chef only)
  showAllergens?: boolean        // Show allergen section
}
```

**Slots**:
```typescript
interface Slots {
  default?: () => any   // Page-specific content (DinnerBookingForm for household)
}
```

**Modes via formMode + showStateControls**:
| formMode | showStateControls | Use Case |
|----------|-------------------|----------|
| VIEW | false | Household viewing menu |
| VIEW | true | Team member viewing chef's dinner |
| EDIT | true | Chef managing their dinner |

**Emits**:
```typescript
interface Emits {
  'update:menu': [{ menuTitle: string, menuDescription: string }]
  'update:allergens': [allergenIds: number[]]
  'advance-state': [newState: DinnerState]
  'cancel-dinner': []
}
```

---

#### 3. DinnerBookingForm (HOUSEHOLD BOOKING)

**Purpose**: Household booking interface
**Location**: `app/components/dinner/DinnerBookingForm.vue`
**Role**: Booking form, power mode, total price calculation

**Props**:
```typescript
interface Props {
  dinnerEvent: DinnerEventDetail
  orders: Order[]
  ticketPrices: TicketPrice[]
  formMode: FORM_MODES
}
```

**Emits**:
```typescript
interface Emits {
  'update-booking': [inhabitantId: number, dinnerMode: string, ticketPriceId: number]
  'update-all-bookings': [dinnerMode: string]
}
```

---

#### 4. Supporting Components

| Component | Location | Role |
|-----------|----------|------|
| `DinnerStatusStepper` | `chef/` | 5-step progress (PLANLAGT→ANNONCERET→BOOKING LUKKET→INDKØB→AFHOLDT) |
| `DinnerBudget` | `chef/` | 3-box layout (Indtægter, Rådighedsbeløb, Køkkenbidrag) + expandable |
| `CookingTeamCard` | `cooking-team/` | Team display with volunteer buttons |
| `KitchenPreparation` | `kitchen/` | Ticket statistics by dining mode |
| `AllergenMultiSelector` | `shared/` | Allergen checkbox list with statistics |

---

### Page Composition

#### /dinner page (Household Booking)

```vue
<DinnerDetailPanel :dinner-event-id="selectedDinnerId" :ticket-prices="ticketPrices">
  <template #main>
    <ChefMenuCard
      :dinner-event="dinnerEvent"
      :form-mode="FORM_MODES.VIEW"
      :show-state-controls="false"
      :show-allergens="true"
    >
      <!-- Household-specific: Booking form in slot -->
      <DinnerBookingForm
        :dinner-event="dinnerEvent"
        :orders="orders"
        :ticket-prices="ticketPrices"
        :form-mode="bookingFormMode"
        @update-booking="handleBookingUpdate"
      />
    </ChefMenuCard>
  </template>
</DinnerDetailPanel>
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 Fredag 24. januar 2025          [🟢 ANNONCERET]        [Heynabo →]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🍝 SPAGHETTI CARBONARA                                                │
│  Cremet pasta med bacon og parmesan                                    │
│                                                                         │
│  ALLERGENER: [🥛 Mælk] [🌾 Gluten] [🥚 Æg]                             │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  BOOKING (via slot - DinnerBookingForm)                                │
│  [Voksen] 👤 Anna 🍽️  |  [Voksen] 👤 Bob 🛍️  |  Total: 90 kr         │
│                           [ÆNDRE BOOKING]                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Hvem laver maden?                                                      │
│  <CookingTeamCard mode="monitor" />                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Køkkenstatistik                                                        │
│  <KitchenPreparation :orders="orders" />                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### /chef page (Chef is Chef)

```vue
<DinnerDetailPanel :dinner-event-id="selectedDinnerId" :ticket-prices="ticketPrices">
  <template #main>
    <ChefMenuCard
      :dinner-event="dinnerEvent"
      :form-mode="FORM_MODES.EDIT"
      :show-state-controls="true"
      :show-allergens="true"
      @update:menu="handleMenuUpdate"
      @update:allergens="handleAllergenUpdate"
      @advance-state="handleAdvanceState"
      @cancel-dinner="handleCancelDinner"
    />
    <!-- No slot content - chef controls are all inside ChefMenuCard -->
  </template>
</DinnerDetailPanel>
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 Fredag 24. januar 2025          [🟡 PLANLAGT]          [Heynabo →]  │
├─────────────────────────────────────────────────────────────────────────┤
│  ADMINISTRER MIDDAGEN                                                   │
│                                                                         │
│  Menu titel: [Spaghetti Carbonara___________]  [✏️]                    │
│  Beskrivelse: [Cremet pasta med bacon_______]                          │
│  Billede: [Upload / URL]                                               │
│                                                                         │
│  ALLERGENER: [🥛 Mælk] [🌾 Gluten]              [REDIGER ALLERGENER]   │
├─────────────────────────────────────────────────────────────────────────┤
│  ●━━━━━━━━○━━━━━━━━○━━━━━━━━○━━━━━━━━○                                 │
│  PLANLAGT  ANNONCERET  BOOKING   INDKØB    AFHOLDT                     │
├─────────────────────────────────────────────────────────────────────────┤
│  [Menu] ⚠️ Om 2d   [Indkøb] ⚠️ Om 4d   [Bestilling] ✅ Åben            │
├─────────────────────────────────────────────────────────────────────────┤
│  💰 1.781 kr (rådighedsbeløb)                                     [▼]  │
├─────────────────────────────────────────────────────────────────────────┤
│  [📢 ANNONCER MENU]                                    [❌ AFLYS]      │
├─────────────────────────────────────────────────────────────────────────┤
│  Hvem laver maden?                                                      │
│  <CookingTeamCard mode="monitor" />                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Køkkenstatistik                                                        │
│  <KitchenPreparation :orders="orders" />                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### /chef page (Team Member - Not Chef)

```vue
<DinnerDetailPanel :dinner-event-id="selectedDinnerId" :ticket-prices="ticketPrices">
  <template #main>
    <ChefMenuCard
      :dinner-event="dinnerEvent"
      :form-mode="FORM_MODES.VIEW"
      :show-state-controls="true"
      :show-allergens="true"
    />
  </template>
</DinnerDetailPanel>
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📅 Fredag 24. januar 2025          [🟡 PLANLAGT]          [Heynabo →]  │
├─────────────────────────────────────────────────────────────────────────┤
│  MIDDAG                                                                 │
│                                                                         │
│  🍝 Spaghetti Carbonara                                                │
│  Cremet pasta med bacon og parmesan                                    │
│                                                                         │
│  ALLERGENER: [🥛 Mælk] [🌾 Gluten]                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ●━━━━━━━━○━━━━━━━━○━━━━━━━━○━━━━━━━━○                                 │
│  PLANLAGT  ANNONCERET  BOOKING   INDKØB    AFHOLDT                     │
├─────────────────────────────────────────────────────────────────────────┤
│  [Menu] ⚠️ Om 2d   [Indkøb] ⚠️ Om 4d   [Bestilling] ✅ Åben            │
├─────────────────────────────────────────────────────────────────────────┤
│  Hvem laver maden?                                                      │
│  <CookingTeamCard mode="monitor" />                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Køkkenstatistik                                                        │
│  <KitchenPreparation :orders="orders" />                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Component Status

| Component | Status | Action |
|-----------|--------|--------|
| `DinnerMenuHero` | ⚠️ DELETE | Remove - functionality moved to ChefMenuCard |
| `DinnerDetailPanel` | ✅ REFACTOR | Update to slot-based layout container |
| `ChefMenuCard` | ✅ REFACTOR | Add menu content, allergens, make it THE content provider |
| `DinnerBookingForm` | ✅ EXISTS | Use in slot for household pages |
| `DinnerStatusStepper` | ✅ EXISTS | Use inside ChefMenuCard |
| `DinnerBudget` | ⚠️ REFACTOR | 3-box layout with expandable details |
| `CookingTeamCard` | ⚠️ REFACTOR | Add volunteer buttons in monitor mode |
| `CalendarMasterPanel` | ✅ EXISTS | Keep as-is |

---

### Key Principles

1. **ChefMenuCard is THE content provider** - all dinner info lives here
2. **DinnerDetailPanel is THE layout container** - slots for composition
3. **formMode from ~/types/form** - VIEW or EDIT, not custom mode strings
4. **Slot-based composition** - page-specific content via slots, not props
5. **DELETE DinnerMenuHero** - unnecessary abstraction layer

---

**ChefMenuCard (3 Modes: edit, view, compact)**

Merged from ChefMenuCard + ChefDinnerCard into ONE DRY component.

**Deadline Types** (SCHEDULED state only):
1. **Menu** - Chef must announce before booking deadline (⚠️ <72h, 🚨 overdue)
2. **Indkøb** - Chef must shop before dinner (⚠️ <72h, 🚨 <24h)
3. **Bestilling** - Informational: booking window open/closed

```
MODE: 'edit' (Detail Panel - Chef's cockpit)
┌──────────────────────────────────────────────────────────────────────────┐
│ ADMINISTRER MIDDAGEN                                        🟡 PLANLAGT │
├──────────────────────────────────────────────────────────────────────────┤
│ Menu titel: [Spaghetti Carbonara___________]  [✏️]                       │
│ Beskrivelse: [Cremet pasta med bacon_______]                             │
├──────────────────────────────────────────────────────────────────────────┤
│ ●━━━━━━━━○━━━━━━━━○━━━━━━━━○━━━━━━━━○                                    │
│ PLANLAGT  ANNONCERET  BOOKING   INDKØB    AFHOLDT                        │
│                       LUKKET    DONE                                     │
│                      (computed) (computed)                               │
├──────────────────────────────────────────────────────────────────────────┤
│ DEADLINES:                                                               │
│ [Menu] ⚠️ Om 2d   [Indkøb] ⚠️ Om 4d   [Bestilling] ✅ Åben   💰 1.500 kr │
├──────────────────────────────────────────────────────────────────────────┤
│ [📢 ANNONCER MENU]                                    [❌ AFLYS]         │
└──────────────────────────────────────────────────────────────────────────┘

MODE: 'view' (Detail Panel - Team member read-only)
┌──────────────────────────────────────────────────────────────────────────┐
│ MIDDAG                                                      🟡 PLANLAGT │
├──────────────────────────────────────────────────────────────────────────┤
│ 🍝 Spaghetti Carbonara                                                   │
│ Cremet pasta med bacon                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│ ●━━━━━━━━○━━━━━━━━○━━━━━━━━○━━━━━━━━○                                    │
│ PLANLAGT  ANNONCERET  BOOKING   INDKØB    AFHOLDT                        │
├──────────────────────────────────────────────────────────────────────────┤
│ [Menu] ⚠️ Om 2d   [Indkøb] ⚠️ Om 4d   [Bestilling] ✅ Åben               │
└──────────────────────────────────────────────────────────────────────────┘

MODE: 'compact' (Master Panel - Ledger/Agenda list item)
┌──────────────────────────────────────────────────────────────────────────┐
│ 24/01 │ 🍝 Spaghetti Carbonara │ 🟡 PLANLAGT │ [Menu]⚠️2d │ 💰 1.500 kr │
└──────────────────────────────────────────────────────────────────────────┘

Deadline colors: ✅ green (OK), ⚠️ warning (<72h), 🚨 error (overdue/<24h)
```

---

**DinnerStatusStepper (5 States)**

Shows chef's progress through dinner lifecycle. **AFLYST is NOT a step** - cancelled dinners get red stripe overlay on the card instead.

```
DB States:        PLANLAGT → ANNONCERET →                              → AFHOLDT
Computed States:                          BOOKING LUKKET → INDKØB DONE

┌──────────────────────────────────────────────────────────────────────────┐
│  ●━━━━━━━━○━━━━━━━━○━━━━━━━━○━━━━━━━━○                                   │
│  1        2        3        4        5                                   │
│                                                                          │
│  PLANLAGT   ANNONCERET   BOOKING    INDKØB     AFHOLDT                   │
│  (DB)       (DB)         LUKKET     DONE       (DB)                      │
│                          (computed)  (computed)                          │
│                                                                          │
│  Step logic:                                                             │
│  1. PLANLAGT: state=SCHEDULED, no menu                                   │
│  2. ANNONCERET: state=ANNOUNCED                                          │
│  3. BOOKING LUKKET: canModifyOrders()=false (computed from date)         │
│  4. INDKØB DONE: chef marks groceries purchased (future: checkbox)       │
│  5. AFHOLDT: state=CONSUMED                                              │
└──────────────────────────────────────────────────────────────────────────┘

CANCELLED DINNER (separate visual, not in stepper):
┌──────────────────────────────────────────────────────────────────────────┐
│ ████████████████████████████████████████████████████████████████████████ │
│ ██  A F L Y S T  ██  Red diagonal stripe overlay on entire card     ██  │
│ ████████████████████████████████████████████████████████████████████████ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

**DinnerBudget (3-Box Layout with Expandable Table)**

Used in ChefMenuCard (NOT in TeamRoleStatus).

```
Compact mode (collapsed):
┌──────────────────────────────────────────────────────────────────────────┐
│ 💰 1.781 kr                                                         [▼] │
└──────────────────────────────────────────────────────────────────────────┘

Full mode (expanded - 3-box with table):
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ 💰 INDTÆGTER       │  │ 🛒 RÅDIGHEDSBELØB  │  │ 🏠 KØKKENBIDRAG    │
│     1.875 kr       │  │     1.781 kr       │  │       94 kr        │
│  (45 billetter)    │  │   (inkl. moms)     │  │    (5% af salg)    │
└────────────────────┘  └────────────────────┘  └────────────────────┘
┌──────────────────────────────────────────────────────────────────────────┐
│ DETALJER                                                            [▲] │
├──────────────────────────────────────────────────────────────────────────┤
│ Billettype        │ Antal │ Stk pris │ Total                            │
│ Voksen            │    30 │   50 kr  │ 1.500 kr                         │
│ Barn              │    12 │   25 kr  │   300 kr                         │
│ Baby              │     3 │    0 kr  │     0 kr                         │
├──────────────────────────────────────────────────────────────────────────┤
│ Indtægter (inkl. moms)                              1.875 kr            │
│ Køkkenbidrag (5%)                                    -94 kr             │
│ Rådighedsbeløb (inkl. moms)                        1.781 kr             │
│ Rådighedsbeløb (ex moms /1.25)                     1.425 kr ← indkøb    │
└──────────────────────────────────────────────────────────────────────────┘

Formula: Indtægter - Køkkenbidrag (5%) = Rådighedsbeløb
         Rådighedsbeløb / 1.25 = ex moms (for grocery shopping)
Config:  app.config.ts → useSeason: kitchenBaseRatePercent=5, vatPercent=25
```

---

**CookingTeamCard (Volunteer Buttons in Monitor Mode)**

Volunteer buttons always visible in `monitor` mode (used in /chef and /dinner pages).

```
MODE: 'monitor' (with volunteer buttons - always visible)
┌──────────────────────────────────────────────────────────────────────────┐
│ 🍳 Team A   👥 4   📅 12                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│ 👨‍🍳 Chef: [Anna H]                                                       │
│ 🥄 Kokke: [Lars B] [Maria S] [Peter J]                                   │
│ 👶 Hjælpere: (ingen)                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│ [👨‍🍳 BLIV CHEFKOK]  [🥄 BLIV KOK]  [👶 BLIV HJÆLPER]                     │
└──────────────────────────────────────────────────────────────────────────┘

Already volunteered:
┌──────────────────────────────────────────────────────────────────────────┐
│ ✅ Du er tilmeldt som KOK                              [❌ AFMELD]       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Implementation Status

**Completed (2025-01-28)**:
- ✅ `DinnerDetailPanel.vue` created with component-local data fetching
- ✅ `CalendarMasterPanel.vue` created with slot-based composition
- ✅ `/dinner/index.vue` refactored to use shared components (187 lines → ~70% reduction)
- ✅ `/chef/index.vue` refactored to use shared components (327 lines → 225 lines, ~31% reduction)

**Code Reduction Summary**:
- **Before**: 514 total lines across both pages
- **After**: ~412 total lines (shared components handle the rest)
- **Eliminated**: ~100 lines of duplicate code
- **Benefit**: Single source of truth for dinner detail panel structure

**Next Steps (Phase 6 - Detail Panel Refactoring)**:
- [ ] Extract `DinnerMenuContent` and `DinnerAllergenSection` from DinnerMenuHero
- [ ] Refactor `ChefMenuCard` with 5-step stepper (no AFLYST), deadlines, action buttons
- [ ] Refactor `DinnerBudget` to 3-box layout with expandable details
- [ ] Add volunteer buttons to `CookingTeamCard` (mode='manage')
- [ ] Add config to `app.config.ts` (kitchenBaseRatePercent, vatPercent)
- [ ] Add budget helpers to `useSeason`
- [ ] Component tests for refactored components

---

## 📝 Executive Summary

**Feature**: Team home for cooking team members with calendar and menu management
**Route**: `/chef` with query params `?team=X&date=Y`
**Users**: All team members (view), chefs (edit when mode='chef')
**Architecture**: Reuses existing components, follows ADR-007 component-local data pattern

### Business Requirements

- ✅ Team members view their cooking team's schedule and dinner assignments
- ⚠️ Chefs edit menu details (title, description, picture, allergens) - *Partial: viewing only*
- ❌ Deadline tracking with warnings (⚠️ < 3 days, 🚨 overdue)
- ❌ Inline saves for menu fields
- ❌ Picture upload
- ❌ State transitions (SCHEDULED → ANNOUNCED → CONSUMED)

### Key Architecture Decisions

1. **Route**: `/chef?team=3&date=09/12/2025` (date-based, not ID)
2. **Master/Detail**: TeamCalendarDisplay (left) + DinnerMenuHero (right)
3. **Permissions**: `isChefFor()` determines mode='chef' vs mode='view'
4. **Data Fetching**: Component-local `useAsyncData` watching dinner selection (ADR-007)
5. **Reuse**: Maximum component reuse (TeamCalendarDisplay, DinnerMenuHero, CookingTeamCard, KitchenPreparation)

---

## Implementation Plan (Condensed)

### Phase 5: Menu Editing (Next)
- [ ] `AllergenMultiSelector` - Extract from AdminAllergies, reuse in DinnerMenuHero
- [ ] Inline field saves - Title, description with optimistic updates
- [ ] Picture upload modal - Conditional (Heynabo URL vs file upload)
- [ ] State transition: SCHEDULED → ANNOUNCED

### Phase 6: Deadline System
- [ ] `useChefDeadlines()` - Calculate deadlines, warning thresholds
- [ ] Deadline badges - ⚠️ Warning (< 3 days), 🚨 Overdue (past deadline)
- [ ] Calendar overlays - Show deadline status on calendar dates

### Phase 7: Testing & Polish
- [ ] Component tests: MyTeamSelector, TeamCalendarDisplay
- [ ] E2E tests: Chef workflow, team switching, permission guards
- [ ] UX polish: Loading states, error handling, mobile responsiveness

---

## Original Detailed Plan (Archive)

<details>
<summary>Click to expand original detailed implementation plan (800+ lines)</summary>

### Phase 1: Foundation Components

#### 1.1 DinnerStateIndicator Component

**Purpose**: Status badge with deadline warnings
**File**: `app/components/shared/DinnerStateIndicator.vue`

```vue
<!--
┌─────────────────────────────────────┐
│ DinnerStateIndicator - Status Badge │
├─────────────────────────────────────┤
│                                     │
│ USAGE EXAMPLES:                     │
│                                     │
│ 🟡 PLANLAGT                         │ ← SCHEDULED (COLOR.mocha)
│                                     │
│ 🟡 PLANLAGT                         │ ← SCHEDULED + warning
│ ⚠️ Annoncér inden torsdag 12:00     │   (COLOR.warning badge)
│                                     │
│ 🟡 PLANLAGT                         │ ← SCHEDULED + overdue
│ 🚨 Deadline overskredet!            │   (COLOR.error badge)
│                                     │
│ 🟢 ANNONCERET                       │ ← ANNOUNCED (COLOR.success)
│                                     │
│ ⚪ AFVIKLET                         │ ← CONSUMED (COLOR.neutral)
│                                     │
│ 🔴 AFLYST                           │ ← CANCELLED (COLOR.error)
│                                     │
└─────────────────────────────────────┘

PROPS:
  - state: DinnerState (from DinnerStateSchema.enum)
  - announceDeadline?: Date
  - size?: 'sm' | 'md' | 'lg' (default: 'md')

COMPUTED:
  - stateConfig: { color, icon, label }
  - deadlineWarning: { show, text, color }
    - Yellow if < 3 days, Red if overdue
-->
```

**Implementation checklist**:
- [ ] Import `DinnerStateSchema` from `useBookingValidation()`
- [ ] Use `COLOR.*` from design system
- [ ] Deadline logic: Compare `announceDeadline` with `new Date()`
- [ ] Responsive sizes via `SIZES` from design system

---

### 1.2 ✅ AllergenMultiSelector Component

**Purpose**: Multi-select checkbox list for allergens
**File**: `app/components/shared/AllergenMultiSelector.vue`

---

## Phase 2: Deadline System

### 2.1 useChefDeadlines Composable

**Purpose**: Calculate deadlines and warnings
**File**: `app/composables/useChefDeadlines.ts`

```typescript
/**
 * useChefDeadlines - Deadline calculation for chef responsibilities
 *
 * BUSINESS RULES:
 * - Announce deadline = dinnerDate - season.ticketIsCancellableDaysBefore
 * - Warning threshold = 3 days before deadline
 * - Overdue = past deadline and still SCHEDULED state
 *
 * USAGE:
 * const { calculateDeadline } = useChefDeadlines()
 * const deadline = calculateDeadline(dinner, season)
 *
 * RETURNS:
 * {
 *   announceDeadline: Date
 *   isOverdue: boolean (past deadline && SCHEDULED)
 *   isWarning: boolean (< 3 days && !overdue)
 *   daysUntilDeadline: number
 *   warningText: string ("Annoncér inden...")
 * }
 */
```

**Implementation checklist**:
- [ ] Calculate `announceDeadline` from dinner date
- [ ] Compare with current date for warning/overdue
- [ ] Generate human-readable warning text (Danish)
- [ ] Unit tests for edge cases (same day, past, future)

---

### 2.2 ChefPermissions

**Purpose**: Permission guards for chef actions
**File**: `app/composables/useChefPermissions.ts`

```typescript
/**
 * useChefPermissions - Permission checks for chef actions
 *
 * PERMISSION MODEL:
 * - canViewTeam: User is on cooking team (any role)
 * - canEditDinner: dinner.chefId === currentUser.inhabitantId
 * - canCancelDinner: Same as canEditDinner
 *
 * USAGE:
 * const { canEditDinner, canViewTeam } = useChefPermissions()
 * const editable = canEditDinner(selectedDinner.value)
 *
 * RETURNS:
 * {
 *   canEditDinner: (dinner: DinnerEvent) => boolean
 *   canViewTeam: (teamId: number, teams: CookingTeam[]) => boolean
 *   canCancelDinner: (dinner: DinnerEvent) => boolean
 * }
 */
```

**Implementation checklist**:
- [ ] Get current user from `useAuthStore()`
- [ ] Permission checks based on inhabitantId
- [ ] Export reactive computeds for v-if usage

---

### 2.3 ChefDinnerCard Component

**Purpose**: Master list item with deadline warnings
**File**: `app/components/chef/ChefDinnerCard.vue`

```vue
<!--
┌─────────────────────────────────────┐
│ ChefDinnerCard - Master List Item   │
├─────────────────────────────────────┤
│                                     │
│ SCHEDULED STATE (with warning):     │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 PLANLAGT                     │ │
│ │ ⚠️ Annoncér inden torsdag 12:00 │ │
│ │ Onsdag 15. jan 2025             │ │
│ │ Madhold 3: Dig + Bob + Clara    │ │
│ ├─────────────────────────────────┤ │
│ │ [Ingen menu endnu]              │ │
│ │                                 │ │
│ │     [📝 PLANLÆG MENU]           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ SCHEDULED (overdue):                │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 PLANLAGT                     │ │
│ │ 🚨 Deadline overskredet!        │ │
│ │ Torsdag 16. jan 2025            │ │
│ ├─────────────────────────────────┤ │
│ │ 🍝 Spaghetti Carbonara          │ │
│ │ Menu klar, ikke annonceret      │ │
│ │                                 │ │
│ │     [📢 ANNONCÉR NU!]           │ │ ← COLOR.error urgent
│ └─────────────────────────────────┘ │
│                                     │
│ ANNOUNCED STATE:                    │
│ ┌─────────────────────────────────┐ │
│ │ 🟢 ANNONCERET                   │ │
│ │ Fredag 17. jan 2025             │ │
│ ├─────────────────────────────────┤ │
│ │ 🍕 Pizza Margherita             │ │
│ │ Bestilt: 45 personer            │ │
│ │ Omkostninger: 2.400 kr          │ │
│ │                                 │ │
│ │      [📊 SE KØKKENINFO]         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ CONSUMED STATE:                     │
│ ┌─────────────────────────────────┐ │
│ │ ⚪ AFVIKLET                     │ │
│ │ Mandag 13. jan 2025             │ │
│ ├─────────────────────────────────┤ │
│ │ 🥗 Salat Bar                    │ │
│ │ Serveret: 52 personer           │ │
│ │ Forbrug: 1.800 kr               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ CLICKED: Emits select event         │
│ ACTIVE: Shows selection ring        │
│                                     │
└─────────────────────────────────────┘

PROPS:
  - dinner: DinnerEvent
  - season: Season (for deadline calc)
  - selected?: boolean

EMITS:
  - select: number (dinner ID)

USES:
  - DinnerStateIndicator (for status + deadline)
  - useChefDeadlines() (for deadline calc)
  - useChefPermissions() (for action buttons)
-->
```

**Implementation checklist**:
- [ ] Use `DinnerStateIndicator` with deadline
- [ ] Calculate deadline with `useChefDeadlines()`
- [ ] Show different CTAs based on state
- [ ] Selection state with visual feedback (ring)

---

### 2.4 ChefCalendarDisplay Component

**Purpose**: Wrapper adding deadline overlays to calendar
**File**: `app/components/chef/ChefCalendarDisplay.vue`

```vue
<!--
┌─────────────────────────────────────┐
│ ChefCalendarDisplay - With Deadlines│
├─────────────────────────────────────┤
│                                     │
│ Januar 2025                         │
│                                     │
│ Ma Ti On To Fr Lø Sø                │
│        1  2  3  4  5                │
│  6  7  8  9 10 11 12                │
│ 13 14 🟡⚠ 16 🔴 18 19              │ ← Deadline overlays
│ 20 21 🟢 23 24 25 26                │   on calendar dates
│ 27 28 29 30 31                      │
│                                     │
│ Legende:                            │
│ 🟡⚠ Annoncér snart (< 3 dage)      │
│ 🔴 Deadline overskredet             │
│ 🟢 Annonceret OK                    │
│ ⚪ Afviklet                         │
│                                     │
└─────────────────────────────────────┘

ARCHITECTURE: Wrapper Pattern
  - Renders TeamCalendarDisplay inside
  - Absolute-positioned badges on top
  - Calculates overlay positions from dates

PROPS:
  - seasonDates: DateRange
  - dinnerEvents: DinnerEvent[]
  - season: Season (for deadline calc)
  - selectedDate?: Date

EMITS:
  - date-selected: Date

USES:
  - TeamCalendarDisplay (base calendar)
  - useChefDeadlines() (for each dinner)
  - UBadge for overlay indicators
-->
```

**Implementation checklist**:
- [ ] Wrap `TeamCalendarDisplay` with `position: relative`
- [ ] Calculate badge positions for each date
- [ ] Use `useChefDeadlines()` for each dinner
- [ ] Show legend with color meanings

---

## Phase 3: Edit Capabilities

### 3.1 useMenuPictureUpload Composable

**Purpose**: Handle picture upload logic
**File**: `app/composables/useMenuPictureUpload.ts`

```typescript
/**
 * useMenuPictureUpload - Picture upload helper
 *
 * LOGIC:
 * - If menuPictureUrl exists (from Heynabo) → Show with edit pencil
 * - Click pencil → Show modal with URL display + file uploader
 * - Upload → POST /api/upload/menu-picture → Returns URL
 *
 * USAGE:
 * const { uploadPicture, isHeynaboUrl, pictureState } = useMenuPictureUpload()
 *
 * RETURNS:
 * {
 *   uploadPicture: (file: File) => Promise<string>
 *   isHeynaboUrl: (url: string) => boolean
 *   pictureState: Ref<'idle' | 'uploading' | 'error'>
 *   pictureError: Ref<string | null>
 * }
 */
```

**Implementation checklist**:
- [ ] File upload with `FormData`
- [ ] Mock `/api/upload/menu-picture` endpoint (returns static URL for dev)
- [ ] Error handling for file size, type
- [ ] Loading state tracking

---

### 3.2 ChefMenuEditor Component

**Purpose**: Menu editing form with inline saves
**File**: `Dinnerhero` + chefmenueditor

```vue
<!--
┌─────────────────────────────────────┐
│ ChefMenuEditor - SCHEDULED State    │
├─────────────────────────────────────┤
│                                     │
│ MENU DETALJER                       │
├─────────────────────────────────────┤
│                                     │
│ Menu Titel *                        │
│ ┌─────────────────────────────────┐ │
│ │ Spaghetti Carbonara         💾 │ │ ← UInput + save icon
│ └─────────────────────────────────┘ │   @blur="saveField"
│                                     │   trailing-icon (loading state)
│ Beskrivelse                         │
│ ┌─────────────────────────────────┐ │
│ │ Cremet pasta med bacon...       │ │ ← UTextarea
│ │                             💾  │ │   Save in corner
│ └─────────────────────────────────┘ │
│                                     │
│ Menu Billede                        │
│ ┌─────────────────────────────────┐ │
│ │ [Photo shows: Carbonara dish]   │ │ ← Image display
│ │                            ✏️   │ │   Edit pencil button
│ └─────────────────────────────────┘ │   onClick → Show modal
│                                     │
├─────────────────────────────────────┤
│ ALLERGENER I MENU                   │
├─────────────────────────────────────┤
│                                     │
│ <AllergenSelector                   │ ← Component
│   v-model="selectedAllergens"       │   with save button
│   @save="saveAllergens" />          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [📢 ANNONCÉR MENU]                  │ ← Primary action
│                                     │   (calls store method)
│ [❌ AFLYS FÆLLESSPISNING]           │ ← Destructive action
│                                     │   (confirmation modal)
└─────────────────────────────────────┘

INLINE SAVE PATTERN:
  - Each field saves independently on blur
  - Loading state per field (trailing icon)
  - Error state shows red border + message
  - Optimistic update with rollback on error

PROPS:
  - dinner: DinnerEvent
  - season: Season
  - readonly?: boolean

EMITS:
  - announce: number (dinner ID)
  - cancel: number (dinner ID)

USES:
  - AllergenSelector component
  - useMenuPictureUpload() composable
  - usePlanStore().updateDinnerEventField()
-->
```

**Implementation checklist**:
- [ ] Field-level save states: `saveStates: Record<string, 'idle' | 'saving' | 'error'>`
- [ ] Save on blur: `@blur="saveField('menuTitle', menuTitle)"`
- [ ] Picture modal with `UModal`
- [ ] AllergenSelector integration
- [ ] Announce button calls store method

---

### 3.3 Store Extensions

**Purpose**: Add dinner update methods to plan store
**File**: `app/stores/plan.ts`

```typescript
/**
 * PLAN STORE EXTENSIONS - Chef/Team Management
 *
 * NEW METHODS:
 *
 * 1. updateDinnerEventField(dinnerId, field, value)
 *    - Optimistic update
 *    - POST /api/admin/dinner-event/:id { [field]: value }
 *    - Updates selectedDinnerEvent and list
 *    - Returns updated dinner
 *
 * 2. announceDinner(dinnerId)
 *    - POST /api/admin/dinner-event/:id/announce
 *    - Transitions SCHEDULED → ANNOUNCED
 *    - Mocked Heynabo integration
 *    - Returns updated dinner
 *
 * 3. cancelDinner(dinnerId, reason)
 *    - POST /api/admin/dinner-event/:id/cancel
 *    - Transitions to CANCELLED
 *    - Shows confirmation modal
 *    - Returns updated dinner
 *
 * 4. uploadMenuPicture(dinnerId, file)
 *    - POST /api/upload/menu-picture (multipart)
 *    - Updates menuPictureUrl
 *    - Returns URL
 */
```

**Implementation checklist**:
- [ ] Extend existing `usePlanStore()`
- [ ] Add methods following store pattern
- [ ] Mock `/api/admin/dinner-event/:id/announce` endpoint
- [ ] Mock `/api/admin/dinner-event/:id/cancel` endpoint
- [ ] Optimistic updates with rollback

---

## Phase 4: Page Integration

### 4.1 Auto-Redirect Page

**Purpose**: Detect user's team and redirect
**File**: `app/pages/chefing/index.vue`

```vue
<!--
┌─────────────────────────────────────┐
│ /chefing - Team Auto-Detection      │
├─────────────────────────────────────┤
│                                     │
│ SCENARIO 1: User on ONE team       │
│ → Auto-redirect to /chefing/[id]   │
│                                     │
│ SCENARIO 2: User on MULTIPLE teams │
│ → Show team selector                │
│ ┌─────────────────────────────────┐ │
│ │ Vælg dit køkkenhold:            │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ 🟢 Madhold 1                │ │ │
│ │ │ 8 medlemmer | 12 middage    │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ 🟣 Madhold 3                │ │ │
│ │ │ 6 medlemmer | 10 middage    │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ SCENARIO 3: User on NO teams       │
│ → Empty state alert                 │
│ "Du er ikke tildelt et køkkenhold" │
│                                     │
└─────────────────────────────────────┘

LOGIC:
  onMounted(() => {
    const myTeams = selectedSeason.value.cookingTeams.filter(...)

    if (myTeams.length === 1) {
      navigateTo(`/chefing/${myTeams[0].id}`)
    } else if (myTeams.length === 0) {
      // Show empty state
    }
    // else: show selector (multiple teams)
  })
-->
```

**Implementation checklist**:
- [ ] Get teams from `usePlanStore()`
- [ ] Filter by current user's inhabitantId
- [ ] Auto-redirect if single team
- [ ] Show selector if multiple teams
- [ ] Empty state if no teams

---

### 4.2 Main Page with Master/Detail

**Purpose**: Team cooking management interface
**File**: `app/pages/chefing/[teamId].vue`

```vue
<!--
═══════════════════════════════════════════════════════════════════════════
MOBILE VIEW - /chefing/[teamId]?dinner=123
═══════════════════════════════════════════════════════════════════════════
┌─────────────────────────────────────┐
│ 👥 Madhold 3                        │ ← UPage header (team name)
│ Du er chefkok                       │ ← Role subtitle
├─────────────────────────────────────┤
│ Hold: [Madhold 3 ▼]                 │ ← Team selector (all teams)
│ [📋 Liste] [📅 Kalender]           │ ← View toggle
├─────────────────────────────────────┤
│                                     │
│ LIST VIEW:                          │
│ ┌─────────────────────────────────┐ │
│ │ <ChefDinnerCard                 │ │
│ │   v-for="dinner in teamDinners" │ │
│ │   :selected="dinner.id === X" /> │ │
│ └─────────────────────────────────┘ │
│                                     │
│ OR CALENDAR VIEW:                   │
│ ┌─────────────────────────────────┐ │
│ │ <ChefCalendarDisplay            │ │
│ │   :dinnerEvents="teamDinners"   │ │
│ │   @date-selected="onDateClick" />│ │
│ └─────────────────────────────────┘ │
│                                     │
│ SELECTED DINNER DETAIL:             │
│ ┌─────────────────────────────────┐ │
│ │ <ChefDinnerDetail               │ │
│ │   :dinner="selectedDinner"      │ │
│ │   :readonly="!canEdit" />        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
DESKTOP VIEW - /chefing/[teamId]
═══════════════════════════════════════════════════════════════════════════
┌────────────────────────────────────────────────────────────────────────┐
│ 👥 Madhold 3 (Du er chefkok)                                           │
├──────────────────────┬─────────────────────────────────────────────────┤
│ MASTER (25%)         │ DETAIL (75%)                                    │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Hold: [Madhold 3 ▼] │ <ChefDinnerDetail                               │
│                      │   :dinner="selectedDinner"                      │
│ [📋 Liste][📅 Kal]  │   :season="selectedSeason"                      │
│                      │   :readonly="!canEdit" />                       │
│ <ChefDinnerCard      │                                                 │
│   v-for="dinner"     │ [Shows ChefMenuEditor or kitchen stats         │
│   :selected="..." /> │  based on dinner.state]                        │
│                      │                                                 │
│ OR                   │                                                 │
│                      │                                                 │
│ <ChefCalendarDisplay │                                                 │
│   :dinnerEvents="..." │                                                 │
│   @date-selected="..." │                                                │
│                      │                                                 │
└──────────────────────┴─────────────────────────────────────────────────┘

ROUTE PARAMS:
  - teamId: number (from route)
  - ?dinner=123 (query param - selected dinner)
  - ?view=calendar|list (query param - master view mode)

DATA FLOW:
  1. Load plan store (season, teams, dinners)
  2. Filter dinners by selectedTeamId
  3. Auto-select next dinner (or from ?dinner=X)
  4. Check permissions (canEdit)
  5. Render detail based on state + permissions

STORES:
  - usePlanStore() - Dinners, teams, season
  - useAuthStore() - Current user
  - useAllergiesStore() - For allergen selector

COMPOSABLES:
  - useChefDeadlines() - Deadline calculations
  - useChefPermissions() - Permission checks
  - useQueryParam() - URL state management
-->
```

**Implementation checklist**:
- [ ] Team selector in header (all teams visible)
- [ ] List/Calendar toggle with query param
- [ ] Filter dinners by `cookingTeamId`
- [ ] Auto-select next dinner or from query param
- [ ] Permission check before showing edit UI
- [ ] Responsive master/detail layout

---

### 4.3 ChefDinnerDetail Component

**Purpose**: Switch between editor and kitchen view
**File**: `app/components/chef/ChefDinnerDetail.vue`

```vue
<!--
┌─────────────────────────────────────┐
│ ChefDinnerDetail - State Switcher   │
├─────────────────────────────────────┤
│                                     │
│ SCHEDULED STATE:                    │
│ ┌─────────────────────────────────┐ │
│ │ <ChefMenuEditor                 │ │
│ │   v-if="state === SCHEDULED     │ │
│ │          && !readonly"          │ │
│ │   :dinner="dinner"              │ │
│ │   @announce="onAnnounce"        │ │
│ │   @cancel="onCancel" />         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ OR READONLY VIEW:                   │
│ ┌─────────────────────────────────┐ │
│ │ <DinnerMenuHero                 │ │
│ │   v-if="readonly"               │ │
│ │   :dinner-event-id="dinner.id" />│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ANNOUNCED/CONSUMED STATE:           │
│ ┌─────────────────────────────────┐ │
│ │ <UPageHero                      │ │
│ │   :style="backgroundImage" />   │ │ ← Menu photo hero
│ │                                 │ │
│ │ <UCard>                         │ │
│ │   <UFormField                   │ │   ← Grocery costs
│ │     label="Indkøbsomkostninger">│ │     (only if chef)
│ │     <UInput                     │ │
│ │       v-model="totalCost"       │ │
│ │       type="number"             │ │
│ │       trailing-icon="💾" />    │ │
│ │   </UFormField>                 │ │
│ │ </UCard>                        │ │
│ │                                 │ │
│ │ <KitchenPreparation             │ │ ← Reused component
│ │   :orders="dinner.orders" />    │ │
│ │                                 │ │
│ │ <CookingTeamCard                │ │ ← Reused component
│ │   :team-id="dinner.cookingTeamId"│ │   mode="monitor"
│ │   mode="monitor" />             │ │
│ │                                 │ │
│ │ [✅ MARKER AFVIKLET (dev)]      │ │ ← Dev button
│ │ [❌ AFLYS DINNER]               │ │ ← Cancel button
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

PROPS:
  - dinner: DinnerEvent
  - season: Season
  - readonly: boolean (from permission check)

EMITS:
  - announce: number
  - cancel: number
  - update:totalCost: number

LOGIC:
  - SCHEDULED + !readonly → ChefMenuEditor
  - SCHEDULED + readonly → DinnerMenuHero (read-only)
  - ANNOUNCED/CONSUMED → Kitchen view with stats
-->
```

**Implementation checklist**:
- [ ] State-based component switching
- [ ] Reuse `DinnerMenuHero`, `KitchenPreparation`, `CookingTeamCard`
- [ ] Grocery cost input (inline save)
- [ ] Cancel button (both states)
- [ ] Dev button for marking consumed

---

## Testing Strategy

### Unit Tests
- [ ] `useChefDeadlines` - Deadline calculations
  - Same day deadline
  - Past deadline (overdue)
  - Future deadline (warning threshold)
  - Edge case: Exactly 3 days before
- [ ] `useChefPermissions` - Permission logic
  - Chef can edit their dinner
  - Team member cannot edit
  - User can view their team
  - User cannot view other team
- [ ] `DinnerStateIndicator` - Badge rendering
  - All states render correctly
  - Deadline warnings show/hide
  - Color coding matches design system

### Component Tests
- [ ] `AllergenSelector` - Checkbox interactions
  - Initial selection from modelValue
  - Toggle checkbox updates modelValue
  - Save button emits event
  - Readonly mode disables checkboxes
- [ ] `ChefDinnerCard` - Click/selection
  - Click emits select event
  - Selected state shows visual feedback
  - Deadline warnings display correctly
  - CTA buttons based on state
- [ ] `ChefMenuEditor` - Inline saves
  - Blur triggers save
  - Loading state during save
  - Error state on failure
  - Rollback on error

### E2E Tests
- [ ] Chef workflow: SCHEDULED → edit → ANNOUNCED
  1. Navigate to /chefing (auto-redirects to team)
  2. Select SCHEDULED dinner
  3. Edit menu title, description
  4. Select allergens
  5. Click "ANNONCÉR MENU"
  6. Verify state transition to ANNOUNCED
- [ ] Team member view (readonly)
  1. Login as team member (not chef)
  2. Navigate to /chefing/[teamId]
  3. Verify no edit UI visible
  4. Verify can view kitchen stats
- [ ] Shift swapping (view other teams)
  1. Change team selector to different team
  2. Verify URL updates
  3. Verify dinner list changes
  4. Verify can view other team's schedule
- [ ] Deadline warnings display
  1. Mock dinners with various deadlines
  2. Verify warning badges show correctly
  3. Verify overdue dinners highlighted red
  4. Verify calendar overlay badges

---

## Implementation Sequence

### Week 1: Foundation
- [ ] **Day 1**: `DinnerStateIndicator`, `AllergenSelector` components
  - Create components with props/emits
  - Add unit tests
  - Document with ASCII mockups in comments
- [ ] **Day 2**: `useChefDeadlines`, `useChefPermissions` composables
  - Implement deadline calculation logic
  - Implement permission checks
  - Add comprehensive unit tests
- [ ] **Day 3**: Store extensions (update methods, API endpoints)
  - Add `updateDinnerEventField()` to bookings store
  - Implement `/api/admin/dinner-event/:id/announce` endpoint (state transition + Heynabo integration)
  - Implement `/api/admin/dinner-event/:id/cancel` endpoint (state transition + refund logic)

### Week 2: Core Components
- [ ] **Day 1**: `ChefDinnerCard` with deadline warnings
  - Integrate `DinnerStateIndicator`
  - Use `useChefDeadlines()` for calculations
  - Add selection state handling
- [ ] **Day 2**: `ChefCalendarDisplay` wrapper
  - Wrap `TeamCalendarDisplay`
  - Add deadline badge overlays
  - Implement legend
- [ ] **Day 3**: `ChefMenuEditor` with inline saves
  - Implement field-level save states
  - Add picture upload modal
  - Integrate `AllergenSelector`

### Week 3: Integration
- [ ] **Day 1**: `ChefDinnerDetail` switcher component
  - Implement state-based switching
  - Integrate reused components
  - Add grocery cost input
- [ ] **Day 2**: `/chefing/[teamId].vue` page with master/detail
  - Build master/detail layout
  - Add team selector
  - Implement list/calendar toggle
- [ ] **Day 3**: `/chefing/index.vue` auto-redirect
  - Implement team detection logic
  - Add team selector for multiple teams
  - Add empty state

### Week 4: Polish & Testing
- [ ] **Day 1**: Picture upload integration
  - Implement `useMenuPictureUpload()`
  - Create picture edit modal
  - Test file upload flow
- [ ] **Day 2**: E2E tests
  - Write chef workflow test
  - Write team member readonly test
  - Write deadline display test
- [ ] **Day 3**: Bug fixes, UX polish
  - Address test failures
  - UX improvements based on manual testing
  - Documentation updates

---

## ADR Compliance Checklist

- [ ] **ADR-001**: Import enums from validation composables (`DinnerStateSchema.enum`)
- [ ] **ADR-006**: URL-based navigation with query params (`?dinner=123&mode=edit`)
- [ ] **ADR-007**: Use `useAsyncData` in store for dinner updates, reactive initialization
- [ ] **ADR-008**: ~~`useEntityFormManager`~~ (Not applicable - using inline saves pattern)
- [ ] **ADR-010**: Work with domain types, let repository handle serialization

---

## Color Harmony & Design System

### Primary Palette
- **Page theme**: `COLOR.mocha` (Pantone 2025 - warm, chef-focused)
- **Accents**: `COLOR.peach` (consistency with member-facing dinner page)

### Status Colors (Dinner State Badges)
- 🟡 **SCHEDULED**: `COLOR.mocha` - Warm amber (ready to plan menu)
- 🟢 **ANNOUNCED**: `COLOR.success` - Green (published, bookable by members)
- ⚪ **CONSUMED**: `COLOR.neutral` - Gray (dinner completed, archived)
- ⚫ **CANCELLED**: `'neutral'` with dark variant - Black/dark gray (cancelled event, NOT red - red is reserved for overdue deadlines)

### Deadline Warnings (Separate from State - Additional Indicators)
**Three deadline types:**
1. **Menu Announcement** (chef responsibility): Must announce before booking deadline
2. **Booking Deadline** (member action): `season.ticketIsCancellableDaysBefore` days before dinner (typically 10 days)
3. **Grocery Shopping** (chef action): Before dinner date

**Warning levels:**
- ⚠️ **Coming Soon** (< 3 days to deadline): `COLOR.warning` - Amber badge
- 🚨 **Overdue** (past deadline): `COLOR.error` - Red badge (ONLY use of red in this feature)

**Display principle:** Deadlines are additive warnings, not state replacements. A dinner can be SCHEDULED (mocha badge) AND have an overdue warning (red badge) simultaneously.

### Kitchen Stats
- Keep existing vibrant Pantone colors: `COMPONENTS.kitchenPanel.*`
- TAKEAWAY: `COLOR.warning` (amber)
- DINEIN: `COLOR.party` (burgundy)
- DINEINLATE: `COLOR.orange`
- RELEASED: `COLOR.neutral` (gray)

---

## Success Criteria

✅ **Feature Complete When:**
- [ ] All components implemented and tested
- [ ] Inline saves work with optimistic updates
- [ ] Deadline warnings display correctly
- [ ] Team selector allows viewing all teams
- [ ] Permission guards prevent unauthorized edits
- [ ] E2E tests cover main workflows
- [ ] ADR compliance verified
- [ ] Mobile-first responsive design validated
- [ ] ASCII mockups documented in component comments

---

## Notes & Decisions Log

**2025-01-15**: Feature proposal created and approved by themathmagician

---

**Next Steps**: Begin Phase 1 implementation (Foundation Components) 🚀
