import {useTicketPriceValidation} from "~/composables/useTicketPriceValidation"
import {describe, expect, it} from "vitest"

describe('useTicketPriceValidation', () => {

    it('should validate an array of ticket prices', () => {
        const { TicketPricesArraySchema } = useTicketPriceValidation()
        const validPrices = [
            {
                seasonId: 1,
                ticketType: 'ADULT',
                price: 1000
            },
            {
                seasonId: 1,
                ticketType: 'CHILD',
                price: 500,
                maximumAgeLimit: 12
            }]
        const result = TicketPricesArraySchema.safeParse(validPrices)
        expect(result.success).toBe(true)
    })

    it('should validate a single ticket price', () => {
        const { TicketPriceSchema } = useTicketPriceValidation()
        const validPrice = {
            seasonId: 1,
            ticketType: 'ADULT',
            price: 1000,
            description: 'Adult ticket',
            maximumAgeLimit: null
        }
        const result = TicketPriceSchema.safeParse(validPrice)
        expect(result.success).toBe(true)
    })

    it('should reject empty array of ticket prices', () => {
        const { TicketPricesArraySchema } = useTicketPriceValidation()
        const result = TicketPricesArraySchema.safeParse([])
        expect(result.success).toBe(false)
    })

    it('should reject duplicate ticket types', () => {
        const { TicketPricesArraySchema } = useTicketPriceValidation()
        const duplicatePrices = [
            {
                seasonId: 1,
                ticketType: 'ADULT',
                price: 1000
            },
            {
                seasonId: 1,
                ticketType: 'ADULT',
                price: 1200
            }
        ]
        const result = TicketPricesArraySchema.safeParse(duplicatePrices)
        expect(result.success).toBe(false)
    })

    it('should reject ticket prices with different seasonIds', () => {
        const { TicketPricesArraySchema } = useTicketPriceValidation()
        const mixedSeasonPrices = [
            {
                seasonId: 1,
                ticketType: 'ADULT',
                price: 1000
            },
            {
                seasonId: 2,
                ticketType: 'CHILD',
                price: 500
            }
        ]
        const result = TicketPricesArraySchema.safeParse(mixedSeasonPrices)
        expect(result.success).toBe(false)
    })
})
