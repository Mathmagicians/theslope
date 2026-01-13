import {useTicketPriceValidation} from "~/composables/useTicketPriceValidation"
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
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

    describe('CreateTicketPriceSchema', () => {
        it.each([
            {
                description: 'with id and seasonId',
                input: { id: 1, seasonId: 100, ticketType: 'ADULT', price: 4000, description: 'Adult ticket' },
                expectedFields: { ticketType: 'ADULT', price: 4000, description: 'Adult ticket' },
                shouldStripIds: true
            },
            {
                description: 'without id and seasonId',
                input: { ticketType: 'CHILD', price: 2000, description: 'Child ticket', maximumAgeLimit: 12 },
                expectedFields: { ticketType: 'CHILD', price: 2000, description: 'Child ticket', maximumAgeLimit: 12 },
                shouldStripIds: false
            },
            {
                description: 'with only id',
                input: { id: 5, ticketType: 'BABY', price: 0, maximumAgeLimit: 1 },
                expectedFields: { ticketType: 'BABY', price: 0, maximumAgeLimit: 1 },
                shouldStripIds: true
            }
        ])('should handle input $description', ({ input, expectedFields, shouldStripIds }) => {
            const { CreateTicketPriceSchema } = useTicketPriceValidation()

            const result = CreateTicketPriceSchema.safeParse(input)
            expect(result.success).toBe(true)

            if (shouldStripIds) {
                expect(result.data).not.toHaveProperty('id')
                expect(result.data).not.toHaveProperty('seasonId')
            }
            expect(result.data).toMatchObject(expectedFields)
        })

        it('should strip id and seasonId from array of ticket prices', () => {
            const { CreateTicketPricesArraySchema } = useTicketPriceValidation()
            const inputWithIds = [
                { id: 1, seasonId: 100, ticketType: 'ADULT', price: 4000 },
                { id: 2, seasonId: 100, ticketType: 'CHILD', price: 2000, maximumAgeLimit: 12 },
                { id: 3, seasonId: 100, ticketType: 'BABY', price: 0, description: 'Free baby', maximumAgeLimit: 1 }
            ]

            const result = CreateTicketPricesArraySchema.safeParse(inputWithIds)
            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(3)

            result.data!.forEach(price => {
                expect(price).not.toHaveProperty('id')
                expect(price).not.toHaveProperty('seasonId')
                expect(price).toHaveProperty('ticketType')
                expect(price).toHaveProperty('price')
            })
        })
    })

    describe('reconcileTicketPrices', () => {
        const { reconcileTicketPrices } = useTicketPriceValidation()

        // Factory data with IDs for existing prices
        const existing = TicketFactory.defaultTicketPrices({ seasonId: 1 })
        // Factory data without IDs for new prices
        const newPrices = TicketFactory.defaultTicketPricesWithoutIds({ seasonId: 1 })

        // Reconciles on functional content (ticketType:price:description:maximumAgeLimit)
        // No update bucket - changing content = create new + delete old
        it.each([
            {
                scenario: 'new ticket price with different content → create',
                incoming: [...existing, { ...newPrices[0], description: 'New price' }],
                expected: { create: 1, update: 0, idempotent: 4, delete: 0 }
            },
            {
                scenario: 'unchanged prices → idempotent',
                incoming: existing,
                expected: { create: 0, update: 0, idempotent: 4, delete: 0 }
            },
            {
                scenario: 'same content without IDs (import scenario) → idempotent',
                incoming: newPrices,
                expected: { create: 0, update: 0, idempotent: 4, delete: 0 }
            },
            {
                scenario: 'changed price → create + delete (content key changed)',
                incoming: existing.map((p, i) => i === 0 ? { ...p, price: 9999 } : p),
                expected: { create: 1, update: 0, idempotent: 3, delete: 1 }
            },
            {
                scenario: 'removed price → delete',
                incoming: existing.slice(0, 3),
                expected: { create: 0, update: 0, idempotent: 3, delete: 1 }
            },
            {
                scenario: 'mixed: create + delete (no updates with content-based keys)',
                incoming: [
                    existing[0]!,                                   // idempotent (same content)
                    { ...existing[1]!, price: 2000 },               // create (new content) + delete (old not seen)
                    { ...newPrices[0]!, description: 'Brand new' }  // create (new content)
                    // existing[2] and existing[3] removed → delete
                ],
                expected: { create: 2, update: 0, idempotent: 1, delete: 3 }
            }
        ])('$scenario', ({ incoming, expected }) => {
            const result = reconcileTicketPrices(existing)(incoming as TicketPrice[])

            expect(result.create).toHaveLength(expected.create)
            expect(result.update).toHaveLength(expected.update)
            expect(result.idempotent).toHaveLength(expected.idempotent)
            expect(result.delete).toHaveLength(expected.delete)
        })
    })
})
