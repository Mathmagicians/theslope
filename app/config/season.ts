/**
 * The defaults of a season and its dinners — theslope's config (app.config `theslope.defaultSeason`, the dinner's start
 * and length, the pre-booking window, the cooking deadline thresholds, the billing cutoff).
 *
 * A ticket weighs the portions of the default price with its type and price, else of its type's first default price.
 * Plain module (not app.config itself) so useSeason and useTicket, which the server imports, and the test factories and
 * helpers read the real defaults.
 */
// Relative path: app.config.ts imports this module, and the node project that typechecks it has no ~~ alias
import {TicketTypeSchema} from '../../prisma/generated/zod'

const TicketType = TicketTypeSchema.enum

const DEFAULT_TICKET_PRICES = [
    {ticketType: TicketType.BABY, description: 'Spiser gratis smagsprøver fra forældrene', price: 0, maximumAgeLimit: 2, portions: 0},
    {ticketType: TicketType.BABY, description: 'Sulten baby - 1/4 kuvert', price: 900, maximumAgeLimit: 2, portions: 0.25},
    {ticketType: TicketType.CHILD, description: 'Barn', price: 1700, maximumAgeLimit: 12, portions: 0.5},
    {ticketType: TicketType.ADULT, description: 'Voksen', price: 4000, portions: 1}
]

export const SEASON_CONFIG = {
    defaultSeason: {
        startWeek: 33,
        endWeek: 26,
        holidays: [8, 42, 52],
        cookingDays: ['mandag', 'tirsdag', 'onsdag', 'torsdag'],
        menuIsAnnouncedDaysBefore: 10,
        ticketIsCancellableDaysBefore: 8,
        diningModeIsEditableMinutesBefore: 90,
        ticketPrices: DEFAULT_TICKET_PRICES,
        consecutiveCookingDays: 2
    },
    defaultDinnerStartTime: 18,
    defaultDinnerDurationMinutes: 60,
    prebookingWindowDays: 60,  // Rolling window: scaffold pre-bookings for dinners within next N days
    cookingDeadlines: {
        criticalHours: 24,  // Critical urgency: < 24h before dinner event (red)
        warningHours: 72    // Warning urgency: 24-72h before dinner event (yellow)
    },
    billing: {
        cutoffDay: 17  // Day of month (1-31) when billing period closes for order imports
    }
}
