// Import TicketType enum from generated Zod schemas (ADR-001 compliance)
// Note: app.config.ts is a build-time file, so we import directly from generated schemas
import { TicketTypeSchema } from '~~/prisma/generated/zod'

const TicketType = TicketTypeSchema.enum

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
            ticketPrices: [
                { ticketType: TicketType.BABY, description: 'Spiser gratis smagsprøver fra forældrene', price: 0, maximumAgeLimit: 2 },
                { ticketType: TicketType.BABY, description: 'Sulten baby - 1/4 kuvert', price: 900, maximumAgeLimit: 2 },
                { ticketType: TicketType.CHILD, description: 'Barn', price: 1700, maximumAgeLimit: 12 },
                { ticketType: TicketType.ADULT, description: 'Voksen', price: 4000 }],
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
            heynaboImport: { cron: '0 2 * * *', description: 'Dagligt kl. 02:00' },
            dailyMaintenance: { cron: '0 3 * * *', description: 'Dagligt kl. 03:00' },
            monthlyBilling: { cron: '0 4 17 * *', description: 'D. 17. hver måned kl. 04:00' }
        },
        prebookingWindowDays: 60  // Rolling window: scaffold pre-bookings for dinners within next N days
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
