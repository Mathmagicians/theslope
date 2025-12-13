# Feature Proposal: Maintenance Import/Export

**Status:** Draft | **Date:** 2025-12-12

## Problem Statement

TheSlope needs to:
1. **Bootstrap** the system from existing Google Sheets/CSV data (season, teams, orders)
2. **Export** current state for backup, migration, or spreadsheet reconciliation

## CSV File Format

### File 1: `calendar.csv` - Season & Cooking Days

```csv
date,weekday,team
11-08-2025,mandag,1
12-08-2025,tirsdag,1
13-08-2025,onsdag,2
...
13-10-2025,mandag,Efterårsferie
14-10-2025,tirsdag,Efterårsferie
...
22-12-2025,mandag,Juleferie
23-12-2025,tirsdag,Juleferie
...
```

**Columns:**
- `date`: DD-MM-YYYY format
- `weekday`: Danish weekday (mandag, tirsdag, onsdag, torsdag)
- `team`: Team number (1-8) OR holiday name (Efterårsferie, Juleferie, Vinterferie, Påskeferie, Kr. Himmelfart, Pinse, FRIT)

**Derived data:**
- `seasonDates`: First date → Last date
- `cookingDays`: WeekDayMap {mon, tue, wed, thu} = true (derived from weekday column)
- `holidays`: Consecutive date ranges where team is text (not a number)
- Team-to-date mapping for verification after team assignment

### File 2: `teams.csv` - Team Definitions

```csv
team,role,name,affinity
Madhold 1,CHEF,Maria,
Madhold 1,CHEF,Kristine,
Madhold 1,COOK,Mette,
Madhold 1,COOK,Kresten,tirs
Madhold 1,COOK,Søren L.,man
Madhold 1,JUNIORHELPER,Asta G.,man
Madhold 2,CHEF,Lise,
Madhold 2,CHEF,Agata,
...
```

**Columns:**
- `team`: Team name (Madhold 1, Madhold 2, ... Madhold 8)
- `role`: CHEF | COOK | JUNIORHELPER
- `name`: Inhabitant name (matching convention below)
- `affinity`: Optional weekday affinity (man, tirs, ons, tors) or empty for all team days

**Name matching convention:**
- First name only: `Maria`, `Kristine`
- First name + last initial (disambiguation): `Søren L.`, `Sara H.`
- First name + multiple last initials: `Mads B.H.` (for "Bruun Hovgaard")

### File 3: `orders.csv` - Order History (existing framelding format)

```csv
,Total DKK/måned,01/12/2025,02/12/2025,...
Abbey Road 1 th.,480,,,
Voksne,,1,0,...
Børn (2-12 år),,2,0,...
```

**Enhancement:** `0` values create `USER_CANCELLED` audit entries (prevents scaffolder from recreating).

## API Endpoint

### Single Orchestration Endpoint

```
POST /api/admin/maintenance/import
Content-Type: application/json

{
    calendarCsv: string,     // Required: Season + holidays + cooking days
    teamsCsv: string,        // Required: Team definitions + assignments
    ordersCsv?: string,      // Optional: Order history
    seasonShortName?: string // Optional: Override derived name
}
```

### Orchestration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shared Logic (useSeason)                      │
├─────────────────────────────────────────────────────────────────┤
│  generateDinnerEventDataForSeason()                              │
│  assignAffinitiesToTeams()                                       │
│  assignTeamsToEvents()                                           │
│  pruneAndCreate() for reconciliation                             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ calls
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ PUT /season   │    │ POST /generate│    │ POST /import  │
│ (orchestrated)│    │ (granular)    │    │ (orchestrated)│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ UI primary    │    │ Tests/Admin   │    │ Bootstrap     │
│ Creates +     │    │ Manual regen  │    │ CSV → Season  │
│ generates     │    │               │    │ + Teams +     │
│ events        │    │               │    │ Orders        │
└───────────────┘    └───────────────┘    └───────────────┘
```

**Key design decisions:**

1. **Backend orchestrates** - Season endpoints handle dinner event generation
   - `PUT /season` → creates season + generates dinner events
   - `POST /season/[id]` → updates season + reconciles dinner events (if dates/cookingDays/holidays changed)

2. **Granular endpoints kept** - For testing and manual admin override
   - `POST /season/[id]/generate-dinner-events` - manual regeneration
   - `POST /season/[id]/assign-cooking-teams` - manual team assignment

3. **Shared logic via composables** - All endpoints use same functions from `useSeason`
   - `generateDinnerEventDataForSeason()` - generate event data
   - `pruneAndCreate()` - idempotent reconciliation

4. **Batch processing (ADR-014)** - D1 safe operations
   - Curried chunk functions: `chunkArray<T>(size)` for batch sizing
   - Repository uses `createManyAndReturn` for bulk inserts
   - Sequential `Promise.all` batches for updates (no `updateManyAndReturn` in Prisma)

   **Note on D1 bound parameter limits:**
   - D1 has 100 bound parameters per query limit
   - However, Prisma's SQLite adapter **automatically splits `createMany`/`createManyAndReturn`** into multiple INSERT queries when the model has `@default(autoincrement())` fields
   - This means `saveDinnerEvents` (170+ events) works without manual chunking
   - Manual chunking is only needed for operations without autoincrement (e.g., bulk updates)
   - Reference: [Prisma Transactions and Batch Queries](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)

5. **Import reuses same patterns** - Just adds CSV parsing layer on top

### Processing Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Import Pipeline                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. PARSE CALENDAR CSV                                                 │
│     ├── Extract season date range (first/last dates)                   │
│     ├── Derive cooking days from weekday column                        │
│     ├── Identify holidays (consecutive dates with text team)           │
│     └── Build team-date mapping for verification                       │
│                                                                        │
│  2. UPSERT SEASON (idempotent by shortName)                           │
│     ├── Create/update season with derived data                         │
│     └── Generate dinner events for all cooking days                    │
│                                                                        │
│  3. PARSE TEAMS CSV                                                    │
│     ├── Parse team definitions with roles and affinities               │
│     └── Match names to Inhabitants (collect unmatched)                 │
│                                                                        │
│  4. UPSERT TEAMS + ASSIGNMENTS (idempotent)                           │
│     ├── Create/update CookingTeam records                              │
│     ├── Create/update CookingTeamAssignment for matched inhabitants    │
│     └── Derive team affinity from team's cooking days (odd=Mon-Tue)    │
│                                                                        │
│  5. ASSIGN COOKING TEAMS TO DINNER EVENTS                              │
│     └── Use existing assign-cooking-teams logic                        │
│                                                                        │
│  6. VERIFY TEAM-DATE MAPPING                                           │
│     └── Compare generated assignments vs CSV mapping                   │
│                                                                        │
│  7. IMPORT ORDERS (if ordersCsv provided)                              │
│     ├── For count > 0: Create BOOKED orders                            │
│     └── For count = 0: Create USER_CANCELLED audit entry               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Response Schema

```typescript
interface ImportResponse {
    season: {
        id: number
        shortName: string
        created: boolean      // false = updated existing
        dinnerEventsCount: number
        holidays: Array<{ name: string, start: string, end: string }>
    }
    teams: {
        created: number
        updated: number
        assignmentsCreated: number
        assignmentsUpdated: number
    }
    orders?: {
        created: number
        cancellations: number  // USER_CANCELLED entries
    }
    unmatched: string[]        // Names not found in Inhabitant table
    verification: {
        success: boolean
        mismatches: Array<{ date: string, expected: number, actual: number }>
    }
}
```

### Export Endpoint

```
GET /api/admin/maintenance/export?seasonId=123

Response: {
    calendar: string,  // CSV content
    teams: string,     // CSV content
    orders: string     // CSV content
}
```

## Inhabitant Matching Algorithm

```typescript
function matchInhabitant(csvName: string, inhabitants: Inhabitant[]): Inhabitant | null {
    const normalized = csvName.toLowerCase().trim()

    // Try exact match on "firstName lastName"
    let match = inhabitants.find(i =>
        `${i.name} ${i.lastName}`.toLowerCase() === normalized
    )
    if (match) return match

    // Try "firstName L." pattern (last initial)
    const initialMatch = normalized.match(/^(.+)\s+([a-zæøå])\.?$/i)
    if (initialMatch) {
        const [, firstName, lastInitial] = initialMatch
        match = inhabitants.find(i =>
            i.name.toLowerCase() === firstName.toLowerCase() &&
            i.lastName.toLowerCase().startsWith(lastInitial.toLowerCase())
        )
        if (match) return match
    }

    // Try "firstName A.B." pattern (multiple last initials)
    const multiInitialMatch = normalized.match(/^(.+)\s+([a-zæøå])\.([a-zæøå])\.?$/i)
    if (multiInitialMatch) {
        const [, firstName, init1, init2] = multiInitialMatch
        match = inhabitants.find(i => {
            if (i.name.toLowerCase() !== firstName.toLowerCase()) return false
            const lastParts = i.lastName.split(/\s+/)
            return lastParts.length >= 2 &&
                   lastParts[0].toLowerCase().startsWith(init1.toLowerCase()) &&
                   lastParts[1].toLowerCase().startsWith(init2.toLowerCase())
        })
        if (match) return match
    }

    // Try first name only (must be unique)
    const firstNameMatches = inhabitants.filter(i =>
        i.name.toLowerCase() === normalized
    )
    if (firstNameMatches.length === 1) return firstNameMatches[0]

    return null
}
```

## Idempotency (ADR-015)

Uses `pruneAndCreate` pattern from ADR-014 for reconciliation:

```typescript
const reconcile = pruneAndCreate<T, K>(getKey, isEqual)
const { create, update, idempotent, delete: toDelete } = reconcile(existing)(incoming)
```

| Entity | Key | Strategy |
|--------|-----|----------|
| Season | shortName | `pruneAndCreate`: update if exists, create if not |
| CookingTeam | name + seasonId | `pruneAndCreate`: reconcile teams, delete removed |
| CookingTeamAssignment | inhabitantId + cookingTeamId | `pruneAndCreate`: reconcile assignments |
| DinnerEvent | date + seasonId | `pruneAndCreate` via generate-dinner-events |
| Order | inhabitantId + dinnerEventId | Skip if exists (preserve user modifications) |
| USER_CANCELLED | inhabitantId + dinnerEventId + seasonId | Skip if already cancelled |

**Safe to re-run:** Running import multiple times produces same result.

## Test Data Files

Location: `.theslope/team-import/`

| File | Purpose |
|------|---------|
| `calendar.csv` | Production calendar (Aug 2025 - Jun 2026) |
| `teams.csv` | Production team definitions (all 8 teams) |
| `test_teams.csv` | Test team (Madhold 2 with test inhabitants) |

**test_teams.csv:**
```csv
team,role,name,affinity
Madhold 2,CHEF,Skraaningen,
Madhold 2,COOK,Mads B.H.,
Madhold 2,JUNIORHELPER,Babyyoda,
Madhold 2,COOK,Unknown,
```

Test cases:
- `Skraaningen` - Simple first name match
- `Mads B.H.` - Disambiguation with double last name initials ("Bruun Hovgaard")
- `Babyyoda` - First name match (lastName: "Yoda")
- `Unknown` - Unmatched name (reported in response)

## E2E Test (Skip CI/CD)

```typescript
test.describe('Maintenance Import/Export', () => {
    // Skip in CI/CD - .theslope data is gitignored
    const csvFiles = MaintenanceFactory.getCSVFiles()
    test.skip(csvFiles.length === 0, '.theslope is gitignored')

    test('GIVEN calendar CSV WHEN importing THEN creates season with correct holidays')
    test('GIVEN teams CSV WHEN importing THEN creates teams with assignments')
    test('GIVEN name with initials WHEN importing THEN matches correctly (Mads B.H.)')
    test('GIVEN unmatched name WHEN importing THEN reports in unmatched array')
    test('GIVEN order CSV with 0 WHEN importing THEN creates USER_CANCELLED')
    test('GIVEN existing season WHEN re-importing THEN updates idempotently')
    test('Import then export roundtrip preserves data')
})
```

## Makefile Integration

```makefile
CALENDAR_CSV := .theslope/team-import/calendar.csv
TEAMS_CSV := .theslope/team-import/teams.csv
TEST_TEAMS_CSV := .theslope/team-import/test_teams.csv
ORDERS_CSV := .theslope/order-import/orders.csv

theslope-import-local: theslope-login-local ## Import season + teams to localhost
    @curl -b .cookies.txt -X POST "$(URL_local)/api/admin/maintenance/import" \
        -H "Content-Type: application/json" \
        -d "{\"calendarCsv\": $$(cat $(CALENDAR_CSV) | jq -Rs .), \"teamsCsv\": $$(cat $(TEAMS_CSV) | jq -Rs .)}" | jq

theslope-import-test-local: theslope-login-local ## Import with test teams
    @curl -b .cookies.txt -X POST "$(URL_local)/api/admin/maintenance/import" \
        -H "Content-Type: application/json" \
        -d "{\"calendarCsv\": $$(cat $(CALENDAR_CSV) | jq -Rs .), \"teamsCsv\": $$(cat $(TEST_TEAMS_CSV) | jq -Rs .)}" | jq

theslope-export-local: theslope-login-local ## Export season data
    @curl -b .cookies.txt "$(URL_local)/api/admin/maintenance/export?seasonId=$(SEASON_ID)" | jq
```

## Files to Create

```
app/composables/useMaintenanceImportValidation.ts
server/routes/api/admin/maintenance/import.post.ts
server/routes/api/admin/maintenance/export.get.ts
tests/e2e/api/admin/maintenanceImport.e2e.spec.ts
tests/e2e/testDataFactories/maintenanceFactory.ts
```

## Files to Modify

```
server/routes/api/admin/billing/import.post.ts  # Add USER_CANCELLED for 0s
Makefile                                         # Add import/export targets
docs/adr-compliance-backend.md                   # Add endpoint compliance
```

## ADR Compliance

| ADR | Compliance |
|-----|------------|
| ADR-001 | Validation composable with Zod schemas |
| ADR-002 | Separate validation try-catch from business logic |
| ADR-003 | Factory pattern for test data |
| ADR-004 | Logging with `📥 > MAINTENANCE > [IMPORT]` prefix |
| ADR-009 | Response schemas with appropriate types |
| ADR-010 | Domain types throughout |
| ADR-011 | USER_CANCELLED audit entries for order cancellations |
| ADR-015 | Idempotent - safe to re-run multiple times |
