# 🎯 Chef/Team Management Feature - Implementation Workplan

**Status**: Approved
**Date**: 2025-01-15
**Architecture Review**: ✅ Approved by themathmagician

---

## Executive Summary

**Feature**: Team-based cooking management interface for viewing assignments and editing menus
**Route**: `/chefing/[teamId]?dinner=X&mode=edit`
**Users**: All cooking team members (chefs can edit, others view-only)
**Architecture**: Extends `usePlanStore()`, reuses existing components, follows ADR patterns

### Business Requirements

- **Team members** can view their cooking team's schedule and dinner assignments
- **Chefs** can edit menu details (title, description, picture, allergens) for dinners they're assigned to
- **Deadline tracking** shows warnings when announce deadline is approaching or overdue
- **Shift swapping** enabled by allowing users to view all teams' schedules
- **Inline saves** like admin teams page (no "save all" button)
- **Picture upload** conditional - use Heynabo URL if available, otherwise allow file upload
- **Allergen selection** via checkbox list from allergy store
- **Auto-consumed** dinners transition via batch script (dev button for manual testing)

### Key UX Decisions

1. **Route Structure**: `/chef/[teamId]?dinner=123&mode=edit`
2. **Master View**: Team selector (all teams) + List/Calendar toggle
3. **Detail View**: State-based (SCHEDULED = editor, ANNOUNCED = kitchen stats)
4. **Permissions**: View = anyone on team, Edit = only assigned chef
5. **Color Harmony**: Mocha theme (chef-focused), deadline warnings (yellow/red)
6. **Calendar**: Deadline-focused with overlay badges (yellow warning, red overdue)

---

## Component Architecture Overview

### Component Reuse Matrix (MAXIMUM REUSE FOCUS)

| Component | Status | Reuse Type | Purpose | Location |
|-----------|--------|------------|---------|----------|
| **REUSED (No Changes)** |
| `CookingTeamCard` | ✅ REUSE | mode="monitor" | Team member display | `components/cooking-team/` |
| `KitchenPreparation` | ✅ REUSE | Full component | Kitchen stats panel | `components/dinner/` |
| `TeamCalendarDisplay` | ✅ REUSE | Base calendar | Calendar view in master | `components/calendar/` |
| `DinnerBookingForm` | ✅ REUSE | Booking UI | Reused by DinnerMenuHero | `components/dinner/` |
| **EXTRACTED (Refactor for Reusability)** |
| `AllergenSelector` | 🔄 EXTRACT | From AdminAllergies | Extract checkbox pattern (lines 391-401) to shared component | `components/shared/` |
| **ENHANCED (Add Features)** |
| `DinnerMenuHero` | 🔧 ENHANCE | Add mode="chef" | Chef menu editing (title, desc, picture, allergens) | `components/dinner/` |
| `TeamCalendarDisplay` | 🔧 ENHANCE | Add :deadlineMode | Deadline badge overlays when true | `components/calendar/` |
| `AdminAllergies` | 🔧 ENHANCE | Use AllergenSelector | Refactor to use extracted shared component | `components/admin/` |
| **NEW COMPONENTS (Minimal - Only What's Truly Needed)** |
| `ChefDinnerCard` | 🆕 CREATE | Chef-specific | Master list item with deadline badges | `components/chef/` |
| **ENHANCED COMPOSABLES** |
| `useSeason` | 🔧 ENHANCE | Add semantic wrapper | canAnnounceMenu (reuses existing isBeforeDeadline) | `composables/` |
| **ENHANCED STORES** |
| `useAuthStore` | 🔧 ENHANCE | Add permission helpers | isChefFor, isOnTeam (follows isAdmin, isAllergyManager pattern) | `stores/` |
| **NEW PAGES** |
| `/chefing/index.vue` | 🆕 CREATE | Page | Auto-redirect to team or team selector | `pages/chefing/` |
| `/chefing/[teamId].vue` | 🆕 CREATE | Page | Master/detail layout | `pages/chefing/` |
| **STORE BOUNDARY** |
| `useBookingsStore` | 🔧 EXTEND | Add dinner updates | updateDinnerField, announceDinner, cancelDinner | `stores/bookings.ts` |

### 
**✅ DinnerStateIndicator** → Use DinnerEventDisplay.state with computed badge logic in ChefDinnerCard
**🔄 AllergenSelector** → EXTRACT from AdminAllergies (lines 391-401) into shared component, then reuse in both AdminAllergies and DinnerMenuHero
**✅ ChefMenuEditor** → Enhancement of DinnerMenuHero with mode="chef" prop
**✅ ChefDinnerDetail** → Inline logic in page using DinnerMenuHero with mode switching
**✅ ChefCalendarDisplay** → Enhancement of TeamCalendarDisplay with :deadlineMode prop
**✅ useMenuPictureUpload** → Inline in DinnerMenuHero enhancement (picture edit modal)
**✅  Add `canAnnounceMenu()` to useSeason (reuses existing `isBeforeDeadline` curried function)
**✅ Add permission helpers to `useAuthStore` (follows existing isAdmin, isAllergyManager pattern)

### Components

**REVISED (Maximum Reuse):**
- 🔄 1 extracted component (AllergenSelector - refactored from existing code)
- 🆕 1 new component (ChefDinnerCard - truly unique)
- 🔧 5 enhanced components (DinnerMenuHero, TeamCalendarDisplay, AdminAllergies, useSeason, useAuthStore)
- **Total: 1 new entity** (7 eliminated via reuse/enhancement)

**Reuse Strategies that should be Used:**
- ✅ Component mode props (DinnerMenuHero mode="chef", TeamCalendarDisplay :deadlineMode)
- ✅ Pattern extraction (AllergenSelector from AdminAllergies)
- ✅ Curried function reuse (canAnnounceMenu uses existing isBeforeDeadline)
- ✅ Store pattern extension (permission helpers in useAuthStore)
- ✅ Inline logic (picture upload modal, detail view switching)

---

## Architectural Decisions (REVISED - Maximum Reuse)

### 1. Store Strategy
**Decision**: Extend `usePlanStore()` with chef-specific methods
**Rationale**: DinnerEvent data already lives in plan store, avoids data duplication

### 2. Inline Save Pattern
**Decision**: Field-level saves with optimistic updates + error rollback
**Rationale**: Matches admin teams pattern, better UX than "save all" button

### 3. Calendar Enhancement
**Decision**: Wrapper component `ChefCalendarDisplay` around `TeamCalendarDisplay`
**Rationale**: Safest approach - doesn't break existing dinner page calendar

### 4. Permission Guards
**Decision**: Composable `useChefPermissions()` for reusable permission logic
**Rationale**: Testable, consistent, follows composable pattern

### 5. Deadline Calculations
**Decision**: Utility composable `useChefDeadlines()` for deadline logic
**Rationale**: Reusable, testable, centralizes business rules

---

## Phase 1: Foundation Components (Simple, No Dependencies)

### 1.1 DinnerStateIndicator Component

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

### Status Colors
- 🟡 SCHEDULED: `COLOR.mocha` (warm - "ready to plan")
- 🟢 ANNOUNCED: `COLOR.success` (green - "published, bookable")
- ⚪ CONSUMED: `COLOR.neutral` (gray - "done, archived")
- 🔴 CANCELLED: `COLOR.error` (red - "problem")

### Deadline Warnings
- ⚠️ Coming soon (< 3 days): `COLOR.warning` (amber)
- 🚨 Overdue: `COLOR.error` (red)

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
