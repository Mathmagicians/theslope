import {useTicketPriceValidation} from "~/composables/useTicketPriceValidation"
import {describe, expect, it} from "vitest"
import {TicketFactory} from "../../e2e/testDataFactories/ticketFactory"

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

    it('should allow multiple prices for the same ticket type (price tiers)', () => {
        const { TicketPricesArraySchema } = useTicketPriceValidation()
        // Use factory data which includes two BABY prices (free baby and hungry baby)
        const priceTiers = TicketFactory.defaultTicketPrices({seasonId: 1})
        const result = TicketPricesArraySchema.safeParse(priceTiers)
        expect(result.success).toBe(true)

        // Verify we actually have multiple BABY prices
        const babyPrices = priceTiers.filter(p => p.ticketType === 'BABY')
        expect(babyPrices.length).toBe(2)
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
