# Feature Proposal: Duty Roster (with Audit Trail + Cross-Team Swap)

**Status:** Draft
**Date:** 2026-04-29
**Builds on:** `feature-proposal-chef-swap.md` (in flight)

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

- New models: `DinnerDutyTemplate`, `DinnerDuty`, `DutyHistory`. New enums: `DutyState`, `DutyAuditAction`. **No new fields on `DinnerEvent`** — just a `dinnerDuties: DinnerDuty[]` back-relation declaration.
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
| **Audit** | `DutyHistory` (NEW) | Per-duty timeline of human actions: 6 verbs (ASSIGNED, UNASSIGNED, SWAPPED, UPDATED, SIGNED_OFF, MISSED) | new |

## Schema additions

```prisma
// Team-level template — "we always do these slots on a cooking day".
//
// Time encoding: relative to dinner start (chef mental model: "prep done 3h before dinner").
// `minutesFromDinnerStart` — signed integer. -180 = 3h before dinner, 0 = dinner start, +120 = 2h after.
// Composes with the global `defaultDinnerStartTime` (app.config.ts) at read time via getDutyTimeRange().
// Survives global config changes; auto-tracks if dinner-start ever becomes per-dinner.
// Sorts naturally in ascending chronological order (most-negative first → most-positive last).
model DinnerDutyTemplate {
  id                     Int         @id @default(autoincrement())
  cookingTeamId          Int
  cookingTeam            CookingTeam @relation(fields: [cookingTeamId], references: [id], onDelete: Cascade)
  role                   Role
  minutesFromDinnerStart Int         // signed; -180 = 3h before, +120 = 2h after dinner start. Doubles as natural sort key.
  durationMinutes        Int         // ≥1
  taskDescription        String      // e.g. "Madlavning", "Opvask", "Prep"
  createdAt              DateTime    @default(now())
  updatedAt              DateTime    @updatedAt

  duties                 DinnerDuty[]
  @@index([cookingTeamId])
}

// Concrete duty on a specific dinner. Links directly to DinnerEvent (no Roster aggregate).
//
// Time encoding: relative to dinner start (same convention as DinnerDutyTemplate).
// Time + task fields nullable — duty can exist with role+person locked but slot/task TBD.
// Display via getDutyTimeRange(dinner.date, getDefaultDinnerStartTime(), minutesFromDinnerStart, durationMinutes)
// — composes with existing createDateInTimezone (utils/date.ts:361) + addMinutes (date-fns).
model DinnerDuty {
  id                     Int           @id @default(autoincrement())
  dinnerEventId          Int
  dinnerEvent            DinnerEvent   @relation(fields: [dinnerEventId], references: [id], onDelete: Cascade)
  inhabitantId           Int?          // nullable — vacant duty (after release, before someone takes it)
  inhabitant             Inhabitant?   @relation(fields: [inhabitantId], references: [id], onDelete: SetNull)
  role                   Role
  state                  DutyState     @default(PLANNED)
  minutesFromDinnerStart Int?          // signed; nullable: slot TBD
  durationMinutes        Int?          // ≥1; nullable: slot TBD
  taskDescription        String?
  sourceTemplateId       Int?          // FK to DinnerDutyTemplate (null if ad-hoc / template deleted)
  sourceTemplate         DinnerDutyTemplate? @relation(fields: [sourceTemplateId], references: [id], onDelete: SetNull)
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  history                DutyHistory[]
  @@index([dinnerEventId])
  @@index([inhabitantId])
  @@index([state])
}

// Duty lifecycle — state cache. Every transition is audited (human or system).
//
// PLANNED   → default; in-flight (covers both "member committed" and "vacant slot awaiting fill")
// COMPLETED → post-event terminal. Cascade when DinnerEvent.state → CONSUMED, for rows with inhabitantId set.
//             Audited as COMPLETED (system, performedByUserId null).
// MISSED    → human-only flag (no-show). Audited as MISSED (user).
// CANCELLED → post-event terminal. Cascade when DinnerEvent.state → CANCELLED.
//             Audited as CANCELLED (system, performedByUserId null).
//
// Pre-sign-off "slot TBD" is captured by `minutesFromDinnerStart == null` (data condition, not state).
enum DutyState {
  PLANNED
  COMPLETED
  MISSED
  CANCELLED
}

// DinnerEvent — NO new columns. Just a back-relation declaration so we can do `dinner.dinnerDuties`.
model DinnerEvent {
  // ...all existing fields unchanged (date, menu, state, chefId, cookingTeamId, heynaboEventId, ...)
  dinnerDuties  DinnerDuty[]   // back-relation only
}

// Audit table — per-duty timeline. Mirrors OrderHistory shape: weak FK to the audited row
// + denormalized scope keys for queries after the parent is deleted.
// `performedByUserId` is nullable: null = SYSTEM cascade; set = USER action (chef, member, admin).
model DutyHistory {
  id                Int             @id @default(autoincrement())

  dinnerDutyId      Int?            // weak FK; SET NULL preserves history if duty deleted
  dinnerDuty        DinnerDuty?     @relation(fields: [dinnerDutyId], references: [id], onDelete: SetNull)

  action            DutyAuditAction
  performedByUserId Int?            // null = system; set = user
  performedByUser   User?           @relation(fields: [performedByUserId], references: [id], onDelete: SetNull)
  auditData         String          // JSON snapshot — see DutyAuditDataSchema
  timestamp         DateTime        @default(now())

  // Denormalized — survive parent deletion (mirrors OrderHistory pattern)
  inhabitantId      Int?
  dinnerEventId     Int?
  seasonId          Int?

  // Pair-swap correlation: two rows written together share swapGroupId
  swapGroupId       String?

  @@index([dinnerDutyId])
  @@index([inhabitantId])
  @@index([dinnerEventId])
  @@index([seasonId])
  @@index([timestamp])
  @@index([dinnerEventId, action])  // chef-view "events on dinner D"
  @@index([swapGroupId])
}

// 8 verbs. Actor in performedByUserId (null = system, set = user).
// Nuance ("was the slot vacant before vs taken from another user") lives in auditData.before,
// not in the action name.
enum DutyAuditAction {
  // Human actions (performedByUserId set)
  ASSIGNED        // someone assigned to a duty (volunteer / claim / takeover / chef-assign)
  UNASSIGNED      // someone unassigned (release / chef clear / move-out cascade)
  SWAPPED         // pair-swap (with swapGroupId)
  UPDATED         // chef edited time / task / role
  SIGNED_OFF      // chef confirmed this duty (chef hits "sign off roster" → N rows, one per duty)
  MISSED          // someone flagged this duty as no-show after the dinner

  // System cascades (performedByUserId null)
  COMPLETED       // DinnerEvent → CONSUMED → DutyState PLANNED → COMPLETED (filled duties only)
  CANCELLED       // DinnerEvent → CANCELLED → DutyState PLANNED → CANCELLED (every duty in the dinner)
}

// Actor invariant (Zod refine on DutyHistoryCreateSchema):
//   COMPLETED, CANCELLED → performedByUserId MUST be null (system-only cascades)
//   All other actions    → performedByUserId MUST be set (human actions)
```

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
| `DutyHistory → DinnerDuty` | SET NULL | Preserve history after duty delete (denorm `dinnerEventId / inhabitantId / seasonId` cover queries) |
| `DutyHistory → User` (`performedByUser`) | NoAction (or restrict deletion) | Audit row's actor is non-nullable; deleting the user is an admin operation that should detach via separate flow |
| `DinnerDuty → DinnerEvent` | CASCADE | Duties die with their dinner; history survives via denorm |
| `DinnerDuty → Inhabitant` | SET NULL | A duty can be vacant; inhabitant deletion shouldn't kill the duty |
| `DinnerDuty → DinnerDutyTemplate` | SET NULL | Template can be edited/deleted without orphaning concrete duties |
| `DinnerDutyTemplate → CookingTeam` | CASCADE | Templates die with their team |

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
4. **Cleaner audit** — `ASSIGNED` / `UNASSIGNED` mutate a row's `inhabitantId`, not "create a row that maps a vacant slot to a person."

Chef-edit lifecycle on a single dinner:

| Step | DinnerDuty rows for this dinner | DutyHistory rows |
|---|---|---|
| 1. Season activation scaffolds | Anna PLANNED slot=null, Per PLANNED slot=null | (none — initial state isn't a change) |
| 2. Chef pairs Anna→madlavning, Per→opvask, signs off | Anna PLANNED slot pinned (`sourceTemplateId` set), Per PLANNED slot pinned | UPDATED ×2 (chef pinned slots), SIGNED_OFF ×2 (chef confirmed each duty) |
| 3. Per gets sick, calls release | Anna PLANNED, **Per PLANNED with `inhabitantId=null`** | UNASSIGNED (Per released his slot) |
| 4. Nobody takes Per's slot, dinner happens with 1 cook | unchanged | (none) |
| 5. Dinner consumed | Anna → COMPLETED (cascade); Per's row stays PLANNED until human flags | COMPLETED (system, null) — for Anna's filled duty |
| 6. Bob retroactively flags Per's slot | Per → MISSED | MISSED (chef) |

## Mutation instrumentation map

This audit is **per-duty timeline only**. Out of scope: team-membership events, team-to-dinner-binding events.

| Endpoint / code path | Audit action — `performedByUserId` |
|---|---|
| `POST /api/team/cooking/[id]/assign-role` (chef-swap Phase 1, shipped) | `ASSIGNED` (caller) — covers volunteer / claim / takeover / chef-assign |
| `POST /api/team/cooking/[id]/remove-role` (chef-swap Phase 3, pending) | `UNASSIGNED` (caller) |
| `POST /api/team/cooking/assignment/swap` (chef-swap Phase 3, pending) | TWO `SWAPPED` rows sharing `swapGroupId` (caller) |
| `POST /api/team/cooking/duty/swap` (this proposal, Phase 5) | TWO `SWAPPED` rows sharing `swapGroupId` (caller) |
| Move-out cascade (chef-swap Phase 4 / extends here) | `UNASSIGNED` per affected duty (`performedByUserId` = the admin who triggered the move-out) |
| Chef sign-off (this proposal, Phase 4) | `SIGNED_OFF` × N duties (one per duty in the dinner; chef hits "sign off roster" → backend writes N rows) |
| Chef marks no-show (this proposal, Phase 4) | `MISSED` (chef or member) |
| Chef edits a duty (this proposal, Phase 4) | `UPDATED` (chef) |
| Daily maintenance / `consumeDinners` cascade | `COMPLETED` (system, null) — one per duty with `inhabitantId` set when DinnerEvent → CONSUMED |
| Dinner cancellation cascade | `CANCELLED` (system, null) — one per duty in the dinner when DinnerEvent → CANCELLED |

Pattern in code (mirrors `financesRepository.createOrders` paired-`createMany` pattern; D1 has no transactions):

```ts
// server/data/cookingRepository.ts (NEW — or extend prismaRepository.ts)
const writeDutyHistory = (d1Client: D1Database, entries: DutyHistoryCreate[]) =>
    entries.length ? prisma.dutyHistory.createMany({ data: entries.map(serializeDutyHistory) }) : Promise.resolve()

// In assign-role endpoint (after the duty mutation):
await Promise.all([
    saveDuty(...),
    writeDutyHistory(d1Client, [{
        action: DutyAuditAction.ASSIGNED,
        performedByUserId: caller.id,
        dinnerDutyId: duty.id,
        inhabitantId: caller.inhabitant.id,
        dinnerEventId: dinnerEvent.id,
        seasonId: dinnerEvent.seasonId,
        auditData: createDutyAuditData({ before: snapshotDutyBefore, after: snapshotDuty(duty) })
    }])
])

// Sign-off endpoint: chef hits "sign off roster" — backend writes one row per duty
await writeDutyHistory(d1Client,
    duties.map(duty => ({
        action: DutyAuditAction.SIGNED_OFF,
        performedByUserId: chef.id,
        dinnerDutyId: duty.id,
        inhabitantId: duty.inhabitantId,
        dinnerEventId: duty.dinnerEventId,
        seasonId: dinner.seasonId,
        auditData: createDutyAuditData({ snapshot: snapshotDuty(duty) })
    }))
)
```

## auditData JSON shape

```ts
DutyAuditDataSchema = z.object({
  before:   DutyEntitySnapshotSchema.optional(),  // null on create / sign-off
  after:    DutyEntitySnapshotSchema.optional(),  // null on delete
  snapshot: DutyEntitySnapshotSchema.optional(),  // single snapshot (used by SIGNED_OFF)
  partner:  z.object({ inhabitantId: IdSchema, dinnerEventId: IdSchema.optional() }).optional()  // swap correlation
})

DutyEntitySnapshotSchema = z.object({
  inhabitantId:           IdSchema.nullable(),
  inhabitantNameWithInitials: z.string().optional(),
  role:                   TeamRoleSchema,
  dinnerEventId:          IdSchema,
  dinnerDate:             z.coerce.date(),
  minutesFromDinnerStart: z.number().int().nullable().optional(),
  durationMinutes:        z.number().int().min(1).nullable().optional(),
  taskDescription:        z.string().nullable().optional()
})
```

## Read paths — UI

| Where | What it shows | Endpoint |
|---|---|---|
| **`DinnerCard` / `ChefMenuCard`** — expandable section per dinner | Timeline of all events for dinner D + relevant team-level events for D's `cookingTeamId` since season start. Mirror of `OrderHistoryDisplay.vue` UTimeline. | `GET /api/dinner-event/[id]/duty-history` (NEW) |
| **`CookingTeamCard`** — expandable per team member | Timeline of that member's assignment history. | `GET /api/team/cooking/[id]/member/[inhabitantId]/history` (NEW) |
| **`MyDuties` view** — per-inhabitant ("my upcoming + past duties") | List of `DinnerDuty` rows; expand each row to see its history. | Extends existing `GET /api/team/my` |

Reuse `OrderHistoryDisplay.vue`'s pattern — extract a generic `AuditTimeline.vue` (props: `entries: AuditEntryDisplay[]`, `actionConfig: Record<Action, {icon, color, labelDa}>`) so both order history and roster history render via the same component.

## Validation composables

```ts
// app/composables/useDutyValidation.ts (NEW)
export const useDutyValidation = () => {
  const DutyAuditActionSchema = z.nativeEnum(DutyAuditAction)
  const DutyStateSchema       = z.nativeEnum(DutyState)
  const DinnerDutyTemplateSchema = z.object({...})
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
      h => [DutyAuditAction.COMPLETED, DutyAuditAction.CANCELLED].includes(h.action)
        ? h.performedByUserId == null   // system cascades
        : h.performedByUserId != null,  // human actions
      'COMPLETED / CANCELLED MUST have null performedByUserId (system); all others MUST have it set (user)'
    )

  const createDutyAuditData    = (data: DutyAuditData): string => JSON.stringify(data)
  const deserializeDutyAuditData = (s: string): DutyAuditData =>
    DutyAuditDataSchema.parse(JSON.parse(s))

  return { /* schemas + transforms */ }
}
```

## ADR compliance

| ADR | Compliance |
|---|---|
| **ADR-001** Three-layer types | New schemas in `useDutyValidation`; `DutyState` and `DutyAuditAction` enums imported from `~~/prisma/generated/zod`; re-exported for app code |
| **ADR-002** Separate try-catch | New endpoints follow validation/business split |
| **ADR-005** Cascade strategy | SET NULL on history FKs, CASCADE on duty→event (matches OrderHistory pattern) |
| **ADR-009** Display vs Detail | `DutyHistoryDisplay` (lightweight) for index; `DutyHistoryDetail` (with teamAssignment + dinnerDuty) for `/[id]` |
| **ADR-010** Domain serialization | `auditData` is a JSON String column; serialize/deserialize in validation composable |
| **ADR-011** Audit-survives-deletion | SET NULL FKs + denormalized `inhabitantId / dinnerEventId / seasonId` |
| **ADR-014** Batch operations | Bulk audit writes via `createMany` (chunked); season import + activation use `createManyAndReturn` for duties |
| **ADR-015** Idempotent jobs | Season-activation duty scaffold uses `pruneAndCreate` keyed on `(dinnerEventId, sourceTemplateId, inhabitantId)`; re-run safe |
| **ADR-016** Generator/Scaffolder pattern | Duty scaffolder mirrors prebooking pattern: pure `decideDutyAction` → scaffolder applies; lives in `useDuty.ts` + `server/utils/scaffoldDuties.ts` |

## Phases

This feature ships **on top of** the chef-swap PR (in flight). Chef-swap delivers role swap *for the CHEF role only*, intra-team. This proposal delivers everything else.

### Phase 0 — This proposal ✍️

The current document. Reviewable artifact before code.

### Phase 1 — Schema + audit infrastructure (no behavior change)

- Prisma migration: `DinnerDutyTemplate`, `DinnerDuty`, `DutyState` enum, `DutyHistory`, `DutyAuditAction` enum. `DinnerEvent` gets the `dinnerDuties` back-relation declaration only — no new columns.
- `useDutyValidation` composable + unit tests.
- `getDutyTimeRange` added to `app/utils/season.ts` next to `getDinnerTimeRange` + unit tests.
- Repository functions in `cookingRepository.ts` (or extend `prismaRepository.ts`): `writeDutyHistory(entries[])`, `fetchDutyHistoryForDinner(dinnerEventId)`, `fetchDutyHistoryForMember(cookingTeamId, inhabitantId)`.
- Instrument existing mutation sites: `assign-role`, `admin/team/assignment` PUT/DELETE/POST, `admin/dinner-event/[id]`, `admin/season/[id]/assign-cooking-teams`, `admin/season/import`. Each site adds a paired audit write in the same pass.
- Instrument chef-swap endpoints **as they land** (`remove-role`, `assignment/swap`, move-out cascade) — coordinated with the chef-swap PR; if chef-swap merges first, instrument retroactively in this PR.
- E2E tests: each mutation site asserts the corresponding `DutyHistory` row is created with the right action and actor.

### Phase 2 — Read endpoints + generic `AuditTimeline.vue`

- `GET /api/dinner-event/[id]/duty-history` and `GET /api/team/cooking/[id]/member/[inhabitantId]/history`.
- Extract `AuditTimeline.vue` (generic) from `OrderHistoryDisplay.vue`. Both order and roster timelines render via it.
- Wire into `ChefMenuCard.vue` and `CookingTeamCard.vue` as expandable section. Per-row expand pattern matches the existing order-history "expand to see history" UX.
- Tests: component unit + E2E.

### Phase 3 — DinnerDutyTemplate CRUD + duty scaffolding

- Admin team UI: edit `DinnerDutyTemplate` rows for a team (CRUD). Form fields: role, `minutesFromDinnerStart` (rendered as "X min/h before/after dinner"), `durationMinutes`, `taskDescription`.
- Season activation triggers `scaffoldDuties(seasonId)` — generator decides desired duties from team members × cooking days per their `affinity`; scaffolder reconciles via `pruneAndCreate` (idempotent per ADR-015) keyed on `(dinnerEventId, sourceTemplateId, inhabitantId)`.
- E2E: activate season, verify duties materialized respecting Anna's two-team multi-affinity case (Tuesday duty in team 7, Wednesday duty in team 6); reactivate, verify idempotent.

### Phase 4 — Single-dinner roster editing + chef sign-off

- **Single-day scope**: chef edits the roster of *one* dinner at a time. No multi-day grid.
- Chef view per dinner: roster table (members × time slots derived via `getDutyTimeRange`); chef can reassign duties between team members, edit time/task, remove vacant slots, add ad-hoc slots, mark no-shows. All writes audited.
- Sign-off action: chef hits "sign off roster" → backend writes one `SIGNED_OFF` audit row per duty in the dinner. No state column on duty for sign-off; "is this duty signed off?" is derived from history (latest `SIGNED_OFF` for this duty AFTER any subsequent `ASSIGNED`/`UNASSIGNED`/`SWAPPED`/`UPDATED` on the same duty).
- E2E: chef edits roster, signs off (N rows written), edits a single duty post-sign-off (only that duty's sign-off invalidated; others stay confirmed), re-signs that one duty.

### Phase 5 — Cross-team duty swap (the headline)

- `POST /api/team/cooking/duty/swap` — pair swap of two `DinnerDuty` rows. Two `DutyHistory` rows with same `swapGroupId`. Body:
  ```ts
  { aDutyId: number, bDutyId: number, agreementConfirmed: boolean }
  ```
- **Cross-team supported**: A and B may belong to different `CookingTeam`s and on different `DinnerEvent`s. The swap exchanges `inhabitantId` between the two duty rows; everything else (role, time slot, task, dinner) stays put on each row. Both teams' chefs see the swap in their roster timelines.
- **Authorization**: caller must own one of the two duties (or be admin). The other party's consent is via the `agreementConfirmed` flag — out-of-band negotiation, in-app one-sided commit, mirrors chef-swap pattern.
- Member-facing UI: "Byt tjans" panel on any duty row (extends generic `RoleAssignment.vue` from chef-swap to all roles). Selector lists candidate duties from `usersStore.myDuties` (existing data).
- Move-out cascade nulls `inhabitantId` on future PLANNED duties for the moving inhabitant; emits `UNASSIGNED` per affected duty (`performedByUserId` = the admin who triggered the move-out).
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