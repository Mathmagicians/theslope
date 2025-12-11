# Feature Proposal: Admin Job History & Manual Re-Run

**Status:** Draft | **Date:** 2025-12-11

## Summary

Provides admins with visibility into scheduled job execution history and the ability to manually re-trigger failed jobs. Jobs run automatically per cron schedule; this feature adds observability and recovery controls.

## Job Types

Following the scheduled task definitions from [feature-proposal-season-activation.md](./feature-proposal-season-activation.md):

| Job Type | Schedule | Description | Result Schema |
|----------|----------|-------------|---------------|
| `DAILY_MAINTENANCE` | 02:00 Copenhagen | Consume dinners, close orders, create transactions, scaffold pre-bookings | `DailyMaintenanceResultSchema` |
| `MONTHLY_BILLING` | 1st of month 04:00 | Generate invoices for previous month | N/A (future implementation) |
| `HEYNABO_IMPORT` | Manual + Optional cron | Sync households/inhabitants from Heynabo | `HeynaboImportResponseSchema` |

**Note:** All result schemas already exist in validation composables (ADR-001 compliant):
- `DailyMaintenanceResultSchema` in `useBookingValidation.ts`
- `HeynaboImportResponseSchema` in `useHeynaboValidation.ts`

---

## UX Design

### Location: Admin System Tab

The job history panel lives in the renamed "System" tab (previously "Indstillinger"):

```
/admin/system
├── Job History Panel (new)
├── Season Settings (existing)
└── Other system settings (existing)
```

### Admin Job History Panel

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🔄 SYSTEM JOBS                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DAGLIG VEDLIGEHOLDELSE                                        Kl. 02:00    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ✅ Seneste kørsel: I går 02:00                              [Kør nu]  │  │
│  │    Dinners consumed: 2, Orders closed: 45, Transactions: 45           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  MÅNEDLIG FAKTURERING                                          1. hver md   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ✅ Seneste kørsel: 1. dec 04:00                             [Kør nu]  │  │
│  │    Invoices generated: 35, Total amount: 47.500 kr                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  HEYNABO IMPORT                                                     Manuel  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ⚠️ Seneste kørsel: I går 14:30 - Delvis fejl                [Kør nu]  │  │
│  │    Households: +2, Inhabitants: +5, Users: +3                          │  │
│  │    ⚠️ 1 household kunne ikke opdateres (se detaljer)                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  📋 HISTORIK (seneste 10 kørsler)                             [Se alle →]   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Dato          Job                    Status    Varighed    Resultat    │  │
│  │ ─────────────────────────────────────────────────────────────────────  │  │
│  │ I dag 14:30   Heynabo Import         ⚠️        2.3s        +5 inhab    │  │
│  │ I dag 02:00   Daglig Vedligeholdelse ✅        1.8s        45 trans    │  │
│  │ I går 02:00   Daglig Vedligeholdelse ✅        1.5s        38 trans    │  │
│  │ 1. dec 04:00  Månedlig Fakturering   ✅        4.2s        35 fakturaer│  │
│  │ ...                                                                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Status Indicators

| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| Success | ✅ | `success` | Job completed without errors |
| Partial | ⚠️ | `warning` | Job completed with warnings (some items failed) |
| Failed | ❌ | `error` | Job failed entirely |
| Running | 🔄 | `info` | Job currently executing |

---

## Data Model

### Prisma Schema Addition

```prisma
enum JobType {
  DAILY_MAINTENANCE
  MONTHLY_BILLING
  HEYNABO_IMPORT
}

enum JobStatus {
  RUNNING
  SUCCESS
  PARTIAL
  FAILED
}

model JobRun {
  id            Int       @id @default(autoincrement())
  jobType       JobType
  status        JobStatus
  startedAt     DateTime  @default(now())
  completedAt   DateTime?
  durationMs    Int?
  resultSummary String?   // JSON - flexible per job type
  errorMessage  String?
  triggeredBy   String    @default("CRON") // "CRON" | "ADMIN:<userId>"

  @@index([jobType, startedAt])
}
```

### Result Summary Format

The `resultSummary` field stores JSON matching the existing result schemas:

```typescript
// DAILY_MAINTENANCE - matches DailyMaintenanceResultSchema
{
  "consume": { "consumed": 2 },
  "close": { "closed": 45 },
  "transact": { "created": 45 },
  "scaffold": { "seasonId": 1, "created": 120, "deleted": 5, "unchanged": 200, "households": 35 }
}

// HEYNABO_IMPORT - matches HeynaboImportResponseSchema
{
  "householdsCreated": 2,
  "householdsDeleted": 0,
  "householdsUnchanged": 33,
  "inhabitantsCreated": 5,
  "inhabitantsDeleted": 1,
  "usersCreated": 3
}

// MONTHLY_BILLING - future implementation
{
  "invoicesGenerated": 35,
  "totalAmount": 4750000  // øre
}
```

---

## Validation Composable

```typescript
// app/composables/useJobValidation.ts
import { z } from 'zod'
import { JobTypeSchema, JobStatusSchema } from '~~/prisma/generated/zod'

export const useJobValidation = () => {
    // Re-export enums (ADR-001)
    const JobType = JobTypeSchema.enum
    const JobStatus = JobStatusSchema.enum

    /**
     * JobRun Display - for index endpoint (GET /api/admin/job-run)
     */
    const JobRunDisplaySchema = z.object({
        id: z.number().int().positive(),
        jobType: JobTypeSchema,
        status: JobStatusSchema,
        startedAt: z.coerce.date(),
        completedAt: z.coerce.date().nullable(),
        durationMs: z.number().int().nullable(),
        resultSummary: z.string().nullable(),
        errorMessage: z.string().nullable(),
        triggeredBy: z.string()
    })

    /**
     * Trigger job request (POST /api/admin/job-run/trigger)
     */
    const TriggerJobRequestSchema = z.object({
        jobType: JobTypeSchema
    })

    return {
        JobTypeSchema,
        JobStatusSchema,
        JobType,
        JobStatus,
        JobRunDisplaySchema,
        TriggerJobRequestSchema
    }
}

export type JobRunDisplay = z.infer<ReturnType<typeof useJobValidation>['JobRunDisplaySchema']>
export type TriggerJobRequest = z.infer<ReturnType<typeof useJobValidation>['TriggerJobRequestSchema']>
```

---

## API Endpoints

### GET /api/admin/job-run

Fetch job run history with optional filtering.

```typescript
// Query params
?jobType=DAILY_MAINTENANCE  // Optional filter
?limit=10                   // Default 10, max 100

// Response: JobRunDisplay[]
```

### POST /api/admin/job-run/trigger

Manually trigger a job. Creates JobRun record and executes the job.

```typescript
// Request
{ "jobType": "HEYNABO_IMPORT" }

// Response: JobRunDisplay (the created run)
```

### GET /api/admin/job-run/[id]

Fetch single job run details.

---

## Task Integration

Modify existing scheduled tasks to record JobRun entries:

```typescript
// server/tasks/daily-maintenance.ts
export default defineTask({
  meta: {
    name: 'daily-maintenance',
    description: 'Consume dinners, close orders, create transactions, scaffold pre-bookings'
  },
  async run({ context }) {
    const db = context.cloudflare.env.DB

    // Create JobRun record with RUNNING status
    const jobRun = await createJobRun(db, {
      jobType: 'DAILY_MAINTENANCE',
      triggeredBy: 'CRON'
    })

    try {
      const startTime = Date.now()
      const result = await dailyMaintenance(db)

      // Update JobRun with success
      await updateJobRun(db, jobRun.id, {
        status: 'SUCCESS',
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        resultSummary: JSON.stringify(result)
      })

      console.info('Daily maintenance completed:', result)
      return { result }
    } catch (error) {
      // Update JobRun with failure
      await updateJobRun(db, jobRun.id, {
        status: 'FAILED',
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
})
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `JobType`, `JobStatus` enums and `JobRun` model |
| `app/composables/useJobValidation.ts` | Create | Validation schemas and types |
| `server/data/jobRepository.ts` | Create | CRUD for JobRun |
| `server/routes/api/admin/job-run/index.get.ts` | Create | List job runs |
| `server/routes/api/admin/job-run/[id].get.ts` | Create | Get single job run |
| `server/routes/api/admin/job-run/trigger.post.ts` | Create | Manual trigger endpoint |
| `server/tasks/daily-maintenance.ts` | Modify | Record JobRun |
| `server/tasks/monthly-billing.ts` | Modify | Record JobRun |
| `app/components/admin/JobHistoryPanel.vue` | Create | UI component |
| `app/pages/admin/system.vue` | Create/Modify | Host JobHistoryPanel |

---

## Implementation Order

1. **Schema & Migration**
   - Add JobType, JobStatus enums
   - Add JobRun model
   - Run migration

2. **Validation Composable**
   - Create `useJobValidation.ts`
   - Unit tests

3. **Repository & API**
   - Create `jobRepository.ts`
   - Create GET/POST endpoints
   - E2E tests

4. **Task Integration**
   - Modify existing tasks to record JobRun
   - Test with manual trigger

5. **UI Component**
   - Create JobHistoryPanel.vue
   - Add to admin/system page

---

## ADR Compliance

- **ADR-001:** Validation composable imports enums from generated layer, re-exports for app
- **ADR-002:** Separate try-catch for validation vs business logic in endpoints
- **ADR-004:** Logging with `console.info`/`warn`/`error`
- **ADR-007:** Store pattern if needed for client-side caching
- **ADR-009:** Single schema (Display) sufficient for this simple entity
- **ADR-010:** No complex serialization needed (JSON string for resultSummary)
