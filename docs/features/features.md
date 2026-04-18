# TheSlope System Overview

TheSlope is a community dining management platform for Skråningen co-housing. It handles meal booking, cooking team coordination, billing, and integration with external systems (Heynabo, PBS).

> **User Guides:** [User Guide](user-guide.md) | [Chef Guide](chef-guide.md) | [Admin Guide](admin-guide.md)

---

## User Roles

| Role | Description | Primary Actions |
|------|-------------|-----------------|
| 👩‍🍳 **Chef** | Cooking team leader | Plan menus, announce dinners, manage team |
| 🤖 **Admin** | System administrator | Create seasons, manage households, handle billing |
| 😋 **Skråner** | Community member | Book meals, set preferences, manage allergies |

---

## Core Entities

```
Season (Sæson)
├── CookingTeam[] (Madhold)
│   └── CookingTeamAssignment[] (Chef, Cook, JuniorHelper)
├── DinnerEvent[] (Fællesspisning)
│   ├── Order[] (Billetter)
│   └── DinnerEventAllergen[] (Allergener)
└── TicketPrice[] (Billetpriser: Adult, Child, Baby)

Household (Husstand)
├── Inhabitant[] (Beboere)
│   ├── Allergy[] (Allergier)
│   ├── dinnerPreferences (Ugentlige præferencer)
│   └── Order[] (Bestillinger)
└── Invoice[] (Fakturaer)

User (Bruger)
├── Inhabitant? (Linked beboer)
└── systemRoles[] (ADMIN, ALLERGYMANAGER)
```

---

## Feature Matrix

### Implemented Features

| Feature | Description | Guide |
|---------|-------------|-------|
| **Season Management** | Create seasons, set cooking days, holidays, ticket prices | [Admin Guide](admin-guide.md#season-management) |
| **Season Activation** | Activate seasons, auto-scaffold pre-bookings | [Admin Guide](admin-guide.md#activate-a-season) |
| **Cooking Teams** | Create teams, assign members, set affinities | [Admin Guide](admin-guide.md#cooking-teams) |
| **Weekly Preferences** | Set DINEIN/TAKEAWAY/NONE per weekday per person | [User Guide](user-guide.md#sådan-sætter-du-ugentlige-præferencer) |
| **Preference Auto-Scaffolding** | Bookings auto-update when preferences change (ADR-015) | [User Guide](user-guide.md#sådan-sætter-du-ugentlige-præferencer) |
| **Meal Booking** | Book/cancel dinners, day/week/month views (ADR-016) | [User Guide](user-guide.md#sådan-tilmelder-du-dig-fællesspisning) |
| **Grid Booking** | Week/month grid with draft state, power mode | [User Guide](user-guide.md#sådan-tilmelder-du-dig-fællesspisning) |
| **Guest Tickets** | Add guest tickets with allergy tracking | [User Guide](user-guide.md#sådan-inviterer-du-en-gæst) |
| **Allergy Management** | Track allergies per inhabitant | [User Guide](user-guide.md#sådan-tilføjer-du-allergier) |
| **Chef Dashboard** | View team, menu planning, allergen tracking | [Chef Guide](chef-guide.md) |
| **Heynabo Event Sync** | Announce menus to Heynabo calendar | [Chef Guide](chef-guide.md#annoncér-menu) |
| **Household Management** | View/edit households and inhabitants | [Admin Guide](admin-guide.md#husstande) |
| **Multi-Household per Address** | Two families can coexist at one address during move (Heynabo import preserves both) | [Admin Guide](admin-guide.md#husstande) |
| **Admin Household Edit** | Inline row-expand: move inhabitants between same-address households, delete household (CASCADE) | [Admin Guide](admin-guide.md#sådan-flytter-du-en-beboer) |
| **Move-Out Date** | Members set own `moveOutDate`; bookings after date auto-pruned; pencil-gate UX | [User Guide](user-guide.md#sådan-sætter-du-fraflytningsdato) |
| **Unified Booking Navigation** | Day/week/month arrows use one algorithm (period boundary → adjacent dinner) | — |
| **Season Import** | Import calendar and teams from CSV | [Admin Guide](admin-guide.md#data-importexport) |
| **Billing Import** | Import orders from legacy CSV format | [Admin Guide](admin-guide.md#billing--economy) |
| **Daily Maintenance** | Auto-consume dinners, close orders, create transactions | [Admin Guide](admin-guide.md#system-maintenance) |
| **Monthly Billing** | Generate invoices, magic link sharing, CSV export | [Admin Guide](admin-guide.md#økonomi) |
| **Job History Panel** | View/trigger system jobs, track run history | [Admin Guide](admin-guide.md#systemvedligeholdelse) |
| **Authorization** | Role-based access control (Admin, AllergyManager) | — |

### Partially Implemented

| Feature | Remaining Work |
|---------|----------------|
| **Ticket Claim UI** | Backend done, need UI for claiming released tickets |
| **Chef Components** | Missing component tests for DinnerStatusStepper, TeamRoleStatus, DinnerDetailPanel |

### Planned

| Feature | Description |
|---------|-------------|
| **Ticket Claim UI** | Claim released tickets from other households (backend ready) |
| **PBS Export** | Direct PBS file generation |
| **Chef Budget View** | Calculate budget from ticket counts |

---

## Screenshots

### User Dashboard
![User Dashboard](screenshots/user/dashboard.png)
*Dashboard shown after login with quick actions for Dinner, Household, and Cooking Team*

### Dinner Calendar
![Dinner Calendar](screenshots/dinner/dinner-calendar.png)
*Public dinner calendar showing upcoming events with booking status*

### Household Views
![Household Bookings](screenshots/household/household-bookings.png)
*Household booking view showing family members and their reservations*

![Weekly Preferences](screenshots/household/household-members-view-mode.png)
*VIEW mode: Compact badges show preferences. Click ✏️ to edit individual, ⚡ for power mode*

![Editing Preferences](screenshots/household/household-card-preferences-editing.png)
*EDIT mode: Button groups for each day with immediate save*

### Chef Views
![Chef Dashboard](screenshots/chef/chef-dashboard.png)
*Chef view showing upcoming cooking assignments*

![Chef Menu Card](screenshots/chef/chef-menu-card.png)
*Menu card with team info and allergen tracking*

### Admin Views
![Admin Planning](screenshots/admin/admin-planning-loaded.png)
*Season planning with cooking days and holiday configuration*

![Season Selector](screenshots/admin/season-selector-dropdown-status-indicators.png)
*Season selector with status indicators: 🟢 Active | 🌱 Future | ⚪ Past*

![Admin Teams](screenshots/admin/admin-teams-edit.png)
*Team management with master-detail interface*

![Admin Households](screenshots/admin/admin-households-list.png)
*Household list with inhabitants — inline edit-panel expands per row for move/delete*

![Household Settings](screenshots/household/household-settings.png)
*Husstandens indstillinger — set/clear move-out date via pencil-gate*

---

## ASCII Mockups

### Season Selector
```
┌─────────────────────────────────┐
│ 📅 Forår 2025            🟢 ▼ │  ← Selected (active season)
│ ─────────────────────────────── │
│ 📅 Forår 2025            🟢    │  ← ACTIVE - visible to all
│ 📅 Efterår 2025          🌱    │  ← FUTURE - can activate
│ 📅 Vinter 2025           🟡    │  ← CURRENT - dates match now
│ 📦 Efterår 2024          ⚪    │  ← PAST - archived
└─────────────────────────────────┘

Legend: 🟢 Active | 🌱 Future | 🟡 Current | ⚪ Past
```

### Team Management Interface
```
┌─────────────────┬────────────────────────────────────────────────┐
│ TEAMS (Left)    │ EDIT TEAM (Right)                              │
│                 │                                                │
│ □ Hold 1 [8]    │ 🍳 [Hold 2___________] 👤👤👤 [6 medlemmer]  │
│ ■ Hold 2 [6]    │                                                │
│ □ Hold 3 [0]    │ ┌Madlavningsdage─┬─Holdkalender──────────────┐ │
│ □ Hold 4 [5]    │ │☑ Mon  ☐ Fri    │ Oct  Nov  Dec             │ │
│ ...             │ │☑ Wed  ☐ Sat    │ 🔵1 🔵8  🔵15 🔵5  🔵12   │ │
│                 │ │☐ Thu  ☐ Sun    │ 🔵3 🔵10 ...              │ │
│                 │ └────────────────┴───────────────────────────┘ │
│                 │                                                │
│                 │ Holdmedlemmer                                  │
│                 │ ┌Chefkok────┬Kok─────────┬Kokkespire─────────┐ │
│                 │ │👤 Anna    │👤 Bob      │👤 Diana          │ │
│                 │ └───────────┴────────────┴───────────────────┘ │
└─────────────────┴────────────────────────────────────────────────┘
```

### Weekly Preferences Interface
```
┌───────────────────────────────────────────────────────────────┐
│ UCARD: Husstandens ugentlige booking præferencer              │
├───────────────────────────────────────────────────────────────┤
│ [⚡] Alle medlemmer  👥👥👥   🍽️ 🍽️ 🍽️ 🍽️ 🛍️  ← Power mode │
├───────────────────────────────────────────────────────────────┤
│ [✏️] Voksen  👤 Anna           🍽️ 🍽️ 🍽️ 🍽️ 🛍️              │
│ [✏️] Voksen  👤 Bob            🍽️ 🍽️ ❌ 🍽️ 🛍️              │
│ [✏️] Barn    👤 Clara          🍽️ 🍽️ 🍽️ 🍽️ 🛍️              │
│ [✏️] Baby    👤 David          ❌ ❌ ❌ ❌ ❌               │
└───────────────────────────────────────────────────────────────┘

EXPANDED ROW (Edit mode):
┌───────────────────────────────────────────────────────────────┐
│ [▼] Voksen  👤 Anna                                          │
│ ──────────────────────────────────────────────────────────── │
│  Mon: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                  │
│  Tue: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                  │
│  Wed: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                  │
│  Thu: [🍽️ Spis][🕐 Sen][🛍️ Take][❌ Ingen]                  │
└───────────────────────────────────────────────────────────────┘

Legend: ⚡ Power mode | ✏️ Edit | 🍽️ Dine in | 🕐 Late | 🛍️ Takeaway | ❌ None
```

### Admin Household Edit Panel
```
┌─ Husstande på Skråningen ─────────────────────── [+ Ny husstand] ─┐
│ ▾ │ Skr_14 │ 115 ➡ Fraflytter │ Skråningen 14 │ Emil, Frida │    │
│ ╔═════════════════════════════════════════════════════════════╗  │
│ ║ Stamdata    PBS 115 · HN 42 · Skråningen 14    (read-only)  ║  │
│ ║ Residens    Indflyttet 15/08/2020  ➡ 01/06/2026      [✎]   ║  │
│ ║ Beboere     [🔍 søg…]                        [⇅ Status]     ║  │
│ ║  👤 Emil  │ [Skr_14 · PBS 115] ✓  │ (i denne husstand)      ║  │
│ ║  👤 Anna  │ [Skr_12 · PBS 100]    │ [→ Flyt hertil]         ║  │
│ ║  👤 Greta │ [Skr_20 · PBS 102] ⊗  │ (fraflyttet)            ║  │
│ ║ [🗑 Slet husstand]  (2-click DangerButton)       [✕ Luk]   ║  │
│ ╚═════════════════════════════════════════════════════════════╝  │
└────────────────────────────────────────────────────────────────────┘
```

### Move-Out Date (Household Settings)
```
┌─ Fraflytning ───────────────────────────────┐
│ ☀ Familien har ingen flytteplaner      [✎] │  ← view, no date
└─────────────────────────────────────────────┘

┌─ Fraflytning ───────────────────────────────┐
│ ➡ Fraflytter 15/03/2026                [✎] │  ← view, has date
│ [« Fortryd flytning]  (2-click)             │
└─────────────────────────────────────────────┘

┌─ Fraflytning ───────────────────────────────┐
│ (!) Bookinger efter datoen slettes.         │  ← edit mode
│ Dato: [ 15/03/2026  📅 ]                    │
├─────────────────────────────────────────────┤
│ [✕ Annullér]              [✓ Gem]           │
└─────────────────────────────────────────────┘

🤖 Sidste ændring · 3 bookinger slettet · 12 uændret
```

### Unified Booking Arrow Nav
```
 period boundary per view → getAdjacentDinner → next/prev dinner

 day   ◀── startOfDay(date)   ·   endOfDay(date)   ──▶
 week  ◀── startOfWeek(date)  ·   endOfWeek(date)  ──▶   (Mon-start)
 month ◀── startOfMonth(date) ·   endOfMonth(date) ──▶

 null ⇒ arrow hidden  (hasPrev / hasNext = false)
```

---

## Technical Architecture

| Layer | Technology |
|-------|------------|
| **Frontend** | Nuxt 4, Vue 3, TypeScript, Pinia, Nuxt UI 3 |
| **Backend** | Nuxt Server Routes, Prisma ORM |
| **Database** | Cloudflare D1 (SQLite) |
| **Hosting** | Cloudflare Workers/Pages |
| **External** | Heynabo API, PBS (planned) |

### Key Patterns
- **ADR-007:** SSR-friendly stores with `useAsyncData`
- **ADR-010:** Domain-driven serialization (repository layer)
- **ADR-015:** Idempotent automated jobs with rolling window

> **For developers:** See [Architecture Decision Records](adr.md) for detailed patterns.

---

*Last Updated: April 2026*
