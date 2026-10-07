# Feature Proposal: Duty Roster (with Audit Trail + Cross-Team Swap)

**Status:** Draft
**Date:** 2026-04-29
**Updated:** 2026-10-05 — refreshed for the work-roster push (`release-0.9.0.md`): chef-swap shipped (`assign-role`, `remove-role` live; `assignment/swap` did not ship — cross-team duty swap in Phase 5 covers the swap need); instrumentation of shipped endpoints is retroactive; Joker section added; schema lands via the PR's bundled Prisma package
**Builds on:** `../archived/feature-chef-swap.md` (shipped; its unshipped Phase 4 move-out cascade is carried here under Phase 5)

## Problem

Today the cooking-team model captures **who's on a team for the season** (`CookingTeamAssignment`) and **who's the chef of a dinner** (`DinnerEvent.chefId`), but nothing in between. Members know roughly which days they cook — they don't know *which time slot doing which task on which specific dinner*. Chefs negotiating who does prep vs. madlavning vs. opvask have no system support; it's all out-of-band agreement. When those agreements change ("Anna can't do Monday prep this week, Peter took it"), there's no record — no one downstream knows the swap happened.

Anna's case: she's on team 7 Tuesdays (50%) and team 6 Wednesdays (50%). Today she has two `CookingTeamAssignment` rows — that part of the model is rich enough. But she has no way to:
- See her concrete duties for the season ("Tuesday Apr 15: COOK 15:00–18:00 madlavning")
- Swap her Monday duty with Peter's Thursday duty (he's on a different team)
- Show the team that the swap happened, or let her chef sign off the change

This proposal introduces the **duty roster**: the per-dinner allocation layer that names every member's concrete duty on a specific dinner (role, time slot relative to dinner start, task description). On top of that:

- **Audit trail** — every change to membership or duty recorded in a single timeline. Mirrors the existing `OrderHistory` UX: per-row expand to see history; per-dinner expand to see "how this dinner's roster has been changing."
- **Cross-team duty swap** — Anna (team 7, Mon prep) ↔ Peter (team 2, Thu prep). Both teams see the swap.
- **Per-dinner chef sign-off** — chef confirms the roster ~1–2 weeks before dinner; sign-off is itself an audit event. Survives subsequent edits (sickness, swaps).

## Scope

- New models: `DinnerDutyTemplate`, `JokerSlot`, `DinnerDuty`, `DutyHistory`. New enums: `DutyAuditAction`, `DutyOrigin`. `CookingTeamAssignment` stays untouched; `DinnerEvent` gains the `dinnerDuties` back-relation only.
- New utility: `getDutyTimeRange()` in `app/utils/season.ts`, sibling of `getDinnerTimeRange()`.
- Audit instrumentation on every existing site that mutates `CookingTeamAssignment` or `DinnerEvent.chefId / cookingTeamId`, plus the chef-swap PR's pending endpoints when they land.
- Read endpoints: per-dinner roster history; per-team-member assignment history.
- `AuditTimeline.vue` — generic component extracted from existing `OrderHistoryDisplay.vue`, used by both order and roster history.
- Admin UI for `DinnerDutyTemplate` CRUD; chef UI for single-dinner roster editing and sign-off.
- Member UI: "Byt tjans" panel on any duty row (extends generic `RoleAssignment.vue` from chef-swap to all roles).
- Cross-team duty swap endpoint + UI.

Out of scope (future work):
- Notifications on swap / sign-off / duty changes.
- Two-sided swap consent flow (this proposal uses one-sided commit with `agreementConfirmed`, mirrors chef-swap).
- Audit retention / archival.

## Model

The "roster" is a derived view: `DinnerEvent.dinnerDuties` (the duty rows for one dinner). No `Roster` row, no roster-level state — a roster IS its duties. Sign-off is per-duty.

| Layer | Model | Scope | Status |
|---|---|---|---|
| **1. Season membership** | `CookingTeamAssignment` (existing) | "Anna is on team 7, Tuesdays, 50%" | unchanged |
| **2. Team time-slot template** | `DinnerDutyTemplate` (NEW) | "Team 7's standard slots: 3h before dinner = madlavning COOK 180min" | new |
| **3. Concrete dinner duty** | `DinnerDuty` (NEW) | "Anna is on dinner 2026-04-15, COOK, 3h before dinner, 180min, madlavning" — links directly to `DinnerEvent` | new |
| **Audit** | `DutyHistory` (NEW) | Timeline of duty changes and roster sign-offs: `DUTY_ASSIGNED`, `DUTY_UNASSIGNED`, `DUTY_SWAPPED`, `DUTY_UPDATED`, `ROSTER_SIGNED_OFF` | new |

## Schema additions ✅ signed 2026-10-07

Terms: a **template duty** is one row of the team's standard roster; a **roster duty** is one `DinnerDuty` on one
dinner, with role, time and task copied from the template at creation (a template edit changes future rosters
only); a duty without a person is **vacant**; a **joker** is a time-bound team assignment without a person,
modelled as its own table beside `CookingTeamAssignment` (which stays untouched — SQLite cannot alter a column's
nullability without a table rebuild).

Derived, never stored: **completed** = the dinner is CONSUMED and the duty has a person (the skeleton crew's duties
on an unsigned roster count); **roster signed** = the dinner's latest `ROSTER_SIGNED_OFF` row is newer than the
latest duty change on any of its duties; **workload** = completed duties per person, split by `DutyOrigin` and the
chef role. Why a duty was not completed is not recorded.

```prisma
enum DutyAuditAction {
  DUTY_ASSIGNED
  DUTY_UNASSIGNED
  DUTY_SWAPPED
  DUTY_UPDATED
  ROSTER_SIGNED_OFF
}

enum DutyOrigin {
  TEAM
  JOKER
  VOLUNTEER
  SWAP
}

// A team's standard duties for a cooking day: one row per person needed
model DinnerDutyTemplate {
  id                     Int         @id @default(autoincrement())
  cookingTeamId          Int
  cookingTeam            CookingTeam @relation(fields: [cookingTeamId], references: [id], onDelete: Cascade)
  role                   Role        @default(COOK)
  minutesFromDinnerStart Int // signed offset from the dinner's start time
  durationMinutes        Int
  taskDescription        String
  createdAt              DateTime    @default(now())
  updatedAt              DateTime    @updatedAt

  @@index([cookingTeamId])
}

// A time-bound team assignment without a person: one more of a role, open to any volunteer per dinner
model JokerSlot {
  id                   Int         @id @default(autoincrement())
  cookingTeamId        Int
  cookingTeam          CookingTeam @relation(fields: [cookingTeamId], references: [id], onDelete: Cascade)
  role                 Role        @default(COOK)
  allocationPercentage Int         @default(100)
  affinity             String // JSON stringified map of Weekday to boolean
  startDate            DateTime
  endDate              DateTime
  note                 String?
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt

  @@index([cookingTeamId])
}

// A roster duty on one dinner; role, time and task are copied from the template at creation
model DinnerDuty {
  id                     Int           @id @default(autoincrement())
  dinnerEventId          Int
  dinnerEvent            DinnerEvent   @relation(fields: [dinnerEventId], references: [id], onDelete: Cascade)
  inhabitantId           Int? // null = vacant
  inhabitant             Inhabitant?   @relation(fields: [inhabitantId], references: [id], onDelete: SetNull)
  origin                 DutyOrigin    @default(TEAM)
  role                   Role
  minutesFromDinnerStart Int // signed offset from the dinner's start time
  durationMinutes        Int
  taskDescription        String
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt
  history                DutyHistory[]

  @@index([dinnerEventId])
  @@index([inhabitantId])
}

// Audit timeline of duties and roster sign-offs; the denormalized keys outlive the duty
model DutyHistory {
  id                Int             @id @default(autoincrement())
  dinnerDutyId      Int? // null for ROSTER_SIGNED_OFF
  dinnerDuty        DinnerDuty?     @relation(fields: [dinnerDutyId], references: [id], onDelete: SetNull)
  action            DutyAuditAction
  performedByUserId Int? // null = system
  performedByUser   User?           @relation(fields: [performedByUserId], references: [id], onDelete: SetNull)
  auditData         String // JSON
  timestamp         DateTime        @default(now())
  swapGroupId       String? // shared by the two rows of one swap
  inhabitantId      Int?
  dinnerEventId     Int?
  seasonId          Int?

  @@index([dinnerDutyId])
  @@index([performedByUserId])
  @@index([inhabitantId])
  @@index([dinnerEventId, action])
  @@index([seasonId])
  @@index([timestamp])
  @@index([swapGroupId])
}
```

Back-relations: `CookingTeam.dutyTemplates`, `CookingTeam.jokerSlots`, `DinnerEvent.dinnerDuties`,
`Inhabitant.dinnerDuties`, `User.dutyHistory`.

`DutyOrigin` on a duty says how its holder got there — TEAM (the team's own member), JOKER (a planned vacancy via a
joker slot), VOLUNTEER (an unplanned vacancy, someone released or sick, taken by whoever shows up), SWAP (came in by
a duty swap). Volunteering writes a duty with its origin, never a `CookingTeamAssignment` row. Roster markers:
joker / frivillig / bytter. The actor invariant: `ROSTER_SIGNED_OFF` carries a null actor on auto-sign and the chef
on "Godkend alligevel"; every `DUTY_*` row carries the acting user.

## Default templates (`app.config.ts`) + team-creation bootstrap

Each new `CookingTeam` is bootstrapped with a starting set of `DinnerDutyTemplate` rows pulled from `app.config.ts`. Mirrors the existing `defaultSeason` / `defaultDinnerStartTime` convention.

```ts
// app.config.ts (extend the `theslope` namespace)
defaultDinnerDutyTemplates: [
    { role: 'COOK',         minutesFromDinnerStart: -600, durationMinutes: 180, taskDescription: 'Prep'        }, // 08:00–11:00
    { role: 'COOK',         minutesFromDinnerStart: -180, durationMinutes: 180, taskDescription: 'Madlavning'  }, // 15:00–18:00
    { role: 'CHEF',         minutesFromDinnerStart: -180, durationMinutes: 180, taskDescription: 'Chefkokketjans - madlavning'  }, // 15:00–18:00
    { role: 'COOK',         minutesFromDinnerStart:  -90, durationMinutes: 180, taskDescription: 'Mellemvagt'  }, // 16:30–19:30
    { role: 'JUNIORHELPER', minutesFromDinnerStart:  -90, durationMinutes:  90, taskDescription: 'Børnetjans' }, // 16:30–18:00
    { role: 'COOK',         minutesFromDinnerStart:   30, durationMinutes: 180, taskDescription: 'Opvask'      }  // 18:30–21:30
]
```

(Wall-clock times shown as comments assume the global `defaultDinnerStartTime: 18`. If that ever moves, the templates auto-track via the relative-time encoding.)

**Out of scope** — chef-week-before planning duty is **not** a `DinnerDutyTemplate`. It's a deadline obligation tracked via the existing `menuIsAnnouncedDaysBefore: 10` in `app.config.ts`, plus a future grocery-deadline mechanism. Mixing planning sessions with same-day kitchen shifts in one model would conflate two different lifecycles.

**Bootstrap points** (no audit rows — bootstrap is initial state, not a change):
- `PUT /api/admin/team/index.put.ts` (manual team add) — after team row inserted, write default templates in same pass via `createMany`.
- `server/utils/teamService.ts` and `POST /api/admin/season/import.post.ts` (CSV team creation) — same hook.
- **Existing teams** (created before this feature ships) get a one-time admin-triggered "Indlæs standardvagter" button per team in the admin UI (Phase 3) that bootstraps the defaults idempotently — `pruneAndCreate` keyed on `(cookingTeamId, role, minutesFromDinnerStart, taskDescription)` so re-runs don't duplicate.

After bootstrap, the team admin can edit / add / remove templates per team — defaults are just the starting point. Template edits don't write to `DutyHistory` (this audit is per-duty, not per-template). If we later want a separate template-edit log, that's a different audit table.

## Time encoding: relative to dinner start

`minutesFromDinnerStart` is a **signed integer** anchored to the dinner's start time.

- `-180` = 3h before dinner
- `0` = dinner start
- `+120` = 2h after dinner

Why relative, not wall-clock:
- **Chef mental model is relative** ("prep done 3h before dinner") — storage matches reasoning.
- **Survives global config changes** — if `defaultDinnerStartTime` ever moves from 18 to 19, every duty/template auto-shifts to keep its semantic relationship intact. No data migration.
- **Future-proof for per-dinner start times** — if `DinnerEvent` ever gains a per-dinner `dinnerStartHour`, the duty timing automatically tracks the override.
- **Sorts chronologically** — `-480, -180, 0, +120` is natural ascending order; no special-case sort needed.
- **Sign carries meaning** — self-documenting (before/after dinner).
- **One field beats two** — single signed integer, not separate hour+minute pair.

Reads always go through a thin sibling of `getDinnerTimeRange`:

```ts
// app/utils/season.ts (extend, next to existing getDinnerTimeRange at line 429)
export const getDutyTimeRange = (
    dinnerDate: Date,
    dinnerStartHour: number,         // from getDefaultDinnerStartTime()
    minutesFromDinnerStart: number,  // signed; from DinnerDuty / DinnerDutyTemplate
    durationMinutes: number
): DateRange => {
    const dinnerStart = createDateInTimezone(dinnerDate, dinnerStartHour)  // existing — utils/date.ts:361
    const start = addMinutes(dinnerStart, minutesFromDinnerStart)          // existing — date-fns
    const end = addMinutes(start, durationMinutes)                         // existing — date-fns
    return {start, end}
}
```

Pure composition of existing primitives. Timezone correctness inherited from `createDateInTimezone`. Mirrors the shape of `getDinnerTimeRange` so the codebase has one consistent pattern for "compose a wall-clock range from a date + offset + duration."

## Cascade strategy (per ADR-005, ADR-011)

| Relationship | Behavior | Reason |
|---|---|---|
| `DutyHistory → DinnerDuty` | SET NULL | History outlives the duty; the denormalized `dinnerEventId / inhabitantId / seasonId` carry the queries |
| `DutyHistory → User` (`performedByUser`) | SET NULL | The actor is nullable (system rows); a deleted user's rows render as "System", as `OrderHistory` does |
| `DinnerDuty → DinnerEvent` | CASCADE | Duties die with their dinner; history survives via the denormalized keys |
| `DinnerDuty → Inhabitant` | SET NULL | The duty becomes vacant |
| `DinnerDutyTemplate → CookingTeam` | CASCADE | Templates die with their team |
| `JokerSlot → CookingTeam` | CASCADE | Joker slots die with their team |

## Object counts — example scenario

Team T with 2 members (Anna, Per), cooking on 10 Tuesdays.

| Model | Count | Notes |
|---|---|---|
| `CookingTeam` | 1 | the team |
| `DinnerDutyTemplate` | 6 | per-team agreement (bootstrapped from app.config defaults) |
| `CookingTeamAssignment` | 2 | one per (team, member). **Independent of how many cooking days.** Anna and Per. |
| `DinnerEvent` | 10 | one per Tuesday. After bulk team-assign step, each has `cookingTeamId = T.id` |
| `DinnerDuty` | **20** | 2 members × 10 dinners. **Member-centric scaffold**: at season activation, one row per (member, dinner) with role from `CookingTeamAssignment`, `state = PLANNED`, slot fields NULL. Chef pairs templates ~1–2 weeks before dinner; pairing copies template fields onto the row. |
| `DutyHistory` | grows from 0 | empty at scaffold (initial state isn't a change). Each mutation appends a row. |

**Total at season activation: 39 rows** for this team's slice (1 + 6 + 2 + 10 + 20). `DutyHistory` starts empty and grows as humans interact. Chef can later add ad-hoc duty rows (guests) or remove a row — both audited.

Why member-centric scaffold (not slot-centric):
1. **Matches user wording** — "each member should know they are assigned a duty on a given day." Members are assigned (rows exist with `inhabitantId`); specifics are TBD.
2. **No K-vs-M mismatch.** A team with 4 templates and 2 members produces 20 rows (member-driven), not 40 (template-driven). Reflects reality: chef merges/assigns templates to whoever's available.
3. **Lighter DB footprint** — ~57% reduction at scale.
4. **Cleaner audit** — `DUTY_ASSIGNED` / `DUTY_UNASSIGNED` mutate a row's `inhabitantId`, not "create a row that maps a vacant slot to a person."

Chef-edit lifecycle on a single dinner:

| Step | DinnerDuty rows for this dinner | DutyHistory rows |
|---|---|---|
| 1. Roster created from the template | one duty per template duty, role/time/task copied; Anna and Per assigned (origin TEAM) | (none — the initial state is not a change) |
| 2. Every duty filled | unchanged | `ROSTER_SIGNED_OFF` (system) |
| 3. Per gets sick, releases | Per's duty vacant (`inhabitantId` null) | `DUTY_UNASSIGNED` (Per); the roster reads unsigned again |
| 4. Bo shows up and takes it | Bo on Per's duty, origin VOLUNTEER | `DUTY_ASSIGNED` (Bo), then `ROSTER_SIGNED_OFF` (system) |
| 5. Dinner consumed | unchanged — completed is derived from the dinner's state | (none) |

## Mutation instrumentation map

This audit covers duty changes and roster sign-offs. Out of scope: team-membership events, team-to-dinner-binding events.

| Endpoint / code path | Audit action — `performedByUserId` |
|---|---|
| `POST /api/team/cooking/[id]/assign-role` (shipped) | `DUTY_ASSIGNED` (caller) — covers volunteer / claim / takeover / chef-assign |
| `POST /api/team/cooking/[id]/remove-role` (shipped) | `DUTY_UNASSIGNED` (caller) |
| `POST /api/team/cooking/duty/swap` (this proposal, Phase 5) | TWO `DUTY_SWAPPED` rows sharing `swapGroupId` (caller) |
| Move-out cascade (chef-swap Phase 4 / extends here) | `DUTY_UNASSIGNED` per affected duty (`performedByUserId` = the admin who triggered the move-out) |
| Roster sign-off (Phase 4) | one `ROSTER_SIGNED_OFF` row per sign-off, `dinnerDutyId` null, `dinnerEventId` set — actor null when every duty is filled (auto), the chef on "Godkend alligevel" |
| Chef edits a duty (Phase 4) | `DUTY_UPDATED` (chef) |

Pattern in code (mirrors `financesRepository.createOrders` paired-`createMany` pattern; D1 has no transactions):

```ts
// server/data/cookingRepository.ts (NEW — or extend prismaRepository.ts)
const writeDutyHistory = (d1Client: D1Database, entries: DutyHistoryCreate[]) =>
    entries.length ? prisma.dutyHistory.createMany({ data: entries.map(serializeDutyHistory) }) : Promise.resolve()

// In assign-role endpoint (after the duty mutation):
await Promise.all([
    saveDuty(...),
    writeDutyHistory(d1Client, [{
        action: DutyAuditAction.DUTY_ASSIGNED,
        performedByUserId: caller.id,
        dinnerDutyId: duty.id,
        inhabitantId: caller.inhabitant.id,
        dinnerEventId: dinnerEvent.id,
        seasonId: dinnerEvent.seasonId,
        auditData: createDutyAuditData({ before: snapshotDutyBefore, after: snapshotDuty(duty) })
    }])
])

// Roster sign-off: one row for the dinner; performedByUserId null on auto-sign, the chef on "Godkend alligevel"
await writeDutyHistory(d1Client, [{
    action: DutyAuditAction.ROSTER_SIGNED_OFF,
    performedByUserId: actorId,
    dinnerDutyId: null,
    dinnerEventId: dinner.id,
    seasonId: dinner.seasonId,
    auditData: createDutyAuditData({ snapshot: snapshotRoster(duties) })
}])
```

## auditData JSON shape

```ts
DutyAuditDataSchema = z.object({
  before:   DutyEntitySnapshotSchema.optional(),  // null on create / sign-off
  after:    DutyEntitySnapshotSchema.optional(),  // null on delete
  snapshot: DutyEntitySnapshotSchema.optional(),  // the roster snapshot on ROSTER_SIGNED_OFF
  partner:  z.object({ inhabitantId: IdSchema, dinnerEventId: IdSchema.optional() }).optional()  // swap correlation
})

DutyEntitySnapshotSchema = z.object({
  inhabitantId:           IdSchema.nullable(),
  inhabitantNameWithInitials: z.string().optional(),
  role:                   TeamRoleSchema,
  dinnerEventId:          IdSchema,
  dinnerDate:             z.coerce.date(),
  minutesFromDinnerStart: z.number().int(),
  durationMinutes:        z.number().int().min(1),
  taskDescription:        z.string()
})
```

## Read paths — UI

| Where | What it shows | Endpoint |
|---|---|---|
| **`DinnerCard` / `ChefMenuCard`** — expandable section per dinner | Timeline of all events for dinner D + relevant team-level events for D's `cookingTeamId` since season start. Mirror of `OrderHistoryDisplay.vue` UTimeline. | `GET /api/dinner-event/[id]/duty-history` (NEW) |
| **`CookingTeamCard`** — expandable per team member | Timeline of that member's assignment history. | `GET /api/team/cooking/[id]/member/[inhabitantId]/history` (NEW) |
| **Member planning face** — my duties on `/chef` ✅ signed 2026-10-06 | The existing calendar/agenda carries it: my duty days marked on the calendar (+ the signed gap markers), the agenda row gains the duty line, vacancy rows render inline with [Tag tjansen]; day select opens the CTC dinner face where byt/afgiv/tag live. No new component. | Extends existing `GET /api/team/my` |

Reuse `OrderHistoryDisplay.vue`'s pattern — extract a generic `AuditTimeline.vue` (props: `entries: AuditEntryDisplay[]`, `actionConfig: Record<Action, {icon, color, labelDa}>`) so both order history and roster history render via the same component.

## Validation composables

```ts
// app/composables/useDutyValidation.ts (NEW)
export const useDutyValidation = () => {
  // DutyAuditActionSchema, DutyOriginSchema: imported from ~~/prisma/generated/zod and re-exported (ADR-001)
  const DinnerDutyTemplateSchema = z.object({...})
  const JokerSlotSchema          = z.object({...})
  const DinnerDutySchema         = z.object({...})
  const DinnerDutyCreateSchema   = DinnerDutySchema.omit({id: true, createdAt: true, updatedAt: true})
  const DinnerDutyUpdateSchema   = DinnerDutySchema.partial().extend({id: IdSchema})
  const DutyEntitySnapshotSchema = z.object({...})
  const DutyAuditDataSchema      = z.object({...})
  const DutyHistoryDisplaySchema = z.object({...})  // mirror OrderHistoryDisplaySchema
  const DutyHistoryDetailSchema  = DutyHistoryDisplaySchema.extend({
    dinnerDuty: DinnerDutySchema.nullable()
  })
  const DutyHistoryCreateSchema  = DutyHistoryDisplaySchema
    .omit({id: true, timestamp: true, performedByUser: true})
    .refine(
      h => h.action === DutyAuditAction.ROSTER_SIGNED_OFF
        ? h.dinnerDutyId == null                                   // roster-level; actor null (auto) or the chef
        : h.dinnerDutyId != null && h.performedByUserId != null,   // every DUTY_* row names its duty and actor
      'ROSTER_SIGNED_OFF carries no duty; DUTY_* rows carry duty and actor'
    )

  const createDutyAuditData    = (data: DutyAuditData): string => JSON.stringify(data)
  const deserializeDutyAuditData = (s: string): DutyAuditData =>
    DutyAuditDataSchema.parse(JSON.parse(s))

  return { /* schemas + transforms */ }
}
```

## Joker — time-bounded team vacancy (decisions 2026-10-05)

A joker is a time-bound team assignment without a person: the team needs one more of a role on its affinity
weekdays within a period (a member away on leave or travel). It is the `JokerSlot` table beside
`CookingTeamAssignment` (§ Schema additions) — same shared characteristics (team, role, allocation, affinity), plus
period and note. The roster never points at the slot: a joker vacancy is a vacant duty of the slot's role on a day the
slot is active; a volunteer takes it one dinner at a time, and the duty records `origin = JOKER`
(`DUTY_ASSIGNED` audit; releasing writes `DUTY_UNASSIGNED` and the duty is open again).

### Vacancy is a "missing" on the dinner

A dinner missing its chef or carrying a vacant duty (regular or joker) surfaces the gap on the dinner itself — the
existing missing-chef display pattern extends to "mangler: 1 kok". Volunteer actions live on the dinner roster
(`/chef` is where team members plan their work and see the roster).

### Admin overviews

The team administrator sees vacancies and load in `/admin/teams`:
- **Team card:** the team's joker slots (CRUD) and, per member, the season's shift counts split by kind
  (chefkok / fast tjans / joker) — volunteers see how the extra load spreads.
- **Big overview:** all vacancies across the season, split on teams and split on people.

The team card's joker slots and shift counts are part of the signed CTC season face — § Roster UX.

**Mockup — joker slot form** ✅ signed 2026-10-06 (admin teams, team detail, under the Jokertjanser list)

```
[ + Tilføj jokertjans ]
   +- form:
      Periode   [07/10/2026] - [01/12/2026]      <- CalendarDateRangePicker
      Ugedage   [man][tir][ons][tor][fre][lør][søn]   <- affinity-checkboxes fra TeamMemberAddForm
      Rolle     [KOK v]                               <- ROLE_ICONS select
      Note      [Anna barsel            ]             <- fri tekst, valgfri
      [Opret]  [Fortryd]
```

The scaffolder expands the slot to one vacant duty per matching cooking day in the period. Deleting a slot removes
its unclaimed future duties; claimed duties survive — the volunteer keeps their duty (audited).

**Mockup — vacancy big overview (admin teams)** ✅ signed 2026-10-06

Mounts in the admin teams overview region (no team selected), under the all-teams calendar. Per team,
chronological; a vacant duty shows its origin — the joker slot's note, or who released a regular duty (audit).
No person linkage beyond that: a joker slot covers no named member (no `coversInhabitantId`). Rows link into the
day's game plan.

```
AdminTeams — overblik (intet hold valgt)
  [all-teams kalender med mangler-markeringer]

  Ledige tjanser — sæson 2026/1   (pr. hold, kronologisk)
    Hold 3 — 2 huller
      ti 14/10   Madlavning   (joker: Anna barsel)     ledig
      ti 21/10   Madlavning   (joker: Anna barsel)     ledig
    Hold 6 — 1 hul
      on 22/10   Opvask       (afgivet af Per)         ledig
```

**Calendar marker vocabulary** ✅ signed 2026-10-06 — design-system tokens, ink-coloured ("black"), one glyph per
gap kind on a calendar day: chef hat = missing chef, joker hat = unfilled joker duty, dot = unfilled regular duty.
Glyphs picked from the icon set at implementation; the token names are the contract.

The dinner-roster rendering of jokers lives in § Roster UX (the CookingTeamCard dinner face).

### Volunteering moves from membership to duty

Today `assign-role` writes a `CookingTeamAssignment` — the designed way to live without a roster layer. With the
roster, a one-dinner volunteer claims the dinner's duty (or takes the chef duty) and season membership stays what it
is. The endpoint's write target changes with Phase 4, and the shipped rows get a one-time data separation before
this feature ships: genuine season members keep their `CookingTeamAssignment`, one-off volunteers are re-expressed
as duty history. The separation list is produced for the user to review; the user applies it.

## Roster UX — CookingTeamCard drives it ✅ signed 2026-10-05

A template duty is one row of the team's standard roster: three cooks 15–18 are three identical template duties.
A dinner's roster has one roster duty per template duty, with role, time and task copied at creation; a vacancy is a
roster duty without a person. Capacity is edited by adding/removing template duties; counts in the UI are derived by
grouping identical (time, task, role) duties. A roster duty's copied time can be edited for a one-off deviation
("Emil kommer 15-16 i dag"), shown inline.

**Sign-off is derived.** Every duty filled → the roster auto-signs (`ROSTER_SIGNED_OFF`, system actor). Short → the
status line reads "MANGLER n" and the chef's [Godkend alligevel] appears (`ROSTER_SIGNED_OFF`, chef actor — approved
short-handed). Any later change re-evaluates. Duty-level admin bypass is parked as nice-to-have; the admin's lever is
moving people between teams (existing membership UI).

| Role | Powers |
|---|---|
| Team member | take a vacant duty, give up / swap their own |
| Chef | godkend-alligevel, ad-hoc extra duty (rare), release extra portions (`feature-proposal-waitlist.md`) |
| Admin | membership moves; game-plan drill-down is view-only |
| System | auto-sign and re-evaluation |

**Mockup — CTC dinner face** (`/chef`, `/dinner`; members get the same table with self-service on own rows) ✅ signed 2026-10-05

```
CookingTeamCard — Hold 3 — tirsdag 15/04
  Hvem kommer: 4 af 5 — MANGLER 1          [Godkend alligevel]   <- kun ved mangel

  08:00-11:00   Prep (1)        Anna                     [byt/afgiv på egne rækker]
  15:00-18:00   Madlavning (3)  Maria (byt: Per) · Per · Ledig  [Tag tjansen]
  15:00-16:00   Børnetjans (1)  Emil — hjælper med mad eller borddækning
  18:30-21:30   Opvask (1)      Bo (joker)

  ...sidste plads tages ->  Hvem kommer: 5 af 5 — GODKENDT (auto)

  Fast hold                                         [v]   <- collapsed footer
```

**Mockup — CTC season face** (admin teams) ✅ signed 2026-10-05

```
CookingTeamCard — Hold 3
  [holdbadges] + medlemsliste med roller/ugedage            (som i dag)
  Jokertjanser:  07/10-01/12  tirsdag  KOK  "Anna barsel"  [slet]  [ + ]
  Tjanser — [kokkehue] Chefkok · [gryde] Fast tjans · [jokerhue] Joker · [hjerte] Frivillig · I alt
    Anna   2 · 8 · 0 · 0 · 10
    Per    0 · 10 · 1 · 0 · 11
    Bo*    0 · 0 · 3 · 2 · 5        (* ikke medlem af holdet)

  Spilleplan:  [vælg maddag v]   -> den valgte dags vagtplan-tabel, view-only
```

Which face leads is decided by whether CTC receives a dinner context. Deviation markers come from the audit trail
(`origin` SWAP → "bytter", JOKER → "joker", VOLUNTEER → "frivillig"; a vacant duty of a role with an active joker slot
→ "Ledig (joker)"). Vacancies also
surface as a "mangler"-marker on the day in the calendar and on the dinner (the missing-chef pattern). The Flytter
badge is dropped from `/chef` — the vacancy itself carries the story; admin teams reads it from the joker slot's
note. No `requiredCount` field — rows model capacity.

## ADR compliance

| ADR | Compliance |
|---|---|
| **ADR-001** Three-layer types | New schemas in `useDutyValidation`; `DutyAuditAction` and `DutyOrigin` enums imported from `~~/prisma/generated/zod`; re-exported for app code |
| **ADR-002** Separate try-catch | New endpoints follow validation/business split |
| **ADR-005** Cascade strategy | SET NULL on history FKs, CASCADE on duty→event (matches OrderHistory pattern) |
| **ADR-009** Display vs Detail | `DutyHistoryDisplay` (lightweight) for index; `DutyHistoryDetail` (with teamAssignment + dinnerDuty) for `/[id]` |
| **ADR-010** Domain serialization | `auditData` is a JSON String column; serialize/deserialize in validation composable |
| **ADR-011** Audit-survives-deletion | SET NULL FKs + denormalized `inhabitantId / dinnerEventId / seasonId` |
| **ADR-014** Batch operations | Bulk audit writes via `createMany` (chunked); season import + activation use `createManyAndReturn` for duties |
| **ADR-015** Idempotent jobs | Season-activation duty scaffold uses `pruneAndCreate` keyed on `(dinnerEventId, role, minutesFromDinnerStart, taskDescription, ordinal among identical duties)`; re-run safe |
| **ADR-016** Generator/Scaffolder pattern | Duty scaffolder mirrors prebooking pattern: pure `decideDutyAction` → scaffolder applies; lives in `useDuty.ts` + `server/utils/scaffoldDuties.ts` |

## Phases

Chef-swap shipped volunteer/claim/resign for the CHEF role (`assign-role`, `remove-role`). This proposal delivers everything else; its Phase 1 instruments the shipped endpoints retroactively.

### Phase 0 — This proposal ✍️

The current document. Reviewable artifact before code.

### Phase 1 — Schema + audit infrastructure (no behavior change)

- Schema (in the 0.9 Prisma bundle): `DinnerDutyTemplate`, `JokerSlot`, `DinnerDuty`, `DutyHistory`, enums `DutyAuditAction`, `DutyOrigin`; back-relations only on `CookingTeam`, `DinnerEvent`, `Inhabitant`, `User`.
- `useDutyValidation` composable + unit tests.
- `getDutyTimeRange` added to `app/utils/season.ts` next to `getDinnerTimeRange` + unit tests.
- Repository functions in `cookingRepository.ts` (or extend `prismaRepository.ts`): `writeDutyHistory(entries[])`, `fetchDutyHistoryForDinner(dinnerEventId)`, `fetchDutyHistoryForMember(cookingTeamId, inhabitantId)`.
- Instrument existing mutation sites: `assign-role`, `admin/team/assignment` PUT/DELETE/POST, `admin/dinner-event/[id]`, `admin/season/[id]/assign-cooking-teams`, `admin/season/import`. Each site adds a paired audit write in the same pass.
- Instrument the shipped chef-swap endpoints retroactively (`assign-role`, `remove-role`, move-out cascade).
- E2E tests: each mutation site asserts the corresponding `DutyHistory` row is created with the right action and actor.

### Phase 2 — Read endpoints + generic `AuditTimeline.vue`

- `GET /api/dinner-event/[id]/duty-history` and `GET /api/team/cooking/[id]/member/[inhabitantId]/history`.
- Extract `AuditTimeline.vue` (generic) from `OrderHistoryDisplay.vue`. Both order and roster timelines render via it.
- Wire into the CTC faces as collapsed-by-default expandables ✅ signed 2026-10-06: per dinner under the roster
  table (dinner face), per member on the member row (season face) — one component, two mounts, the order-history
  `actionConfig` pattern (icon + colour + Danish label per verb); system events name "automatisk" as actor.

```
Historik                                              [v]
 +- 06/10 14:02   Byt: Maria overtog Madlavning fra Per (aftalt)
    05/10 09:11   Emil tog Børnetjansen (joker)
    04/10 21:30   Vagtplan godkendt (automatisk — alle sæder besat)
    01/10 08:00   Per afgav Madlavning
```
- Tests: component unit + E2E.

### Phase 3 — DinnerDutyTemplate CRUD + duty scaffolding

- Admin team UI: edit `DinnerDutyTemplate` rows for a team (CRUD) — mockup below (✅ signed 2026-10-06). Entry is
  wall-clock, stored as `minutesFromDinnerStart` + `durationMinutes` composed with the global dinner start, and
  displayed with the relative hint; the add-form keeps its values between adds so identical template duties duplicate fast.

```
Standardvagter — Hold 3            (admin teams, holdets detalje — ✅ 2026-10-06)
  Tid                             Opgave           Rolle
  08:00-11:00  (10t før middag)   Prep             KOK        [slet]
  15:00-18:00  (3t før)           Madlavning       KOK        [slet]
  15:00-18:00  (3t før)           Madlavning       KOK        [slet]   <- 2 sæder = 2 rækker
  16:30-18:00  (1,5t før)         Børnetjans       JUNIOR     [slet]
  18:30-21:30  (0,5t efter)       Opvask           KOK        [slet]
  [ + Tilføj vagt ]                        [Indlæs standardvagter]
     +- form: fra [15:00] til [18:00]  opgave [        ]  rolle [KOK v]
```
- Season activation triggers `scaffoldDuties(seasonId)` — generator decides desired duties from team members × cooking days per their `affinity`; scaffolder reconciles via `pruneAndCreate` (idempotent per ADR-015) keyed on `(dinnerEventId, role, minutesFromDinnerStart, taskDescription, ordinal among identical duties)`.
- E2E: activate season, verify duties materialized respecting Anna's two-team multi-affinity case (Tuesday duty in team 7, Wednesday duty in team 6); reactivate, verify idempotent.

### Phase 4 — Single-dinner roster + derived sign-off (UX in § Roster UX)

- **Single-day scope**: one dinner's roster at a time, inside the CTC dinner face. No multi-day grid.
- Members self-serve their own rows (take / give up / swap); the chef adds a rare ad-hoc duty;
  slot times/tasks come from the templates and are edited there, not on the daily roster. All writes audited.
- Sign-off is derived: every duty filled → the system writes one `ROSTER_SIGNED_OFF` row (system actor); short →
  [Godkend alligevel] writes them with the chef as actor. No state column; "is this duty signed off?" is derived
  from history (latest `ROSTER_SIGNED_OFF` for this duty AFTER any subsequent `DUTY_ASSIGNED`/`DUTY_UNASSIGNED`/`DUTY_SWAPPED`/`DUTY_UPDATED`).
  Any change re-evaluates — a roster falls out of GODKENDT when a duty empties and re-signs when it fills.
- E2E: fill the last duty → the auto-sign row is written; empty a duty → sign-off invalidated; chef godkend-alligevel on
  a short roster → chef-actor rows; refill → auto re-sign.

### Phase 5 — Cross-team duty swap (the headline)

- `POST /api/team/cooking/duty/swap` — pair swap of two `DinnerDuty` rows. Two `DutyHistory` rows with same `swapGroupId`. Body:
  ```ts
  { aDutyId: number, bDutyId: number, agreementConfirmed: boolean }
  ```
- **Cross-team supported**: A and B may belong to different `CookingTeam`s and on different `DinnerEvent`s. The swap exchanges `inhabitantId` between the two duty rows; everything else (role, time slot, task, dinner) stays put on each row. Both teams' chefs see the swap in their roster timelines.
- **Authorization**: caller must own one of the two duties (or be admin). The other party's consent is via the `agreementConfirmed` flag — out-of-band negotiation, in-app one-sided commit, mirrors chef-swap pattern.
- Member-facing UI ✅ signed 2026-10-06: [byt/afgiv] on own rows in the CTC dinner face opens the inline panel
  (extends `RoleAssignment.vue` to all roles). Afgiv = release (duty goes vacant, `DUTY_UNASSIGNED`). Byt = pair swap
  against a searchable cross-team list of ALL members' upcoming duties; one-sided commit with the
  `agreementConfirmed` checkbox; the result line spells out both directions; plain commit (a swap reverses by
  swapping back).

```
Min tjans: Madlavning, tirsdag 15/04 (Hold 3)
  ( ) Afgiv tjansen
  (x) Byt med en anden
  Byt med:  [vælg tjans v]      <- alle medlemmers kommende tjanser, søgbar
     to 17/10  Opvask      Per (Hold 2)
     ti 22/10  Madlavning  Maria (Hold 3)
  [x] Vi har aftalt byttet
  Resultat: Du tager Pers Opvask to 17/10 — Per tager din Madlavning ti 15/04
  [Byt tjanser]   [Fortryd]
```
- Move-out cascade (carried from chef-swap Phase 4, unshipped): on a `moveOutDate` change,
  `server/utils/cleanupAssignmentsOnMoveOut.ts` deletes the inhabitant's future `CookingTeamAssignment` rows, fully
  resets future dinners where they are chef (`CHEF_LOSS_DINNER_UPDATES`), nulls `inhabitantId` on their future
  PLANNED duties and emits `DUTY_UNASSIGNED` per affected duty (`performedByUserId` = the admin who triggered the
  move-out); wired into `POST /api/household/[id]/update`. `CookingTeamCard.vue` shows a "Flytter {date}" badge for
  members with a future `moveOutDate`. Tests: `cleanupAssignmentsOnMoveOut.unit.spec.ts`, `moveout-cascade.e2e.spec.ts`.
- E2E: Anna (team 7, Mon prep) ↔ Peter (team 2, Thu prep); both teams' rosters reflect the swap; both timelines show the paired audit rows with shared `swapGroupId`.

## Reuse

| Existing | Used for |
|---|---|
| `OrderHistory` schema + `OrderHistoryDisplay.vue` | Template for `DutyHistory` schema and `AuditTimeline.vue` extraction |
| `useBookingValidation.createOrderAuditData / deserialize` | Pattern for `useDutyValidation.createDutyAuditData / deserialize` |
| `financesRepository.createOrders` (paired `createMany` pattern) | Pattern for paired `writeDutyHistory` in same pass as duty/assignment writes |
| `pruneAndCreate` from `~/utils/batchUtils` | Idempotent duty scaffolding (Phase 3) |
| `decideRoleAssignmentWrites` (chef-swap Phase 1) | Already-pure decision function for chef change; audit context flows alongside its `RoleAssignmentPlan` |
| `requireChefForDinner` (chef-swap Phase 1) | Authorize chef-only roster-edit endpoints in Phase 4 |
| `RoleAssignment.vue` (chef-swap Phase 2) | Extended in Phase 5 to all roles, not just CHEF |
| `createDateInTimezone(date, hour, minute, tz)` (`utils/date.ts:361`) | Building block for new `getDutyTimeRange` — preserves Copenhagen-timezone correctness on Cloudflare Workers |
| `getDinnerTimeRange(date, startHour, durationMinutes)` (`utils/season.ts:429`) | Sibling pattern; new `getDutyTimeRange(date, dinnerStartHour, minutesFromDinnerStart, durationMinutes)` follows the same composition shape |
| `getDefaultDinnerStartTime()` (`useSeason.ts:330`) | Source of `dinnerStartHour` arg to `getDutyTimeRange` — read at display time so duties auto-track if global config changes |
| `JobRun.triggeredBy` pattern | Inspiration for verb-only `DutyAuditAction` + `performedByUserId` actor separation (vs OrderHistory's USER_/SYSTEM_ inlined prefixes) |
