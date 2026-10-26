import { NOTIFICATION_SIGNATURE, NOTIFICATION_TEMPLATES } from './config/notificationTemplates'
import { DEFAULT_TICKET_PRICES } from './config/ticketPrices'

export default defineAppConfig({
    theslope: {
        defaultSeason: {
            startWeek: 33,
            endWeek: 26,
            holidays: [8, 42, 52],
            cookingDays: ['mandag', 'tirsdag', 'onsdag', 'torsdag'] ,
            menuIsAnnouncedDaysBefore: 10,
            ticketIsCancellableDaysBefore: 8,
            diningModeIsEditableMinutesBefore: 90,
            ticketPrices: DEFAULT_TICKET_PRICES,
            consecutiveCookingDays: 2
        },
        defaultDinnerStartTime: 18,
        defaultDinnerDurationMinutes: 60,
        holidayUrl: 'https://www.lejre.dk/borger/daginstitution-og-skole/skole/ferieplan-og-lukkedage',
        cookingDeadlines: {
            criticalHours: 24,  // Critical urgency: < 24h before dinner event (red)
            warningHours: 72    // Warning urgency: 24-72h before dinner event (yellow)
        },
        kitchen: {
            baseRatePercent: 5,  // Kitchen contribution: 5% of ticket revenue goes to common kitchen fund
            vatPercent: 25       // VAT rate: Used to calculate ex-VAT budget for grocery shopping
        },
        billing: {
            cutoffDay: 17  // Day of month (1-31) when billing period closes for order imports
        },
        systemJobs: {
            heynaboImport: { cron: '0 1 * * *', description: 'Dagligt kl. 02:00' },
            dailyMaintenance: { cron: '0 2 * * *', description: 'Dagligt kl. 03:00' },
            monthlyBilling: { cron: '0 3 18 * *', description: 'D. 18. hver måned kl. 04:00 (dagen efter cutoff)' }
        },
        prebookingWindowDays: 60,  // Rolling window: scaffold pre-bookings for dinners within next N days
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
