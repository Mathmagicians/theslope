# TheSlope System Overview

TheSlope is a community dining management platform for Skråningen co-housing. It handles meal booking, cooking team coordination, billing, and integration with external systems (Heynabo, PBS).

This overview is for architects: what the system does, its roles, entities and architecture. The guides show how to
use it; mockups live in the component headers.

> **User Guides:** [User Guide](../user-guide.md) | [Chef Guide](../chef-guide.md) | [Admin Guide](../admin-guide.md)

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
| **Season Management** | Create seasons, set cooking days, holidays, ticket prices | [Admin Guide](../admin-guide.md#season-management) |
| **Season Activation** | Activate seasons, auto-scaffold pre-bookings | [Admin Guide](../admin-guide.md#activate-a-season) |
| **Cooking Teams** | Create teams, assign members, set affinities | [Admin Guide](../admin-guide.md#cooking-teams) |
| **Weekly Preferences** | Set DINEIN/TAKEAWAY/NONE per weekday per person | [User Guide](../user-guide.md#sådan-sætter-du-ugentlige-præferencer) |
| **Preference Auto-Scaffolding** | Bookings auto-update when preferences change (ADR-015) | [User Guide](../user-guide.md#sådan-sætter-du-ugentlige-præferencer) |
| **Meal Booking** | Book/cancel dinners, day/week/month views (ADR-016) | [User Guide](../user-guide.md#sådan-tilmelder-du-dig-fællesspisning) |
| **Grid Booking** | Week/month grid with draft state, power mode | [User Guide](../user-guide.md#sådan-tilmelder-du-dig-fællesspisning) |
| **Guest Tickets** | Add guest tickets with allergy tracking | [User Guide](../user-guide.md#sådan-inviterer-du-en-gæst) |
| **Allergy Management** | Track allergies per inhabitant | [User Guide](../user-guide.md#sådan-tilføjer-du-allergier) |
| **Chef Dashboard** | View team, menu planning, allergen tracking | [Chef Guide](../chef-guide.md) |
| **Heynabo Event Sync** | Announce menus to Heynabo calendar | [Chef Guide](../chef-guide.md#annoncér-menu) |
| **Household Management** | View/edit households and inhabitants | [Admin Guide](../admin-guide.md#husstande) |
| **Multi-Household per Address** | Two families can coexist at one address during move (Heynabo import preserves both) | [Admin Guide](../admin-guide.md#husstande) |
| **Admin Household Edit** | Inline row-expand: move inhabitants between same-address households, delete household (CASCADE) | [Admin Guide](../admin-guide.md#sådan-flytter-du-en-beboer) |
| **Move-Out Date** | Members set own `moveOutDate`; bookings after date auto-pruned; pencil-gate UX | [User Guide](../user-guide.md#sådan-sætter-du-fraflytningsdato) |
| **Unified Booking Navigation** | Day/week/month arrows use one algorithm (period boundary → adjacent dinner) | — |
| **Season Import** | Import calendar and teams from CSV | [Admin Guide](../admin-guide.md#data-importexport) |
| **Billing Import** | Import orders from legacy CSV format | [Admin Guide](../admin-guide.md#billing--economy) |
| **Daily Maintenance** | Auto-consume dinners, close orders, create transactions | [Admin Guide](../admin-guide.md#system-maintenance) |
| **Monthly Billing** | Generate invoices, magic link sharing, CSV export | [Admin Guide](../admin-guide.md#økonomi) |
| **Job History Panel** | View/trigger system jobs, track run history | [Admin Guide](../admin-guide.md#systemvedligeholdelse) |
| **Authorization** | Role-based access control (Admin, AllergyManager) | — |
| **Waitlist** | Claim a released ticket or queue for one through the booking form; the chef releases portions; queue mails (ADR-016) | [User Guide](../user-guide.md) |
| **Chef Budget** | Income, allowance and kitchen share per dinner, grocery lines with VAT and a prefilled note, the team's round, ticket changes | [Chef Guide](../chef-guide.md#6-madbestilling-og-budget) |
| **Joker Slots** | A time-bound team vacancy with a period, weekdays, role and note, managed in the team card | [Admin Guide](../admin-guide.md#cooking-teams) |
| **Allergy Lines** | Allergy kuverter per dining mode in the kitchen stats, allergen counts in the chef's allergen row, a booked inhabitant's allergies on the ticket | [Chef Guide](../chef-guide.md) |
| **Dead-session Re-login** | A request that meets a 401 loads the login page with the current URL as redirect and returns there after sign-in | — |

### Partially Implemented

| Feature | Remaining Work |
|---------|----------------|
| **Chef Components** | Missing component tests for DinnerStatusStepper, TeamRoleStatus, DinnerDetailPanel |

### Planned

| Feature | Description |
|---------|-------------|
| **PBS Export** | Direct PBS file generation |
| **Duty Roster** | Templates, duties, audit trail, derived sign-off and cross-team swap (`release-0.9.3/feature-proposal-duty-roster.md`) |
| **Season Spending** | Sæsontrend per chef, admin Forbrug with scopes, basisvarer entry (`release-0.9.3/feature-proposal-season-spending.md`) |
| **Ad-hoc Charges** | Admin charges on a household, reversal, the spending views (`release-0.9.3/feature-proposal-adhoc-admin-billing.md`) |
| **Notification Triggers** | Roster and shift reminders, chefless-dinner alerts, duty swapped, the SMS channel (`release-0.9.3/feature-proposal-notification-triggers.md`) |
| **Developer Companion** | E2E as Gherkin features with playwright-bdd, `make bdd-report` in the summaries, `developer.skraaningen.dk` with the living documentation and the API reference per environment (`feature-proposal-developer-companion.md`) |

---

## Guides

The guides show the app with screenshots, in Danish: [user guide](../user-guide.md) for members,
[chef guide](../chef-guide.md) for the chef and the cooking team, [admin guide](../admin-guide.md) for admins.

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

> **For developers:** See [Architecture Decision Records](../adr.md) for detailed patterns.

---

*Last Updated: October 2026*
