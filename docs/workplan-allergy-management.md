# Allergy Management Implementation Workplan

## Overview

Implement admin-managed allergy types and household-scoped allergy assignments following existing ADR patterns.

**Key Decisions:**
- CASCADE delete: Deleting AllergyType removes all related Allergy records
- Admin: Manage global AllergyType catalog, view all inhabitants per type (lightweight)
- Users: Manage allergies for their household inhabitants only
- Fetching: Group allergies by inhabitant
- Icons: Emoji strings or icon class names (e.g., "🥜" or "i-heroicons-exclamation-triangle")
- **Admin UX**: Master-detail pattern with NuxtUI Cards
- **Household UX**: Busy-parent approach with NuxtUI Cards

---

## Implementation Status Overview

| Layer / Feature | Component | Status | Notes |
|----------------|-----------|--------|-------|
| **📊 BACKEND** | | | |
| Database Schema | AllergyType, Allergy models | ✅ **DONE** | CASCADE delete configured |
| Validation | useAllergyValidation composable | ✅ **DONE** | Zod schemas with types exported |
| Repository | CRUD functions in prismaRepository.ts | ✅ **DONE** | All methods implemented |
| API - Admin | `/api/admin/allergy-type/*` | ✅ **DONE** | GET/PUT/POST/DELETE all routes |
| API - Household | `/api/household/allergy/*` | ✅ **DONE** | Query params: ?householdId OR ?inhabitantId |
| API Logging | ADR-004 compliance | ✅ **DONE** | Emoji prefixes, h3eFromCatch |
| **🎨 FRONTEND** | | | |
| Store | allergies.ts (Pinia) | ✅ **DONE** | ADR-007 pattern, useFetch with status |
| Admin Component | AdminAllergies.vue | ✅ **DONE** | Master-detail CRUD interface |
| Household Component | HouseholdAllergies.vue | ⚠️ **STUB** | Only shows AllergyManagersList (9 lines) |
| Allergy Managers | AllergyManagersList.vue | ✅ **DONE** | Displays users with ALLERGYMANAGER role |
| Admin Integration | Part of /admin page | ✅ **DONE** | Integrated into existing admin interface |
| Household Integration | Part of /household/[shortname] page | ✅ **DONE** | Integrated as household tab |
| **🧪 TESTING** | | | |
| Test Factories | AllergyTypeFactory, AllergyFactory | ✅ **DONE** | CRUD helpers + cleanup methods |
| API E2E Tests | AllergyType and Allergy routes | ✅ **DONE** | Full endpoint coverage |
| UI E2E - Admin | AdminAllergies.e2e.spec.ts | ❌ **TODO** | Test file not created |
| UI E2E - Household | HouseholdAllergies.e2e.spec.ts | ❌ **TODO** | Test file not created |
| **👥 USER PERSONAS** | | | |
| Family Manager | Household allergy management | 🟡 **PARTIAL** | Backend done, frontend stub only |
| Allergy Manager | Admin allergy type catalog | ✅ **DONE** | Backend + component + page integration |
| Chef | Multi-allergen filtering | ❌ **NOT PLANNED** | No implementation exists |
| **📄 ADVANCED FEATURES** | | | |
| Kitchen PDF Export | Generate printable PDF | ❌ **NOT PLANNED** | Button in mockup, not implemented |
| Notifications | Allergy change tracking | ❌ **NOT PLANNED** | Future enhancement |
| Multi-allergen Filter | Chef interface for planning | ❌ **NOT PLANNED** | New requirement |

### Summary

**✅ Complete (75%):**
- Backend API fully functional (all routes, validation, repository)
- Admin component, store, and page integration complete
- Test factories and API tests complete
- Allergy manager persona fully implemented

**🟡 Partial (15%):**
- Household component is stub (needs full implementation)
- Family manager persona incomplete

**❌ Missing (10%):**
- UI E2E tests
- Chef features for menu planning
- Kitchen PDF export
- Notification system

**Note:** Authorization/security is handled by separate feature (not part of allergy management scope)

### Critical Path to MVP

1. **HOUSEHOLD UI** - Implement full HouseholdAllergies.vue component
2. **TESTS** - Write UI E2E tests for both admin and household flows

**Estimated Effort:** 1-2 days for MVP completion

---

## Business Requirements

This system supports three distinct user personas, each with specific needs and workflows:

### 1. Busy Family Manager (Household Member)
**Context:** Parent or household member who needs to quickly manage allergy information for their family.

**Needs:**
- Friendly, intuitive interface to view and update household member allergies
- Quick overview of what is registered for the household
- Clear contact information for the allergy manager when help is needed
- Minimal clicks to add/edit/remove allergies for household members

**Key Features:**
- View all household members and their registered allergies at a glance
- Add new allergies to household members (select from predefined types)
- Edit comments on existing allergies (e.g., severity notes, special instructions)
- Remove allergies when no longer applicable
- See contact information for allergy manager(s)

**User Journey:**
1. Navigate to household allergies tab
2. See all household members with their current allergies
3. Click to add/edit allergies for a specific member
4. Save changes immediately
5. Contact allergy manager if custom allergy type is needed

### 2. Chef (Cooking Team Member)
**Context:** Person planning or cooking a menu who needs to ensure meals are safe for all inhabitants.

**Needs:**
- Select one or more allergens to check impact
- See how many inhabitants are affected by selected allergen(s)
- Quick filtering to identify affected individuals
- Clear visual indicators of allergen presence

**Key Features:**
- Multi-select allergen filter (checkboxes for common allergens)
- Real-time count of affected inhabitants per allergen
- Combined view showing inhabitants affected by ANY selected allergen
- Detailed inhabitant list with allergy comments
- Export/print capability for kitchen reference

**User Journey:**
1. Navigate to menu planning or cooking interface
2. Select relevant allergens (e.g., "Gluten", "Dairy", "Nuts")
3. See count: "12 inhabitants affected by selected allergens"
4. View detailed list with household info and comments
5. Plan menu accordingly or print reference list

### 3. Allergy Manager (System Administrator)
**Context:** Designated person(s) responsible for allergy system governance and kitchen communication.

**Needs:**
- Create and manage global allergy type catalog
- View all inhabitants with specific allergies
- Receive notifications when inhabitants update their allergies
- Generate printable PDF document for kitchen display
- Ensure data quality and completeness

**Key Features:**
- CRUD operations for allergy types (name, description, icon)
- View inhabitants per allergy type with household context
- Notification system for allergy changes (future enhancement)
- Generate "Kitchen PDF" - comprehensive allergy list for physical display
- See list of all allergy managers (contact info)

**User Journey:**
1. Navigate to admin allergies section
2. Review allergy types and inhabitant counts
3. Create new allergy type if requested by household
4. Review inhabitant details and comments for specific allergen
5. Generate and print PDF for kitchen wall
6. Respond to household questions about allergies

---

## Changes Required Based on New Requirements

### 1. Chef Features - Multi-Allergen Filtering
**Current State:** Not implemented. No chef-specific interface exists.

**Required Changes:**
- **New Component:** `ChefAllergenFilter.vue`
  - Multi-select checkboxes for allergen types
  - Real-time count of affected inhabitants
  - Inhabitant list with allergy details and comments
  - Filter logic: Show inhabitants with ANY selected allergen

- **Store Enhancement:** Add computed properties for chef view
  ```typescript
  // In allergies.ts store
  const getInhabitantsAffectedByAllergens = (allergenTypeIds: number[]) => {
    // Filter inhabitants who have allergies matching any selected type
  }
  ```

- **API Enhancement:** Consider new endpoint for efficient multi-allergen queries
  ```typescript
  // GET /api/admin/allergy-type/inhabitants?ids=1,2,3
  // Returns all inhabitants with any of the specified allergy types
  ```

- **Integration Point:** Add to `/admin/planning` or menu planning workflow

### 2. Kitchen PDF Export
**Current State:** Button placeholder in mockup, no implementation.

**Required Changes:**
- **New Composable:** `usePdfExport.ts`
  - Generate PDF from allergy data
  - Options: All allergens or specific types
  - Include: Inhabitant names, households, allergen types, comments

- **Library Dependency:** Add PDF generation library (consider `jsPDF` or server-side solution)

- **New API Endpoint:** `/api/admin/allergy-type/export-pdf`
  - Server-side PDF generation (recommended for Cloudflare Workers compatibility)
  - Returns PDF blob for download

- **UI Enhancement:** Wire up "📄 Køkken-PDF" button in AdminAllergies.vue

### 3. Household View Enhancement
**Current State:** HouseholdAllergies.vue is a stub (9 lines).

**Required Changes:**
- **Implement Full Component:**
  - List all household inhabitants
  - Show each inhabitant's allergies (grouped by inhabitant)
  - Add allergy to inhabitant (select from types)
  - Edit inhabitant comment on existing allergy
  - Remove allergy from inhabitant
  - Display AllergyManagersList for help/contact

- **Store Integration:** Use existing `allergies.ts` store
  - Set `filterHouseholdId` from household context
  - Use `allergies` computed property (already implemented)

- **Page Integration:** Create `/app/pages/household/[shortname]/allergies.vue` tab

### 4. Notifications System
**Current State:** Not planned.

**Required Changes:**
- **Architecture Decision Needed:** How to implement notifications?
  - Email notifications to allergy managers?
  - In-app notification badge?
  - Webhook to external system?

- **Data Model:** Add `AllergyChangeLog` or use existing audit pattern?

- **Trigger Points:** When household creates/updates/deletes allergy

- **Recommendation:** Defer to Phase 2 (post-MVP)

### 5. Authorization Enforcement
**Current State:** Backend routes have TODO comments for auth checks.

**Required Changes:**
- **Implement Auth Helpers:**
  ```typescript
  // server/utils/authHelpers.ts
  export async function verifyHouseholdAccess(event: H3Event, householdId: number)
  export async function verifyInhabitantAccess(event: H3Event, inhabitantId: number)
  ```

- **Update API Routes:** Replace TODO comments with actual auth calls

- **Priority:** HIGH - should be done before household features are accessible

### 6. Admin Page Creation
**Current State:** AdminAllergies.vue component exists but no page route.

**Required Changes:**
- **Create:** `/app/pages/admin/allergies.vue`
  - Import and render AdminAllergies component
  - Add to admin navigation/tabs

- **Navigation:** Update admin layout to include allergies tab

---

## Recommended Implementation Priorities

### Phase 1: Complete MVP (Household & Admin Basic CRUD)
**Priority:** HIGH - Core functionality
1. ✅ Create `/app/pages/admin/allergies.vue` page
2. ✅ Implement `HouseholdAllergies.vue` full component
3. ✅ Create `/app/pages/household/[shortname]/allergies.vue` tab
4. ✅ Implement authorization checks in API routes
5. ✅ Write UI E2E tests for admin and household flows

**Estimated Effort:** 2-3 days

### Phase 2: Chef Features
**Priority:** MEDIUM - Important for menu planning safety
1. Create `ChefAllergenFilter.vue` component
2. Add multi-allergen query API endpoint
3. Integrate into menu planning workflow
4. Write E2E tests for chef filtering

**Estimated Effort:** 1-2 days

### Phase 3: Kitchen PDF Export
**Priority:** MEDIUM - Quality of life for kitchen staff
1. Research PDF generation approach (server-side recommended)
2. Implement `/api/admin/allergy-type/export-pdf` endpoint
3. Wire up button in AdminAllergies.vue
4. Test PDF output with real data

**Estimated Effort:** 1 day

### Phase 4: Notifications (Future Enhancement)
**Priority:** LOW - Nice to have
1. Design notification architecture
2. Implement change tracking
3. Build notification delivery system
4. Add UI for notification preferences

**Estimated Effort:** 2-3 days

---

## UX Design - Finalized Mockups

### Admin Allergy Type Management (/admin/allergies)

**Pattern:** Card with header, body contains table-based Master-Detail with inline multiselect toggle

**Desktop - Single Selection (Default):**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ CARD HEADER: Allergi Oversigt                    [Rediger] [📄 Køkken-PDF] │ │
│ ├───────────────────────────────┬─────────────────────────────────────────────┤ │
│ │ CARD BODY (MASTER)            │ CARD BODY (DETAIL - SCROLLABLE)             │ │
│ │                               │                                             │ │
│ │ ℹ️ Allergi-ansvarlige:        │ ┌─────────────────────────────────────────┐ │ │
│ │ 👤 Anna Hansen                │ │ 🥜 Peanuts (Jordnødder)     [Rediger]   │ │ │
│ │ 👤 Bob Jensen                 │ ├─────────────────────────────────────────┤ │ │
│ │                               │ │                                         │ │ │
│ │ [ ] Vælg flere allergier      │ │ Alvorlig allergi mod jordnødder. Kan   │ │ │
│ │                               │ │ forårsage anafylaktisk shock. Streng   │ │ │
│ │ ┏━━━━━━━━━━━━┳━━━━━┳━━━┓      │ │ undgåelse nødvendig.                    │ │ │
│ │ ┃ Allergi    ┃ Ant ┃Nyt┃      │ │                                         │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ BEBOERE MED DENNE ALLERGI (3)           │ │ │
│ │ ┃🥜 Peanuts  ┃  3  ┃🔵 ┃●     │ │                                         │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ ┌─────────────────────────────────────┐ │ │ │
│ │ ┃🌾 Gluten   ┃  1  ┃🔵 ┃      │ │ │👤 Anna Hansen                       │ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ │🏠 Skråningen 31                     │ │ │ │
│ │ ┃🥛 Laktose  ┃  2  ┃   ┃      │ │ │💬 "Meget alvorlig - har EpiPen"     │ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ │🔵 For 2 timer siden                 │ │ │ │
│ │ ┃🥚 Æg       ┃  2  ┃   ┃      │ │ └─────────────────────────────────────┘ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │                                         │ │ │
│ │ ┃🌰 Nødder   ┃  1  ┃   ┃      │ │ ┌─────────────────────────────────────┐ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ │👤 Bob Jensen                        │ │ │ │
│ │ ┃🍅 Tomater  ┃  1  ┃   ┃      │ │ │🏠 Abbey Road 1                      │ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ │💬 "Mild reaktion"                   │ │ │ │
│ │ ┃🐟 Skaldyr  ┃  0  ┃   ┃      │ │ └─────────────────────────────────────┘ │ │ │
│ │ ┗━━━━━━━━━━━━┻━━━━━┻━━━┛      │ │                                         │ │ │
│ │                               │ │ ┌─────────────────────────────────────┐ │ │ │
│ │ 7 allergi-typer totalt        │ │ │👶 Clara Nielsen                     │ │ │ │
│ │                               │ │ │🏠 Tvethøjvej 43, 1                  │ │ │ │
│ │                               │ │ │💬 Ingen kommentar                   │ │ │ │
│ │                               │ │ └─────────────────────────────────────┘ │ │ │
│ │                               │ │                                         │ │ │
│ │                               │ ├─────────────────────────────────────────┤ │ │
│ │                               │ │                  [Slet allergi-type]    │ │ │
│ │                               │ └─────────────────────────────────────────┘ │ │
│ └───────────────────────────────┴─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Desktop - Multiple Selection (3 Selected, Cards Stacked):**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ CARD HEADER: Allergi Oversigt                    [Rediger] [📄 Køkken-PDF] │ │
│ ├───────────────────────────────┬─────────────────────────────────────────────┤ │
│ │ CARD BODY (MASTER)            │ CARD BODY (DETAIL - SCROLLABLE)             │ │
│ │                               │                                             │ │
│ │ 📊 Valgte:                    │ ┌─────────────────────────────────────────┐ │ │
│ │ • 🥜 Peanuts (3 beboere)      │ │ 🥜 Peanuts (Jordnødder)                 │ │ │
│ │ • 🥛 Laktose (2 beboere)      │ ├─────────────────────────────────────────┤ │ │
│ │ • 🥚 Æg (2 beboere)           │ │ Alvorlig allergi mod jordnødder...      │ │ │
│ │ = 5 beboere påvirket          │ │                                         │ │ │
│ │   (2 har flere allergier)     │ │ BEBOERE MED DENNE ALLERGI (3)           │ │ │
│ │                               │ │                                         │ │ │
│ │ ℹ️ Allergi-ansvarlige:        │ │ 👤 Anna Hansen (EpiPen - alvorlig) 🔵   │ │ │
│ │ 👤 Anna Hansen                │ │ 👤 Bob Jensen (Mild reaktion)           │ │ │
│ │ 👤 Bob Jensen                 │ │ 👤 Clara Nielsen 🆕                      │ │ │
│ │                               │ └─────────────────────────────────────────┘ │ │
│ │ [☑ Vælg flere allergier]      │                                             │ │
│ │                               │ ┌─────────────────────────────────────────┐ │ │
│ │ ┏━━━━┳━━━━━━━━━━━━┳━━━━━┳━━━┓│ │ 🥛 Laktose (Laktoseintolerans)          │ │ │
│ │ ┃    ┃ Allergi    ┃ Ant ┃Nyt┃│ ├─────────────────────────────────────────┤ │ │
│ │ ┣━━━━╋━━━━━━━━━━━━╋━━━━━╋━━━┫│ │ Laktoseintolerans - undgå...            │ │ │
│ │ ┃ ☑  ┃🥜 Peanuts  ┃  3  ┃🔵 ┃│ │                                         │ │ │
│ │ ┣━━━━╋━━━━━━━━━━━━╋━━━━━╋━━━┫│ │ BEBOERE MED DENNE ALLERGI (2)           │ │ │
│ │ ┃ ☑  ┃🥛 Laktose  ┃  2  ┃   ┃│ │                                         │ │ │
│ │ ┣━━━━╋━━━━━━━━━━━━╋━━━━━╋━━━┫│ │ 👤 Emma Petersen (Små mængder ok)       │ │ │
│ │ ┃ ☑  ┃🥚 Æg       ┃  2  ┃   ┃│ │ 👤 Freja Andersen (Undgå alt)           │ │ │
│ │ ┣━━━━╋━━━━━━━━━━━━╋━━━━━╋━━━┫│ └─────────────────────────────────────────┘ │ │
│ │ ┃ ☐  ┃🌾 Gluten   ┃  1  ┃🔵 ┃│                                             │ │
│ │ ┣━━━━╋━━━━━━━━━━━━╋━━━━━╋━━━┫│ ┌─────────────────────────────────────────┐ │ │
│ │ ┃ ☐  ┃🌰 Nødder   ┃  1  ┃   ┃│ │ 🥚 Æg (Ægallergi)                       │ │ │
│ │ ┣━━━━╋━━━━━━━━━━━━╋━━━━━╋━━━┫│ ├─────────────────────────────────────────┤ │ │
│ │ ┃ ☐  ┃🍅 Tomater  ┃  1  ┃   ┃│ │ Ægallergi - undgå alle...               │ │ │
│ │ ┣━━━━╋━━━━━━━━━━━━╋━━━━━╋━━━┫│ │                                         │ │ │
│ │ ┃ ☐  ┃🐟 Skaldyr  ┃  0  ┃   ┃│ │ BEBOERE MED DENNE ALLERGI (2)           │ │ │
│ │ ┗━━━━┻━━━━━━━━━━━━┻━━━━━┻━━━┛│ │                                         │ │ │
│ │                               │ │ 👤 Gorm Hansen (Ingen kommentar)        │ │ │
│ │ 3 valgt • 7 allergi-typer     │ │ 👤 Ida Kristensen (Ingen kommentar)     │ │ │
│ └───────────────────────────────┴─└─────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Key changes from single selection:**
- Toggle `[☑ Vælg flere allergier]` is ON
- Checkbox column appears in table
- Statistics panel shows selected allergies and total count
- Detail panel shows stacked compact cards (one per selected allergy)
- Each card is condensed (no edit/delete buttons in multi-select mode)

**Desktop - Edit Mode (Inline Form):**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ CARD HEADER: Allergi Oversigt                    [Rediger] [📄 Køkken-PDF] │ │
│ ├───────────────────────────────┬─────────────────────────────────────────────┤ │
│ │ CARD BODY (MASTER)            │ CARD BODY (DETAIL - SCROLLABLE)             │ │
│ │                               │                                             │ │
│ │ ℹ️ Allergi-ansvarlige:        │ ┌─────────────────────────────────────────┐ │ │
│ │ 👤 Anna Hansen                │ │ REDIGER ALLERGI-TYPE                    │ │ │
│ │ 👤 Bob Jensen                 │ ├─────────────────────────────────────────┤ │ │
│ │                               │ │                                         │ │ │
│ │ [ ] Vælg flere allergier      │ │ Navn *                                  │ │ │
│ │                               │ │ ┌─────────────────────────────────────┐ │ │ │
│ │ ┏━━━━━━━━━━━━┳━━━━━┳━━━┓      │ │ │Peanuts                              │ │ │ │
│ │ ┃ Allergi    ┃ Ant ┃Nyt┃      │ │ └─────────────────────────────────────┘ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │                                         │ │ │
│ │ ┃🥜 Peanuts  ┃  3  ┃🔵 ┃●     │ │ Beskrivelse *                           │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ ┌─────────────────────────────────────┐ │ │ │
│ │ ┃🌾 Gluten   ┃  1  ┃🔵 ┃      │ │ │Alvorlig allergi mod jordnødder. Kan │ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ │forårsage anafylaktisk shock. Streng │ │ │ │
│ │ ┃🥛 Laktose  ┃  2  ┃   ┃      │ │ │undgåelse nødvendig.                 │ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ └─────────────────────────────────────┘ │ │ │
│ │ ┃🥚 Æg       ┃  2  ┃   ┃      │ │                                         │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ Ikon (emoji eller icon class)           │ │ │
│ │ ┃🌰 Nødder   ┃  1  ┃   ┃      │ │ ℹ️ F.eks. 🥜 eller i-heroicons-...      │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ ┌─────────────────────────────────────┐ │ │ │
│ │ ┃🍅 Tomater  ┃  1  ┃   ┃      │ │ │🥜                                   │ │ │ │
│ │ ┣━━━━━━━━━━━━╋━━━━━╋━━━┫      │ │ └─────────────────────────────────────┘ │ │ │
│ │ ┃🐟 Skaldyr  ┃  0  ┃   ┃      │ │                                         │ │ │
│ │ ┗━━━━━━━━━━━━┻━━━━━┻━━━┛      │ │ ⚠️ 3 beboere har denne allergi          │ │ │
│ │                               │ │                                         │ │ │
│ │ 7 allergi-typer totalt        │ ├─────────────────────────────────────────┤ │ │
│ │                               │ │         [Annuller]  [Gem ændringer]     │ │ │
│ │                               │ └─────────────────────────────────────────┘ │ │
│ └───────────────────────────────┴─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Mobile View - Card with List (Single Selection):**

```
┌────────────────────────────────────┐
│ ┌────────────────────────────────┐ │
│ │ HEADER: Allergi Oversigt       │ │
│ │                 [+] [📄]       │ │
│ ├────────────────────────────────┤ │
│ │ BODY                           │ │
│ │                                │ │
│ │ ℹ️ Allergi-ansvarlige:         │ │
│ │ 👤 Anna Hansen                 │ │
│ │ 👤 Bob Jensen                  │ │
│ │                                │ │
│ │ [ ] Vælg flere                 │ │
│ │                                │ │
│ │ ┏━━━━━━━━━━━┳━━━━┳━━┓          │ │
│ │ ┃ Allergi   ┃ Ant┃🔔┃          │ │
│ │ ┣━━━━━━━━━━━╋━━━━╋━━┫          │ │
│ │ ┃🥜 Peanuts ┃  3 ┃🔵┃ ●        │ │
│ │ ┣━━━━━━━━━━━╋━━━━╋━━┫          │ │
│ │ ┃🌾 Gluten  ┃  1 ┃🔵┃          │ │
│ │ ┣━━━━━━━━━━━╋━━━━╋━━┫          │ │
│ │ ┃🥛 Laktose ┃  2 ┃  ┃          │ │
│ │ ┣━━━━━━━━━━━╋━━━━╋━━┫          │ │
│ │ ┃🥚 Æg      ┃  2 ┃  ┃          │ │
│ │ ┣━━━━━━━━━━━╋━━━━╋━━┫          │ │
│ │ ┃🌰 Nødder  ┃  1 ┃  ┃          │ │
│ │ ┣━━━━━━━━━━━╋━━━━╋━━┫          │ │
│ │ ┃🍅 Tomater ┃  1 ┃  ┃          │ │
│ │ ┗━━━━━━━━━━━┻━━━━┻━━┛          │ │
│ │                                │ │
│ │ 7 typer                        │ │
│ │                                │ │
│ │ ▼ VALGT: 🥜 Peanuts (3)        │ │
│ │                                │ │
│ │ Alvorlig allergi mod...        │ │
│ │                                │ │
│ │ BEBOERE (3)                    │ │
│ │ 👤 Anna Hansen (EpiPen) 🔵      │ │
│ │ 👤 Bob Jensen                  │ │
│ │ 👶 Clara Nielsen 🆕             │ │
│ │                                │ │
│ │            [Rediger] [Slet]    │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Mobile View - Card with Multiselect:**

```
┌────────────────────────────────────┐
│ ┌────────────────────────────────┐ │
│ │ HEADER: Allergi Oversigt       │ │
│ │                 [+] [📄]       │ │
│ ├────────────────────────────────┤ │
│ │ BODY                           │ │
│ │                                │ │
│ │ 📊 Valgte: 3 allergier         │ │
│ │ 5 beboere (2 har flere)        │ │
│ │                                │ │
│ │ ℹ️ Allergi-ansvarlige:         │ │
│ │ 👤 Anna H. 👤 Bob J.           │ │
│ │                                │ │
│ │ [✓] Vælg flere                 │ │
│ │                                │ │
│ │ ┏━┳━━━━━━━━━━━┳━━━━┳━━┓         │ │
│ │ ┃☐┃ Allergi   ┃ Ant┃🔔┃         │ │
│ │ ┣━╋━━━━━━━━━━━╋━━━━╋━━┫         │ │
│ │ ┃☑┃🥜 Peanuts ┃  3 ┃🔵┃         │ │
│ │ ┣━╋━━━━━━━━━━━╋━━━━╋━━┫         │ │
│ │ ┃☑┃🥛 Laktose ┃  2 ┃  ┃         │ │
│ │ ┣━╋━━━━━━━━━━━╋━━━━╋━━┫         │ │
│ │ ┃☑┃🥚 Æg      ┃  2 ┃  ┃         │ │
│ │ ┣━╋━━━━━━━━━━━╋━━━━╋━━┫         │ │
│ │ ┃☐┃🌾 Gluten  ┃  1 ┃🔵┃         │ │
│ │ ┗━┻━━━━━━━━━━━┻━━━━┻━━┛         │ │
│ │                                │ │
│ │ ▼ VALGTE (3)                   │ │
│ │                                │ │
│ │ 🥜 Peanuts                     │ │
│ │ Alvorlig allergi mod...        │ │
│ │ BEBOERE: A. Hansen, B. J., ... │ │
│ │                                │ │
│ │ 🥛 Laktose                     │ │
│ │ Laktoseintolerans - undgå...   │ │
│ │ BEBOERE: E. Petersen, F. A.    │ │
│ │                                │ │
│ │ 🥚 Æg                          │ │
│ │ Ægallergi - undgå...           │ │
│ │ BEBOERE: G. Hansen, I. K.      │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Delete Confirmation Modal:**

```
┌─────────────────────────────────────────────────┐
│ ⚠️  Bekræft sletning                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ Slet allergi-typen "Peanuts"?                  │
│                                                 │
│ ⚠️  ADVARSEL: Dette vil også slette ALLE       │
│    allergi-registreringer for denne type.      │
│                                                 │
│    3 beboere påvirkes.                         │
│                                                 │
│ Denne handling kan ikke fortrydes.             │
│                                                 │
├─────────────────────────────────────────────────┤
│            [Annuller]  [Slet allergi-type]     │
└─────────────────────────────────────────────────┘
```

**Kitchen PDF View (Print-friendly):**

```
┌───────────────────────────────────────────────────────────────────────────┐
│ 📄 ALLERGI-OVERSIGT FOR KØKKENET                                          │
│ Opdateret: 15. januar 2025                                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ ═══════════════════════════════════════════════════════════════════════   │
│ 🥜 PEANUTS (JORDNØDDER)                                                  │
│ ═══════════════════════════════════════════════════════════════════════   │
│                                                                           │
│ Alvorlig allergi mod jordnødder. Kan forårsage anafylaktisk shock.      │
│ Streng undgåelse nødvendig.                                               │
│                                                                           │
│ BEBOERE (3):                                                              │
│ • Anna Hansen (Skråningen 31) - Meget alvorlig - har EpiPen             │
│ • Bob Jensen (Abbey Road 1) - Mild reaktion - undgå direkte kontakt     │
│ • Clara Nielsen (Tvethøjvej 43, 1) - Ingen kommentar                     │
│                                                                           │
│ ───────────────────────────────────────────────────────────────────────   │
│ 🌾 GLUTEN (COELIAC DISEASE)                                              │
│ ───────────────────────────────────────────────────────────────────────   │
│                                                                           │
│ Coeliac disease - streng glutenfri kost påkrævet.                        │
│                                                                           │
│ BEBOERE (1):                                                              │
│ • David Larsen (Penny Lane 4) - Diagnosticeret 2020, meget følsom       │
│                                                                           │
│ ───────────────────────────────────────────────────────────────────────   │
│ 🥛 LAKTOSE (LAKTOSEINTOLERANS)                                           │
│ ───────────────────────────────────────────────────────────────────────   │
│                                                                           │
│ Laktoseintolerans - undgå mælkeprodukter.                                │
│                                                                           │
│ BEBOERE (2):                                                              │
│ • Emma Petersen (Rosenvej 12) - Kan tåle små mængder                    │
│ • Freja Andersen (Bakken 5) - Meget følsom - undgå alle produkter       │
│                                                                           │
│ ───────────────────────────────────────────────────────────────────────   │
│                                                                           │
│ ℹ️  KONTAKT ALLERGI-ANSVARLIGE VED SPØRGSMÅL:                            │
│ 👤 Anna Hansen - anna@example.com - 12 34 56 78                         │
│ 👤 Bob Jensen - bob@example.com - 23 45 67 89                           │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                [Download PDF]  [Print]  [Luk]            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### Household Allergy Management (/household/[shortname]/allergies)

**Busy-Parent Approach - Desktop View:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Hansen Familie                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Tilmeldinger]  [•Allergier]  [Økonomi]  [Indstillinger]                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ Familiens allergier og diætkrav                                                │
│                                                                                 │
│ ┌───────────────────────────────────────────────────────────────────────────┐   │
│ │ 👤 Anna Hansen (Voksen)                                                   │   │
│ ├───────────────────────────────────────────────────────────────────────────┤   │
│ │                                                                           │   │
│ │ 🥜 Peanuts - Jordnødder                                                   │   │
│ │    💬 "Meget alvorlig - har EpiPen"                                       │   │
│ │                                                                           │   │
│ │ 🌾 Gluten - Coeliac disease                                               │   │
│ │    💬 "Diagnosticeret 2020, ingen gluten overhovedet"                     │   │
│ │                                                                           │   │
│ ├───────────────────────────────────────────────────────────────────────────┤   │
│ │                                        [Rediger kommentar]  [Tilføj mere] │   │
│ └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ ┌───────────────────────────────────────────────────────────────────────────┐   │
│ │ 👤 Bob Hansen (Voksen)                                                    │   │
│ ├───────────────────────────────────────────────────────────────────────────┤   │
│ │                                                                           │   │
│ │ ⭕ Ingen allergier registreret                                            │   │
│ │                                                                           │   │
│ ├───────────────────────────────────────────────────────────────────────────┤   │
│ │                                                         [Tilføj allergi]  │   │
│ └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ ┌───────────────────────────────────────────────────────────────────────────┐   │
│ │ 👶 Clara Hansen (Barn, 5 år)                                             │   │
│ ├───────────────────────────────────────────────────────────────────────────┤   │
│ │                                                                           │   │
│ │ 🥛 Laktose - Laktoseintolerans                                            │   │
│ │    💬 "Kan tåle små mængder i kogte retter"                               │   │
│ │                                                                           │   │
│ ├───────────────────────────────────────────────────────────────────────────┤   │
│ │                                        [Rediger kommentar]  [Tilføj mere] │   │
│ └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ ┌───────────────────────────────────────────────────────────────────────────┐   │
│ │ 👶 David Hansen (Baby, 1 år)                                             │   │
│ ├───────────────────────────────────────────────────────────────────────────┤   │
│ │                                                                           │   │
│ │ ⭕ Ingen allergier registreret                                            │   │
│ │                                                                           │   │
│ ├───────────────────────────────────────────────────────────────────────────┤   │
│ │                                                         [Tilføj allergi]  │   │
│ └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ ℹ️ Køkkenet ser disse allergier når de planlægger menuen                       │
│                                                                                 │
│ ┌───────────────────────────────────────────────────────────────────────────┐   │
│ │ 📋 Allergi-ansvarlige                                                     │   │
│ │ Kontakt ved spørgsmål eller opdateringer:                                │   │
│ │ 👤 Anna Hansen - anna@example.com - 12 34 56 78                         │   │
│ │ 👤 Bob Jensen - bob@example.com - 23 45 67 89                           │   │
│ └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Busy-Parent Approach - Add Allergy Modal:**

```
┌─────────────────────────────────────────────────────────────┐
│ Tilføj allergi til Bob Hansen                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Allergi-type *                                              │
│ ┌─────────────────────────────────────────────────────┐     │
│ │🥜 Peanuts                                      [▾] │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                             │
│ Kommentar til kokken (valgfri)                             │
│ ┌─────────────────────────────────────────────────────┐     │
│ │Mild reaktion - undgå direkte kontakt               │     │
│ │                                                     │     │
│ │                                                     │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Annuller]  [Gem allergi]     │
└─────────────────────────────────────────────────────────────┘
```

**Busy-Parent Approach - Edit Comment Modal:**

```
┌─────────────────────────────────────────────────────────────┐
│ Rediger kommentar - Anna Hansen / Peanuts                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Kommentar til kokken                                        │
│ ┌─────────────────────────────────────────────────────┐     │
│ │Meget alvorlig - har EpiPen. Undgå alt med nødder  │     │
│ │eller spor af nødder.                                │     │
│ │                                                     │     │
│ │                                                     │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                        [Annuller]  [Gem]  [Slet allergi]   │
└─────────────────────────────────────────────────────────────┘
```

**Mobile View:**

```
┌──────────────────────────────────┐
│ 🏠 Hansen Familie                │
├──────────────────────────────────┤
│ [Tilmeld.] [•Allergier] [Øko]   │
├──────────────────────────────────┤
│                                  │
│ Familiens allergier              │
│                                  │
│ ┌──────────────────────────────┐ │
│ │👤 Anna Hansen (Voksen)       │ │
│ ├──────────────────────────────┤ │
│ │                              │ │
│ │🥜 Peanuts - Jordnødder       │ │
│ │💬 Meget alvorlig - EpiPen    │ │
│ │                              │ │
│ │🌾 Gluten - Coeliac disease   │ │
│ │💬 Diagnosticeret 2020        │ │
│ │                              │ │
│ ├──────────────────────────────┤ │
│ │      [Rediger]  [Tilføj]    │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │👤 Bob Hansen (Voksen)        │ │
│ ├──────────────────────────────┤ │
│ │                              │ │
│ │⭕ Ingen allergier            │ │
│ │                              │ │
│ ├──────────────────────────────┤ │
│ │            [Tilføj allergi] │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │👶 Clara Hansen (Barn, 5)     │ │
│ ├──────────────────────────────┤ │
│ │                              │ │
│ │🥛 Laktose - Laktoseintolerans│ │
│ │💬 Kan tåle små mængder       │ │
│ │                              │ │
│ ├──────────────────────────────┤ │
│ │      [Rediger]  [Tilføj]    │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │👶 David Hansen (Baby, 1)     │ │
│ ├──────────────────────────────┤ │
│ │                              │ │
│ │⭕ Ingen allergier            │ │
│ │                              │ │
│ ├──────────────────────────────┤ │
│ │            [Tilføj allergi] │ │
│ └──────────────────────────────┘ │
│                                  │
│ ℹ️ Køkkenet ser disse allergier │
│                                  │
│ ┌──────────────────────────────┐ │
│ │📋 Allergi-ansvarlige         │ │
│ │👤 Anna Hansen                │ │
│ │   anna@example.com           │ │
│ │   12 34 56 78                │ │
│ │👤 Bob Jensen                 │ │
│ │   bob@example.com            │ │
│ │   23 45 67 89                │ │
│ └──────────────────────────────┘ │
│                                  │
└──────────────────────────────────┘
```

**Mobile View - Add Allergy Modal:**

```
┌──────────────────────────────────┐
│ Tilføj allergi til Bob Hansen    │
├──────────────────────────────────┤
│                                  │
│ Allergi-type *                   │
│ ┌──────────────────────────────┐ │
│ │🥜 Peanuts                [▾]│ │
│ └──────────────────────────────┘ │
│                                  │
│ Kommentar til kokken             │
│ ┌──────────────────────────────┐ │
│ │Mild reaktion - undgå direkte│ │
│ │kontakt                       │ │
│ │                              │ │
│ └──────────────────────────────┘ │
│                                  │
├──────────────────────────────────┤
│       [Annuller]  [Gem allergi] │
└──────────────────────────────────┘
```

---

## Component Architecture

### AdminAllergies.vue

**Location:** `/app/components/admin/AdminAllergies.vue`

**Purpose:** Parent container component implementing card-based master-detail pattern for allergy type management

**Structure:**
- **Card Header:** Title ("Allergi Oversigt"), action buttons ([Rediger], [📄 Køkken-PDF])
- **Card Body - Master (Left):** Allergy manager list, multiselect toggle, data table, statistics
- **Card Body - Detail (Right):** Single full AllergyTypeCard OR stacked compact AllergyTypeCard components

**Key State:**
- `selectedAllergyTypeIds: Ref<number[]>` - Currently selected allergy type IDs
- `multiselectEnabled: Ref<boolean>` - Toggle state for multiselect mode
- `formMode: Ref<'view' | 'edit' | 'create'>` - Current interaction mode

**Reactive Behavior:**
- When `multiselectEnabled` is OFF: Table shows no checkbox column, detail panel shows single full card with [Rediger] button
- When `multiselectEnabled` is ON: Table adds checkbox column, statistics panel shows selected count, detail panel shows stacked compact cards (no action buttons)
- Statistics panel updates in real-time based on selection

**Responsibilities:**
- Manages selection state and multiselect toggle
- Renders master panel with table and toggle control
- Renders detail panel with appropriate card layout (single full vs stacked compact)
- Handles form mode transitions (view → edit → save/cancel)
- Coordinates between child components (AllergyTypeCard, AllergyManagersList)

### AllergyTypeCard.vue

**Location:** `/app/components/admin/AllergyTypeCard.vue`

**Purpose:** Displays single allergy type with inhabitant details - follows single responsibility principle (one card = one allergy)

**Props:**
- `allergyType: AllergyTypeWithInhabitants` - The allergy type data with nested inhabitants array
- `mode: 'view' | 'edit'` - Display mode or editing mode
- `compact?: boolean` - Optional compact rendering for multiselect view (default: false)

**Rendering Modes:**
- **View mode (`compact=false`):** Full detail card with:
  - Header: Icon + name + [Rediger] button
  - Body: Description, "BEBOERE MED DENNE ALLERGI (N)" heading
  - Inhabitant cards showing: avatar, name, household, comment, activity indicators (🆕/🔵)
  - Footer: [Slet allergi-type] button

- **View mode (`compact=true`):** Condensed card for multiselect showing:
  - Header: Icon + name (no buttons)
  - Body: Truncated description
  - Inhabitant summary: Comma-separated names (e.g., "Anna Hansen (EpiPen - alvorlig) 🔵, Bob Jensen")

- **Edit mode:** Inline form with:
  - Input fields: Navn, Beskrivelse, Ikon
  - Warning if inhabitants exist: "⚠️ N beboere har denne allergi"
  - Footer buttons: [Annuller] [Gem ændringer]

**Activity Tracking:**
- 🆕 Badge: Shown for allergies created within last 7 days
- 🔵 Dot: Shown for inhabitant comments updated within last 24 hours
- Timestamps: Relative time display (e.g., "For 2 timer siden", "5. jan 2025")

**Emits:**
- `update:allergyType` - When edit form is submitted
- `delete:allergyType` - When delete is confirmed (after modal)

### AllergyManagersList.vue

**Location:** `/app/components/admin/AllergyManagersList.vue`

**Purpose:** Displays list of users with ALLERGYMANAGER system role for contact information

**Props:**
- `users: User[]` - Array of users (pre-filtered by ALLERGYMANAGER role in parent/store)

**Rendering:**
- Compact list format showing:
  - 👤 Icon + Name
  - Email and phone (if available)
- Read-only display (role management is separate feature)

**Usage:** Embedded in master panel of AdminAllergies to show "ℹ️ Allergi-ansvarlige" section

---

## Phase 1: Foundation - Composables

### ✅File: `app/composables/useAllergyValidation.ts`

## Phase 2: Repository Functions

### ✅ File: `server/data/prismaRepository.ts`

## ✅Phase 3: API Routes

**Status:** ✅ Fully implemented | ⚠️ Missing authorization

### ✅ Admin AllergyType Routes (allergy management)

**Base Path:** `/api/admin/allergy-type`

**Implemented Routes:**
- `GET /api/admin/allergy-type` - List all allergy types with inhabitant counts
  - Returns: `AllergyTypeWithInhabitants[]`
  - No validation required (public list)

- `GET /api/admin/allergy-type/[id]` - Get single allergy type with inhabitant details
  - Validates: Route param `id` as positive integer
  - Returns: `AllergyTypeResponse` or 404 if not found

- `PUT /api/admin/allergy-type` - Create new allergy type
  - Validates: Request body with `AllergyTypeCreateSchema`
  - Returns: Created allergy type with 201 status

- `POST /api/admin/allergy-type/[id]` - Update existing allergy type
  - Validates: Route param `id` and request body with `AllergyTypeUpdateSchema`
  - Returns: Updated allergy type with 200 status

- `DELETE /api/admin/allergy-type/[id]` - Delete allergy type (CASCADE)
  - Validates: Route param `id` as positive integer
  - Behavior: CASCADE deletes all related Allergy records
  - Returns: Deleted allergy type with 200 status

**Compliance:**
- ✅ ADR-002: Separate try-catch for validation vs business logic
- ✅ ADR-004: Proper logging with emoji prefixes (`🏥 > ALLERGY_TYPE > [METHOD]`)
- ✅ Uses `h3eFromCatch` helper for consistent error handling
- ✅ Validates all inputs with Zod schemas
- ❌ **MISSING: Authorization** - Should verify ADMIN or ALLERGYMANAGER system role

### ✅ Household Allergy Routes

**Base Path:** `/api/household/allergy` - for allergy mangement

**Implemented Routes:**
- `GET /api/household/allergy?householdId=[id]` - Get allergies for entire household
  - Validates: Query param `householdId` OR `inhabitantId` (exactly one required)
  - Returns: Array of allergies for household (grouped by inhabitant in repository)
  - Calls: `fetchAllergiesForHousehold(d1Client, householdId)`

- `GET /api/household/allergy?inhabitantId=[id]` - Get allergies for specific inhabitant
  - Validates: Query param `inhabitantId` (mutually exclusive with householdId)
  - Returns: Array of allergies for single inhabitant
  - Calls: `fetchAllergiesForInhabitant(d1Client, inhabitantId)`

- `PUT /api/household/allergy` - Create new allergy for an inhabitant
  - Validates: Request body with `AllergyCreateSchema` (inhabitantId, allergyTypeId, inhabitantComment)
  - Returns: Created allergy with 201 status

- `GET /api/household/allergy/[id]` - Get single allergy with full relations
  - Validates: Route param `id` as positive integer
  - Returns: Single allergy with inhabitant and allergyType details

- `POST /api/household/allergy/[id]` - Update allergy (typically comment)
  - Validates: Route param `id` and partial `AllergyUpdateSchema`
  - Returns: Updated allergy with 200 status

- `DELETE /api/household/allergy/[id]` - Delete allergy
  - Validates: Route param `id` as positive integer
  - Returns: Deleted allergy with 200 status

**Smart Query Validation:**
The GET index route uses a refined Zod schema that:
- Requires exactly ONE of `householdId` or `inhabitantId`
- Rejects requests with both parameters
- Rejects requests with neither parameter

**Compliance:**
- ✅ ADR-002: Separate validation and business logic error handling
- ✅ ADR-004: Proper logging with emoji prefixes (`🏥 > ALLERGY > [METHOD]`)
- ✅ Uses `h3eFromCatch` helper
- ✅ Smart query parameter validation with refinements
- ❌ **CRITICAL MISSING: Authorization** - No household-scoped access checks

### Authorization Requirements (TODO) - future improvements

**Admin Routes:** Should verify user has ADMIN or ALLERGYMANAGER system role
```typescript
// Pseudo-code for admin routes
const session = await requireUserSession(event)
const hasAllergyRole = session.user.systemRoles.includes('ADMIN') ||
                       session.user.systemRoles.includes('ALLERGYMANAGER')
if (!hasAllergyRole) throw createError({statusCode: 403, message: 'Forbidden'})
```

**Household Routes:** Should verify user belongs to the household being accessed
```typescript
// Pseudo-code for household routes
const session = await requireUserSession(event)
if (session.user.systemRole !== 'ADMIN') {
    // User must be member of the household
    if (session.user.Inhabitant?.householdId !== requestedHouseholdId) {
        throw createError({statusCode: 403, message: 'Forbidden'})
    }
}
```

**Recommended Approach:**
Create helper functions in `server/utils/authHelpers.ts`:
- `verifyAdminOrAllergyManager(event)` - For admin routes
- `verifyHouseholdAccess(event, householdId)` - For household routes
- `verifyInhabitantAccess(event, inhabitantId)` - For inhabitant-specific operations

---

## Phase 4: Stores
### ✅File: `app/stores/allergies.ts`
---

## Phase 5: UI Components

### Admin AllergyType Management

#### File: `app/components/admin/AdminAllergies.vue`

**Structure Overview:**


**Key Features:**
- List view shows all AllergyType with inhabitants (avatar + name)
- Create/Edit form with name, description, icon fields
- DELETE shows CASCADE warning modal
- Follow existing admin component patterns

### Household Allergy Management

#### File: `app/components/household/HouseholdAllergies.vue`

**Structure Overview:**


**Key Features:**
- Grouped by inhabitant (matches API response structure)
- Add allergy: Select inhabitant + allergy type + optional comment
- Edit comment inline
- Delete allergy with confirmation
- Display allergy type icon + name + description
- Shows inhabitant avatar + name

---

## ✅Phase 6: Test Factories
**Key Points:**
- Follow existing factory pattern from `householdFactory.ts`
- Use `salt()` for unique test data
- Include cleanup methods for afterAll hooks
- Assert expected status codes

---

## Phase 7: E2E Tests

### File: `tests/e2e/ui/AdminAllergies.e2e.spec.ts`

### File: `tests/e2e/ui/HouseholdAllergies.e2e.spec.ts`


**Key Points:**
- Follow GIVEN/WHEN/THEN structure (ADR-003)
- Setup via API (fast), interact via UI, verify via API
- Use factories for all test data creation
- Cleanup in afterAll hooks
- Test both admin and user flows

---

## Authorization TODO

The household allergy routes include TODO comments for authorization. Implement these checks:

```typescript
// In GET/PUT/PATCH/DELETE routes under /api/household/[householdId]/allergy/*

const session = await requireUserSession(event)

// Check if user is admin OR inhabitant belongs to their household
if (session.user.systemRole !== 'ADMIN') {
    // For GET: verify householdId matches user's household
    if (session.user.Inhabitant?.householdId !== householdId) {
        throw createError({statusCode: 403, message: 'Forbidden'})
    }

    // For PUT/PATCH/DELETE: additionally verify inhabitantId belongs to this household
    // Requires fetching inhabitant from DB first
}
```

Consider creating a helper function:
```typescript
// server/utils/authHelpers.ts
export async function verifyHouseholdAccess(
    event: H3Event,
    householdId: number
): Promise<void> {
    const session = await requireUserSession(event)
    if (session.user.systemRole === 'ADMIN') return

    if (session.user.Inhabitant?.householdId !== householdId) {
        throw createError({statusCode: 403, message: 'Forbidden'})
    }
}
```

---

## Summary

This workplan provides a complete implementation blueprint for allergy management following all existing ADRs and patterns. Each phase includes concrete code structures, file paths, and key implementation details. The approach ensures:

- **CASCADE delete**: Schema handles deletion correctly
- **Admin view**: Shows inhabitants per allergy type (lightweight)
- **User view**: Grouped by inhabitant with full allergy details
- **Icons**: String field (emoji or class name)
- **Authorization**: Household-scoped access (TODO to complete)
- **Testing**: Full E2E coverage with factories
- **ADR compliance**: All patterns followed consistently
