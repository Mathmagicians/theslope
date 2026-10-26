/**
 * The default ticket prices of a season — theslope's config (app.config `theslope.defaultSeason.ticketPrices`).
 *
 * A ticket weighs the portions of the default price with its type and price, else of its type's first default price.
 * Plain module (not app.config itself) so the test factories price tickets at the real defaults.
 */
// Relative path: app.config.ts imports this module, and the node project that typechecks it has no ~~ alias
import {TicketTypeSchema} from '../../prisma/generated/zod'

const TicketType = TicketTypeSchema.enum

export const DEFAULT_TICKET_PRICES = [
    {ticketType: TicketType.BABY, description: 'Spiser gratis smagsprøver fra forældrene', price: 0, maximumAgeLimit: 2, portions: 0},
    {ticketType: TicketType.BABY, description: 'Sulten baby - 1/4 kuvert', price: 900, maximumAgeLimit: 2, portions: 0.25},
    {ticketType: TicketType.CHILD, description: 'Barn', price: 1700, maximumAgeLimit: 12, portions: 0.5},
    {ticketType: TicketType.ADULT, description: 'Voksen', price: 4000, portions: 1}
]
