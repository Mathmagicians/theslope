import {useTicketPriceValidation} from "~/composables/useTicketPriceValidation"
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
import {describe, expect, it} from "vitest"
import {TicketFactory} from "../../e2e/testDataFactories/ticketFactory"

describe('useTicketPriceValidation', () => {
    const {TicketTypeSchema} = useTicketPriceValidation()
    const TicketType = TicketTypeSchema.enum

    it('should validate an array of ticket prices', () => {
        const { TicketPricesArraySchema } = useTicketPriceValidation()
        const validPrices = [
            {
                seasonId: 1,
                ticketType: TicketType.ADULT,
                price: 1000,
                portions: 1
            },
            {
                seasonId: 1,
                ticketType: TicketType.CHILD,
                price: 500,
                maximumAgeLimit: 12,
                portions: 0.5
            }]
        const result = TicketPricesArraySchema.safeParse(validPrices)
        expect(result.success).toBe(true)
    })

    it('should validate a single ticket price', () => {
        const { TicketPriceSchema } = useTicketPriceValidation()
        const validPrice = {
            seasonId: 1,
            ticketType: TicketType.ADULT,
            price: 1000,
            description: 'Adult ticket',
            maximumAgeLimit: null,
            portions: 1
        }
        const result = TicketPriceSchema.safeParse(validPrice)
        expect(result.success).toBe(true)
    })

    it('should reject a ticket price without the portions its tickets weigh', () => {
        const {TicketPriceSchema} = useTicketPriceValidation()
        expect(TicketPriceSchema.safeParse({seasonId: 1, ticketType: TicketType.ADULT, price: 1000}).success).toBe(false)
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
        const babyPrices = priceTiers.filter(p => p.ticketType === TicketType.BABY)
        expect(babyPrices.length).toBe(2)
    })

    it('should reject ticket prices with different seasonIds', () => {
        const { TicketPricesArraySchema } = useTicketPriceValidation()
        const mixedSeasonPrices = [
            {
                seasonId: 1,
                ticketType: TicketType.ADULT,
                price: 1000,
                portions: 1
            },
            {
                seasonId: 2,
                ticketType: TicketType.CHILD,
                price: 500,
                portions: 0.5
            }
        ]
        const result = TicketPricesArraySchema.safeParse(mixedSeasonPrices)
        expect(result.success).toBe(false)
    })

    describe('CreateTicketPriceSchema', () => {
        it.each([
            {
                description: 'with id and seasonId',
                input: { id: 1, seasonId: 100, ticketType: TicketType.ADULT, price: 4000, description: 'Adult ticket', portions: 1 },
                expectedFields: { ticketType: TicketType.ADULT, price: 4000, description: 'Adult ticket' },
                shouldStripIds: true
            },
            {
                description: 'without id and seasonId',
                input: { ticketType: TicketType.CHILD, price: 2000, description: 'Child ticket', maximumAgeLimit: 12 },
                expectedFields: { ticketType: TicketType.CHILD, price: 2000, description: 'Child ticket', maximumAgeLimit: 12 },
                shouldStripIds: false
            },
            {
                description: 'with only id',
                input: { id: 5, ticketType: TicketType.BABY, price: 0, maximumAgeLimit: 1 },
                expectedFields: { ticketType: TicketType.BABY, price: 0, maximumAgeLimit: 1 },
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
            // The price row has no column for the portions; the server fills them on read
            expect(result.data).not.toHaveProperty('portions')
            expect(result.data).toMatchObject(expectedFields)
        })

        it('should strip id and seasonId from array of ticket prices', () => {
            const { CreateTicketPricesArraySchema } = useTicketPriceValidation()
            const inputWithIds = [
                { id: 1, seasonId: 100, ticketType: TicketType.ADULT, price: 4000 },
                { id: 2, seasonId: 100, ticketType: TicketType.CHILD, price: 2000, maximumAgeLimit: 12 },
                { id: 3, seasonId: 100, ticketType: TicketType.BABY, price: 0, description: 'Free baby', maximumAgeLimit: 1 }
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

        // Business logic (ADR):
        // - Identity = (ticketType, price) - same type+price = same entity
        // - Description/maximumAgeLimit change → UPDATE
        // - Price change → CREATE new (preserves order references to old price)
        // - NEVER DELETE (orders reference ticketPriceId, SET NULL on delete orphans them)
        it.each([
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
                scenario: 'description change (same type+price) → update',
                incoming: existing.map((p, i) => i === 0 ? { ...p, description: 'Updated description' } : p),
                expected: { create: 0, update: 1, idempotent: 3, delete: 0 }
            },
            {
                scenario: 'maximumAgeLimit change (same type+price) → update',
                incoming: existing.map((p, i) => i === 1 ? { ...p, maximumAgeLimit: 99 } : p),
                expected: { create: 0, update: 1, idempotent: 3, delete: 0 }
            },
            {
                scenario: 'price change → create new (never delete old)',
                incoming: existing.map((p, i) => i === 0 ? { ...p, price: 9999 } : p),
                expected: { create: 1, update: 0, idempotent: 3, delete: 0 }
            },
            {
                scenario: 'new ticket type+price combo → create',
                incoming: [...existing, { ticketType: TicketType.ADULT, price: 7500, description: 'Premium adult' }],
                expected: { create: 1, update: 0, idempotent: 4, delete: 0 }
            },
            {
                scenario: 'removed prices in incoming → never delete (preserves old)',
                incoming: existing.slice(0, 2),
                expected: { create: 0, update: 0, idempotent: 2, delete: 0 }
            },
            {
                scenario: 'mixed: create + update (never delete)',
                incoming: [
                    existing[0]!,                                           // idempotent (same content)
                    { ...existing[1]!, description: 'Changed description' },// update (same type+price, diff desc)
                    { ...existing[2]!, price: 2000 },                       // create (new price = new entity)
                    { ticketType: TicketType.ADULT, price: 7777, description: 'New' }// create (new type+price combo)
                    // existing[3] removed from incoming → NOT deleted (never delete)
                ],
                expected: { create: 2, update: 1, idempotent: 1, delete: 0 }
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
