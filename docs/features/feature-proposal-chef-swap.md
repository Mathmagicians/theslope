# Feature Proposal: Chef Swap

**Status:** Proposal
**Date:** 2026-03-30

## Problem

- The chef portrait ("WANTED" / assigned chef) is not interactive — users try to click it
- Chef volunteering is buried in the WorkAssignment panel below, separate from the portrait
- No swap support exists ("Byt Tjans" button is a disabled placeholder)
- When a chef is replaced on an ANNOUNCED dinner, there's no flow to handle the menu or Heynabo
- 95% of chef changes are swaps, not volunteering for empty spots
- Swaps are not always 1-for-1 chef: you can trade e.g. 2x dishwashing for 1x chef

## Scope

- Chef assignment and swap via button next to the chef portrait
- Accessible from `/dinner` and `/chef`
- Team panel roster swaps are future work — this is chef assignment only
- Component is built generic (`RoleAssignment`) so it can be reused on team panel role rows later

## UX Design

### Entry Points

**WANTED (no chef assigned) — "Bliv chefkok" button next to portrait:**

```
+-----------------------------------------------+
|  (hat)                                         |
|  (?)  WANTED                                   |
|       Chefkok              [Bliv chefkok]      |
+-----------------------------------------------+
  DangerButton -> phase 2 -> assign-role
  Toast: Du er chefkok!
```

**Chef assigned — someone else — "Byt" button next to portrait:**

```
+-----------------------------------------------+
|  (hat)                                         |
|  (AH) Anna H.                    [Byt]        |
|       Chefkok                                  |
+-----------------------------------------------+
  "Byt" -> expands swap panel inline
```

**Chef assigned — yourself — no button:**

```
+-----------------------------------------------+
|  (hat)                                         |
|  (DU) Dit Navn                                 |
|       Chefkok (dig)                            |
+-----------------------------------------------+
  No button. Edit menu below.
```

### Swap Panel (after tapping "Byt")

Expands inline below the portrait. Shows the dinner you're taking over and your assignments as checkboxes (multi-select — you can offer multiple assignments).

```
+-----------------------------------------------+
|  Bliv chefkok                                  |
|                                                |
|  Du overtager fra Anna H:                      |
|  +-------------------------------------------+ |
|  |  Tirs. 1. apr - Team Tirsdag              | |
|  |  Tatziki med bagt kartoffel               | |
|  |  (chef) Chefkok - 42 kuverter            | |
|  +-------------------------------------------+ |
|                                                |
|  Byt med dine tjans:                           |
|  +-------------------------------------------+ |
|  | [ ]  Tors. 3. apr - Team Torsdag          | |
|  |      (chef) Chefkok - 38 kuv.            | |
|  +-------------------------------------------+ |
|  | [ ]  Tirs. 8. apr - Team Tirsdag          | |
|  |      (kok) Kok - 45 kuv.                 | |
|  +-------------------------------------------+ |
|  | [ ]  Ons. 9. apr - Team Onsdag            | |
|  |      (opvask) Opvask - 50 kuv.           | |
|  +-------------------------------------------+ |
|  | [ ]  Tors. 17. apr - Team Torsdag         | |
|  |      (opvask) Opvask - 41 kuv.           | |
|  +-------------------------------------------+ |
|                                                |
|  +-------------------------------------------+ |
|  | (i) Har du aftalt med Anna at du          | |
|  |     overtager hendes chefkok-tjans?       | |
|  +-------------------------------------------+ |
|                                                |
|  [(chef) Overtag chefkok-tjans]                |
|                                                |
|              [Fortryd]                         |
+-----------------------------------------------+
```

**When 1+ assignments selected — button and text adapt:**

```
|  | [x]  Ons. 9. apr - Team Onsdag          v | |
|  |      (opvask) Opvask - 50 kuv.           | |
|  +-------------------------------------------+ |
|  | [x]  Tors. 17. apr - Team Torsdag       v | |
|  |      (opvask) Opvask - 41 kuv.           | |
|  +-------------------------------------------+ |
|                                                |
|  +-------------------------------------------+ |
|  | (i) Har du aftalt med Anna at I           | |
|  |     bytter tjans?                         | |
|  +-------------------------------------------+ |
|                                                |
|  [(swap) Byt tjans]                            |
```

### Contextual Button

One button — label and icon adapt to context:

| State | Selection | Button label | Icon |
|---|---|---|---|
| WANTED | N/A | Bliv chefkok | chef-hat |
| Assigned, nothing selected | None | Overtag chefkok-tjans | chef-hat |
| Assigned, 1+ selected | Assignments | Byt tjans | swap arrows |

All use the DangerButton 2-phase confirmation pattern.

### Menu Decision (ANNOUNCED dinners)

When one or both dinners in the swap are ANNOUNCED, a menu question appears between the assignment list and the confirm button. Only relevant when `role === CHEF`.

**Both ANNOUNCED (both have menus):**

```
|  (!) Begge middage er annonceret.              |
|  Hvad skal der ske med menuerne?               |
|                                                |
|  +-------------------------------------------+ |
|  | O  Byt menuer                             | |
|  +-------------------------------------------+ |
|  | O  Behold menuer                          | |
|  +-------------------------------------------+ |
|  | O  Nulstil menuer                         | |
|  +-------------------------------------------+ |
```

**Only one ANNOUNCED:**

```
|  (!) Middagen er annonceret.                   |
|  Hvad skal der ske med menuen?                 |
|                                                |
|  +-------------------------------------------+ |
|  | O  Behold menu                            | |
|  +-------------------------------------------+ |
|  | O  Nulstil menu                           | |
|  +-------------------------------------------+ |
```

**Neither ANNOUNCED:** No menu question.

**Menu option matrix:**

| Target ANNOUNCED | Swap assignment ANNOUNCED | Options |
|---|---|---|
| No | No | No menu question |
| Yes | No | Behold menu / Nulstil menu |
| No | Yes | Behold menu / Nulstil menu |
| Yes | Yes | Byt menuer / Behold menuer / Nulstil menuer |

Button is disabled until menu choice is made (when applicable).

### Heynabo Token Flow

Heynabo requires the user's token to show them as publisher. In a swap we only have the logged-in user's (Bo's) token — not the other person's (Anna's).

**Rules:**

| Side | Delete old event | New event | Menu content |
|---|---|---|---|
| Bo's dinner (logged in) | System token | Bo's token → Bo shown as publisher | Per menu choice |
| Anna's dinner (other person) | System token | NOT republished — no token | Menu preserved in TheSlope, state → SCHEDULED |

Anna's dinner keeps its menu content in TheSlope but the Heynabo event is deleted. Anna re-announces with one tap next time she opens the dinner.

**Notifications:**

- **Bo sees after swap (toast):** "Husk at sige til Anna at hun skal genannoncere sin middag"
- **Anna sees next time she opens the dinner (banner on dinner card):** "Din middag skal genannonceres på Heynabo" with [Annoncer] button

The user never sees the delete+recreate mechanism — only menu choices and notifications.

### No Assignments Available

```
|  +-------------------------------------------+ |
|  | (i) Du har ingen kommende tjans           | |
|  |     at bytte med.                         | |
|  +-------------------------------------------+ |
|                                                |
|  [(chef) Overtag chefkok-tjans]                |
```

Button is active — pure takeover without swap.

### Toast Messages

```
Swap:      Du og Anna har byttet tjans!
           Husk at sige til Anna at hun skal genannoncere sin middag
           (only when Anna's dinner was ANNOUNCED)

Takeover:  Du er nu chefkok!

Volunteer: Du er nu chefkok!
```

## Architecture

### Component Structure

```
RoleAssignment.vue (NEW — generic component)
  Props:
    - dinnerEvent: DinnerEventDetail
    - role: "CHEF" | "COOK" | "JUNIORHELPER"
    - currentHolder?: Inhabitant   (null = vacant)
  Renders:
    - Vacant    -> "Bliv [role label]" button
    - Yourself  -> no button
    - Other     -> "Byt" button -> swap panel
  Menu decision only when role === "CHEF" and ANNOUNCED

Mounted this iteration:
  ChefMenuCard.vue -> RoleAssignment next to chef portrait

Future mounting:
  Team panel role rows -> RoleAssignment per role
  (chef row in team panel also gets "Byt" — two entry points to same flow)
```

### API

**Existing endpoint — for volunteering (WANTED):**

```
POST /api/team/cooking/[id]/assign-role
  body: { inhabitantId, role: "CHEF" }
```

**New endpoint — for swaps:**

```
POST /api/team/cooking/swap
  body: {
    targetDinnerEventId: number
    swapAssignments: {
      dinnerEventId: number
      role: "CHEF" | "COOK" | "JUNIORHELPER"
    }[]                          // empty = pure takeover
    menuAction: "keep" | "swap" | "reset"
  }
```

**Backend swap logic:**
1. Assign me as chef on targetDinnerEvent
2. For each swapAssignment: assign the other person my role on that dinner
3. Menu actions:
   - **keep**: menus stay on their dinners, only chefs change
   - **swap**: menu fields (title, description, picture, allergens) swap between dinners
   - **reset**: clear menu fields on affected dinners, set state to SCHEDULED
4. Heynabo (for ANNOUNCED dinners):
   - Delete old events (system token)
   - Logged-in user's dinner: recreate under their token
   - Other person's dinner: don't recreate — menu preserved in TheSlope, state → SCHEDULED
5. Return updated dinner events

### Data for Swap Panel

User's upcoming assignments (all roles, not just chef):

```
GET /api/chef/my-assignments
  -> { dinnerEventId, date, menuTitle, role, teamName, covers }[]
```

Or extend an existing endpoint with a filter.

### Validation Schema

```typescript
const ChefSwapRequestSchema = z.object({
  targetDinnerEventId: z.number().int().positive(),
  swapAssignments: z.array(z.object({
    dinnerEventId: z.number().int().positive(),
    role: z.enum(['CHEF', 'COOK', 'JUNIORHELPER'])
  })).default([]),
  menuAction: z.enum(['keep', 'swap', 'reset']).optional()
})
```

### ADR Compliance

- **ADR-001**: ChefSwapRequestSchema in useChefValidation composable
- **ADR-002**: Separate try-catch for validation vs business logic
- **ADR-006**: Swap panel state in component refs (draft, not URL)
- **ADR-007**: API calls through store
- **ADR-009**: Return DinnerEventDetail for affected dinners
- **ADR-013**: Heynabo delete (system token) + recreate (user token for logged-in, deferred for other person)

## UX Decisions Made

1. **Portrait is NOT clickable** — button next to the portrait
2. **One generic component** (`RoleAssignment`) for both volunteering and swapping, all roles
3. **This iteration:** mounted next to chef portrait only
4. **Future:** also mounted on team panel role rows (incl. chef — two entry points to same flow)
5. **Assignment list is checkboxes** (multi-select) — you can trade e.g. 2x dishwashing for 1x chef
6. **No pre-selection** in the assignment list — user chooses consciously
7. **One contextual button** — label adapts: "Bliv chefkok" / "Overtag chefkok-tjans" / "Byt tjans"
8. **DangerButton 2-phase confirmation** with "Har du aftalt med [name]..." text
9. **Menu options:** byt menuer / behold menuer / nulstil menuer (only for ANNOUNCED)
10. **Heynabo:** logged-in user's side republished under their token; other person's side preserved in TheSlope but set to SCHEDULED — they re-announce with one tap
11. **Notifications:** toast reminds logged-in user to tell the other person; banner on dinner card prompts re-announce

## Phases

### Phase 1: RoleAssignment Component + Volunteer Flow
- Create generic RoleAssignment.vue component
- "Bliv chefkok" button on WANTED (uses existing assign-role endpoint)
- DangerButton 2-phase confirmation
- Mount next to chef portrait in ChefMenuCard
- Accessible on both `/dinner` and `/chef`

### Phase 2: Swap Panel + Assignment List + Menu Decision
- Fetch user's upcoming assignments (all roles)
- Checkbox list UI for assignment selection (multi-select)
- Contextual button (overtag vs byt)
- "Har du aftalt med..." confirmation text
- Menu radio buttons (byt/behold/nulstil) conditional on ANNOUNCED state
- Button disabled until menu choice made (when applicable)
- New `/api/team/cooking/swap` endpoint with full menu + Heynabo logic
- Notification: toast for logged-in user, banner for other person's dinner

### Phase 3: Tests
- Unit tests for ChefSwapRequestSchema validation
- Component tests for RoleAssignment (collapsed/expanded, button labels, context)
- E2E: volunteer for WANTED, swap SCHEDULED dinners, swap ANNOUNCED with menu options
