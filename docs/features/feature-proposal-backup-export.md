# Feature Proposal: Automated Backup & CSV Export

**Status:** Proposed
**Date:** 2026-01-20
**Author:** Claude + User

## Overview

Automated weekly backups storing SQL dumps and CSV exports to R2 cloud storage. Exports are designed to be re-importable by existing importers where possible.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       R2: theslope-backups-prod                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  2026/                                                           │
│  └── 01/                                                         │
│      └── 19/                     ← Weekly backup (Sunday 4AM)    │
│          ├── theslope-prod.sql   ← Full DB restore               │
│          │                                                       │
│          │  # Re-importable (match existing importers)           │
│          ├── calendar.csv                                        │
│          ├── teams.csv                                           │
│          ├── orders.csv                                          │
│          │                                                       │
│          │  # Master data (need new importers)                   │
│          ├── households.csv                                      │
│          ├── inhabitants.csv                                     │
│          ├── allergy-types.csv                                   │
│          ├── allergies.csv                                       │
│          │                                                       │
│          │  # Accounting/Audit archive                           │
│          ├── pbs-billing.csv     ← Accounting export             │
│          ├── billing-summaries.csv  ← Includes shareTokens!      │
│          ├── invoices.csv                                        │
│          └── transactions.csv                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## R2 Bucket Strategy

Matches existing D1 database pattern (local → dev → prod):

| Environment | D1 Database | R2 Bucket |
|-------------|-------------|-----------|
| **Local** | `theslope` (emulation) | `theslope-backups` (emulation) |
| **Dev** | `theslope` (remote) | `theslope-backups` (remote) |
| **Prod** | `theslope-prod` (remote) | `theslope-backups-prod` (remote) |

## Cron Schedule

| Cron | Time (UTC) | Task | Status |
|------|------------|------|--------|
| `0 1 * * *` | Daily 1AM | heynabo-import | Existing |
| `0 2 * * *` | Daily 2AM | daily-maintenance | Existing |
| `0 3 18 * *` | 18th 3AM | monthly-billing | Existing |
| `0 4 * * 0` | Sunday 4AM | **backup-weekly** | **NEW** |

## Import/Export Gap Analysis

| Data | Import | Export | Roundtrip |
|------|:------:|:------:|:---------:|
| Calendar (dates/teams) | ✅ `parseCalendarCSV` | ❌ | Need export |
| Teams (members) | ✅ `parseTeamsCSV` | ❌ | Need export |
| Orders (framelding) | ✅ `parseCSV` | ❌ | Need export |
| PBS Billing | ❌ | ✅ `generateBillingCsv` | Archive only |
| Households | ❌ | ❌ | Need both |
| Inhabitants | ❌ | ❌ | Need both |
| AllergyTypes | ❌ | ❌ | Need both |
| Allergies | ❌ | ❌ | Need both |
| Invoices | ❌ | ❌ | Need both |
| Billing Summaries | ❌ | ❌ | Need both |
| Transactions | ❌ | ❌ | Need both |

## CSV Formats

### Existing Import Formats (exports must match)

**calendar.csv** (DD-MM-YYYY):
```csv
date,weekday,team
06-01-2026,mandag,1
07-01-2026,tirsdag,2
13-01-2026,mandag,Vinterferie
```

**teams.csv**:
```csv
team,role,name,affinity
Hold 1,CHEF,Anders Andersen,man
Hold 1,COOK,Bodil Bodilsen,man
Hold 2,CHEF,Carl Carlsen,tirs
```

**orders.csv** (framelding format - pivoted):
```csv
,Total,06/01/2026,07/01/2026,...
"Skråningen 1A",,,,
Voksne,4,2,2,...
Børn (under 13),2,1,1,...
```

### New Export Formats

**households.csv**:
```csv
id,heynaboId,pbsId,name,address,movedInDate,moveOutDate
1,123,456,Familien Hansen,Skråningen 1A,2020-01-15,
```

**inhabitants.csv**:
```csv
id,householdId,name,lastName,birthDate,userId,dinnerPreferences
1,1,Anders,Andersen,1985-03-15,42,{"mandag":"DINEIN","tirsdag":"NONE",...}
```

**allergy-types.csv**:
```csv
id,name,description,icon
1,Gluten,Wheat and gluten products,mdi:bread-slice
2,Laktose,Dairy products,mdi:cheese
```

**allergies.csv**:
```csv
inhabitantId,allergyTypeId,inhabitantComment
42,1,Can tolerate small amounts
42,3,Severe - carries epipen
```

**billing-summaries.csv** (includes magic links):
```csv
id,billingPeriod,shareToken,totalAmount,householdCount
1,01/12/2025-17/12/2025,uuid-magic-link,1234500,42
```

**invoices.csv**:
```csv
id,householdId,billingPeriod,pbsId,address,totalAmount,cutoffDate,paymentDate
1,1,01/12/2025-17/12/2025,456,Skråningen 1A,29500,2025-12-17,2025-12-28
```

**transactions.csv**:
```csv
id,orderId,invoiceId,amount,dinnerDate,ticketType,dinnerMode
1,123,1,5500,2025-12-02,ADULT,DINEIN
```

## Implementation

### Wrangler Commands (User runs these)

```bash
# Create R2 buckets
npx wrangler r2 bucket create theslope-backups
npx wrangler r2 bucket create theslope-backups-prod

# Verify
npx wrangler r2 bucket list
```

### wrangler.toml Additions

```toml
# Top-level (local) - after [[d1_databases]]
[[r2_buckets]]
binding = "BACKUP_BUCKET"
bucket_name = "theslope-backups"

# [env.dev] - after [[env.dev.d1_databases]]
[[env.dev.r2_buckets]]
binding = "BACKUP_BUCKET"
bucket_name = "theslope-backups"

# [env.prod] - after [[env.prod.d1_databases]]
[[env.prod.r2_buckets]]
binding = "BACKUP_BUCKET"
bucket_name = "theslope-backups-prod"
```

### Cron Trigger Addition

```toml
# Dev
[env.dev.triggers]
crons = ["0 1 * * *", "0 2 * * *", "0 3 18 * *", "0 4 * * 0"]

# Prod
[env.prod.triggers]
crons = ["0 1 * * *", "0 2 * * *", "0 3 18 * *", "0 4 * * 0"]
```

### nuxt.config.ts Addition

```typescript
scheduledTasks: {
    '0 1 * * *': ['heynabo-import'],
    '0 2 * * *': ['daily-maintenance'],
    '0 3 18 * *': ['monthly-billing'],
    '0 4 * * 0': ['backup-weekly']  // NEW
}
```

### New Files

```
server/
├── tasks/
│   └── backup-weekly.ts           ← Scheduled task
└── utils/
    ├── csvExport.ts               ← Export generators
    └── backupService.ts           ← R2 upload logic

app/composables/
└── useBackupValidation.ts         ← Schemas for backup metadata
```

## Implementation Phases

| Phase | Scope | Files |
|-------|-------|-------|
| **1** | R2 setup + wrangler config | `wrangler.toml` |
| **2** | Export generators (match existing importers) | `csvExport.ts` |
| **3** | Master data export/import (households, inhabitants, allergies) | `csvExport.ts`, new importers |
| **4** | Archive exports (billing, invoices, transactions) | `csvExport.ts` |
| **5** | Backup task + R2 integration | `backupService.ts`, `backup-weekly.ts` |
| **6** | Admin download endpoints (nice-to-have) | API routes |

## Time Travel (Built-in)

Cloudflare D1 provides automatic point-in-time recovery:

- **Retention**: 30 days (paid plan) / 7 days (free)
- **No config needed**: Always on
- **Restore command**: `npx wrangler d1 time-travel restore theslope-prod --env prod --timestamp=UNIX_TIMESTAMP`

Weekly R2 backups complement Time Travel for:
- Long-term archival (beyond 30 days)
- CSV exports for accounting
- Disaster recovery testing
- Data portability

## Security Considerations

- R2 buckets are private by default
- No public access to backups
- Admin-only download endpoints (future)
- `billing-summaries.csv` contains magic link tokens - treat as sensitive

## References

- [Time Travel · Cloudflare D1 docs](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Import and export data · Cloudflare D1 docs](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [Export D1 to R2 · Cloudflare Workflows docs](https://developers.cloudflare.com/workflows/examples/backup-d1/)
