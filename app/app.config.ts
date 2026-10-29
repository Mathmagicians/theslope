import { NOTIFICATION_SIGNATURE, NOTIFICATION_TEMPLATES } from './config/notificationTemplates'
import { SEASON_CONFIG } from './config/season'

export default defineAppConfig({
    theslope: {
        ...SEASON_CONFIG,
        holidayUrl: 'https://www.lejre.dk/borger/daginstitution-og-skole/skole/ferieplan-og-lukkedage',
        kitchen: {
            baseRatePercent: 5,  // Kitchen contribution: 5% of ticket revenue goes to common kitchen fund
            vatPercent: 25       // VAT rate: Used to calculate ex-VAT budget for grocery shopping
        },
        systemJobs: {
            heynaboImport: { cron: '0 1 * * *', description: 'Dagligt kl. 02:00' },
            dailyMaintenance: { cron: '0 2 * * *', description: 'Dagligt kl. 03:00' },
            monthlyBilling: { cron: '0 3 18 * *', description: 'D. 18. hver måned kl. 04:00 (dagen efter cutoff)' }
        },
        waitlistPlacingLeaseMinutes: 10,  // A run holds a queue entry it grabbed this long; an older grab is recovered
        waitlistBuildupThreshold: 3,  // Queue size at which the dinner's chef is asked to release portions
        notifications: {
            signature: NOTIFICATION_SIGNATURE,
            templates: NOTIFICATION_TEMPLATES  // per kind, {{placeholders}} filled by server/utils/sender/compose.ts
        }
    },
    ui: {
        colors: {
            primary: 'amber',
            neutral: 'sky',
            secondary: "pink",
            info: "violet",
            success: "green",
            warning: "orange",
            error: "red",
            // Pantone team colors (defined in main.css)
            winery: "winery",
            party: "party",
            peach: "peach",
            caramel: "caramel",
            ocean: 'blue',
            // Deadline warning chips (defined in main.css)
            yellow: 'yellow'
        }
    }
})
