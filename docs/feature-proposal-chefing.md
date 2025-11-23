# 🎯 Chef/Team Management Feature - Implementation Workplan

**Status**: 95% Complete - Final Polish | **Started**: 2025-01-15 | **Last Updated**: 2025-01-29

---
endpoints

| Directory       | Actor             | Authority               | When                     |
  |-----------------|-------------------|-------------------------|--------------------------|
| /api/admin/     | Admins            | System configuration    | Always                   |
| /api/team/      | Team members      | Self-service operations | Pre-event (planning)     |
| /api/chef/      | Assigned chef     | Dinner management       | During event (execution) |
| /api/household/ | Household members | Participation           | Booking/allergies        |

---

## 🎯 REMAINING WORK (2-3 hours)

| # | Task | File | Time | Type |
|---|------|------|------|------|
| 1 | Integrate `ChefDinnerCard` in agenda | `ChefCalendarDisplay.vue` L294-309 | 15min | DRY |
| 2 | Create allergen endpoint | `server/routes/api/chef/dinner/[id]/allergens.post.ts` | 1h | API |
| 3 | Add allergen save/cancel buttons | `DinnerMenuHero.vue` (chef mode) | 30min | UX |
| 4 | Wire allergen save handler | `chef/index.vue` + `plan.ts` | 30min | Integration |

**After completion:** Feature 100% functional, production-ready.

---

## ✅ COMPLETED (Phases 1-5)

**All Components Built:**
- ✅ `ChefDinnerCard`, `TeamRoleStatus`, `DinnerStatusStepper`, `DinnerBudget`
- ✅ `MyTeamSelector`, `ChefCalendarDisplay`, `DinnerDetailPanel`, `CalendarMasterPanel`
- ✅ `DinnerMenuHero` (chef + household modes), `AllergenMultiSelector`

**All Backend Complete:**
- ✅ `/api/team/my`, `/api/admin/dinner-event/[id]/assign-role.post.ts`
- ✅ Store: `loadMyTeams()`, `fetchDinnerEventDetail()`, `assignRoleToDinner()`

**Known Issues:**
- ⚠️ Agenda view uses inline markup (should use `ChefDinnerCard`)
- ⚠️ Allergen updates not persisted (missing endpoint + save button)

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

**DinnerMenuHero Sub-components (Phase 5.2-5.4):**
- ❌ `DinnerMenuContent` - Shared title/description display component
- ❌ `DinnerAllergenSection` - Shared allergen display/editing component
- ❌ `DinnerChefSection` - Chef-specific metadata (deadlines, budgets, inline editing, picture upload)
- ❌ `DinnerBookingSection` - Household-specific booking form
- ❌ Inline field saves (title, description, allergens)
- ❌ Component tests for new shared components

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

## 🏗️ Architecture Refactoring (Phase 4.5)

**Status**: In Progress | **Started**: 2025-01-28 | **Priority**: High (eliminate ~70% code duplication)

### Problem Statement

The `/dinner` and `/chef` pages share nearly identical structure:
- **Detail Panel**: Both use DinnerMenuHero (header) + CookingTeamCard + KitchenPreparation (body)
- **Master Panel**: Both wrap calendars in UCard with consistent header/loading states
- **Data Fetching**: Both use component-local `useAsyncData` for dinner detail
- **Code Duplication**: ~70% of page code is duplicated

**Additional Issue**: DinnerMenuHero handles two distinct use cases (household bookings vs chef editing) in a single component, making it complex and hard to extend.

### Solution: Extract Shared Components

#### 1. DinnerDetailPanel Component

**Purpose**: Encapsulate the common dinner detail structure used by both pages

**Location**: `app/components/dinner/DinnerDetailPanel.vue`

**Features**:
- Fetches dinner detail with orders via component-local `useAsyncData` (ADR-007)
- Handles loading/error/empty states internally
- Renders DinnerMenuHero in header, CookingTeamCard + KitchenPreparation in body
- Accepts `mode` prop to switch DinnerMenuHero between 'household' and 'chef'
- Emits booking/allergen update events for parent handling

**Props**:
```typescript
interface Props {
  dinnerEventId: number | null  // null when no selection
  mode?: 'household' | 'chef' | 'view'  // DinnerMenuHero display mode
  ticketPrices?: TicketPrice[]  // Available ticket prices for booking
}
```

**Benefits**:
- ✅ Eliminates ~70% duplication in page components
- ✅ Consistent error handling and loading states
- ✅ Single source of truth for dinner detail structure
- ✅ Easy to test in isolation

#### 2. CalendarMasterPanel Component

**Purpose**: Consistent wrapper for calendar master panels with slot-based customization

**Location**: `app/components/calendar/CalendarMasterPanel.vue`

**Features**:
- Provides consistent UCard structure with header/footer slots
- Optional header slot for selectors, filters, team status
- Required calendar slot for actual calendar component
- Optional footer slot for legends, statistics
- Full-height flex layout for proper master panel sizing

**Props**:
```typescript
interface Props {
  title: string  // Card header title
}
```

**Slots**:
```typescript
interface Slots {
  header?: () => any      // Optional: Team selector, filters, status
  calendar: () => any     // Required: Calendar component
  footer?: () => any      // Optional: Legend, stats
}
```

**Usage Example (Dinner Page)**:
```vue
<CalendarMasterPanel title="Fællesspisningens kalender">
  <template #calendar>
    <DinnerCalendarDisplay
      :season-dates="seasonDates"
      :dinner-events="dinnerEvents"
      @date-selected="setValue"
    />
  </template>
</CalendarMasterPanel>
```

**Usage Example (Chef Page)**:
```vue
<CalendarMasterPanel title="Mine Madhold">
  <template #header>
    <MyTeamSelector v-model="selectedTeamId" />
    <TeamRoleStatus :team="selectedTeam" />
  </template>

  <template #calendar>
    <TeamCalendarDisplay
      :teams="[selectedTeam]"
      :dinner-events="teamDinnerEvents"
      @select="handleDinnerSelect"
    />
  </template>
</CalendarMasterPanel>
```

**Benefits**:
- ✅ Consistent master panel structure across pages
- ✅ Flexible slot-based composition
- ✅ No duplication of UCard wrapper code
- ✅ Easy to add new calendar pages (e.g., admin calendar)

#### 3. DinnerMenuHero Refactoring (Phase 5)

**Problem**: Single component handles two distinct use cases with different content needs:
- **Household Mode**: Family bookings with power mode, total price
- **Chef Mode**: Menu editing with deadlines, budgets, picture upload

**Solution**: Composition with sub-components (keep orchestrator, extract sections)

**New Component Structure**:
```
DinnerMenuHero (orchestrator)
├── DinnerMenuContent (shared: title, description, picture display)
├── DinnerAllergenSection (shared: allergen display/editing)
├── DinnerChefSection (chef-specific: deadlines, budgets, inline editing)
└── DinnerBookingSection (household-specific: booking form, power mode)
```

**Component Responsibilities**:

| Component | Responsibility | Used In |
|-----------|---------------|---------|
| **DinnerMenuHero** | Orchestrator - mode switching, UPageHero wrapper | Both modes |
| **DinnerMenuContent** | Title, description, picture display | Both modes |
| **DinnerAllergenSection** | Allergen display/editing (mode-aware) | Both modes |
| **DinnerChefSection** | Deadlines, budgets, menu inline editing | Chef only |
| **DinnerBookingSection** | Family bookings, power mode, total price | Household only |

**Chef-Specific Content (DinnerChefSection)**:

```vue
<div class="border-t border-white/20 pt-4 space-y-2">
  <!-- Deadlines (computed from dinner date + season settings) -->
  <div class="flex items-center justify-between text-sm">
    <span>📝 Menu due:</span>
    <span class="font-semibold">3 days before (Jan 22)</span>
  </div>
  <div class="flex items-center justify-between text-sm">
    <span>🛒 Shopping:</span>
    <span class="font-semibold">1 day before (Jan 24)</span>
  </div>

  <!-- Budget (computed from season settings) -->
  <div class="flex items-center justify-between text-sm">
    <span>💰 Budget:</span>
    <span class="font-semibold">500 kr (5 kr/portion avg.)</span>
  </div>

  <!-- Inline editing for menu fields -->
  <UInput v-model="menuTitle" @blur="saveMenuTitle" />
  <UTextarea v-model="menuDescription" @blur="saveMenuDescription" />
</div>
```

**Deadlines Calculation**:
```typescript
// In DinnerChefSection or useChefDeadlines composable
const metadata = computed(() => ({
  deadlines: [
    {
      label: 'Menu due',
      date: subDays(dinnerDate, season.ticketIsCancellableDaysBefore),
      icon: '📝'
    },
    {
      label: 'Shopping',
      date: subDays(dinnerDate, 1),
      icon: '🛒'
    }
  ],
  budget: {
    total: 500,  // From season settings or dynamic calculation
    perPortion: 5,
    icon: '💰'
  }
}))
```

**Benefits**:
- ✅ DRY: Shared elements (title, allergens) extracted once
- ✅ Focused: Each component has single responsibility
- ✅ Testable: Can test booking and chef sections independently
- ✅ Extensible: Easy to add new sections (e.g., "admin" mode)
- ✅ Clean separation: Booking logic ≠ editing logic
- ✅ Mobile-first: Each section optimizes independently

**Migration Path**:
1. **Phase 5.1**: Extract `DinnerMenuContent` and `DinnerAllergenSection` (shared)
2. **Phase 5.2**: Create `DinnerChefSection` with deadlines/budgets/inline editing
3. **Phase 5.3**: Extract `DinnerBookingSection` from existing booking code
4. **Phase 5.4**: Refactor `DinnerMenuHero` to orchestrate sub-components

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

**Next Steps (Phase 5)**:
- [ ] Split DinnerMenuHero into sub-components (DinnerMenuContent, DinnerAllergenSection, DinnerChefSection, DinnerBookingSection)
- [ ] Implement `useChefDeadlines()` composable for deadline calculations
- [ ] Add component tests for all new shared components
- [ ] Update E2E tests to verify pages still work after refactoring

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
