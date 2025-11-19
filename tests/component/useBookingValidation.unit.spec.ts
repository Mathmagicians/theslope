import {describe, it, expect} from 'vitest'
import {useBookingValidation} from '~/composables/useBookingValidation'

describe('useBookingValidation - CreateOrdersRequestSchema Business Rules', () => {
    const {CreateOrdersRequestSchema, DinnerModeSchema} = useBookingValidation()

    const validOrdersRequest = {
        dinnerEventId: 1,
        orders: [
            {
                inhabitantId: 10,
                ticketPriceId: 1,
                dinnerMode: DinnerModeSchema.enum.DINEIN,
                bookedByUserId: 42
            },
            {
                inhabitantId: 11,
                ticketPriceId: 2,
                dinnerMode: DinnerModeSchema.enum.DINEIN,
                bookedByUserId: 42
            }
        ]
    }

    describe('Business Rule: ONE user books for entire family', () => {
        it('WHEN all orders have same bookedByUserId THEN validates successfully', () => {
            const result = CreateOrdersRequestSchema.safeParse(validOrdersRequest)
            expect(result.success).toBe(true)
        })

        it('WHEN orders have different bookedByUserId THEN fails validation', () => {
            const differentUsers = {
                dinnerEventId: 1,
                orders: [
                    {
                        inhabitantId: 10,
                        ticketPriceId: 1,
                        dinnerMode: DinnerModeSchema.enum.DINEIN,
                        bookedByUserId: 42 // User A
                    },
                    {
                        inhabitantId: 11,
                        ticketPriceId: 2,
                        dinnerMode: DinnerModeSchema.enum.DINEIN,
                        bookedByUserId: 99 // User B - DIFFERENT!
                    }
                ]
            }
            const result = CreateOrdersRequestSchema.safeParse(differentUsers)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0]?.message).toContain('samme bruger')
            }
        })
    })

    describe('Business Rule: Multiple orders for same inhabitant allowed', () => {
        it('WHEN same inhabitant has multiple orders THEN validates successfully', () => {
            const multipleOrdersSameInhabitant = {
                dinnerEventId: 1,
                orders: [
                    {
                        inhabitantId: 10, // Same person
                        ticketPriceId: 1, // Adult ticket
                        dinnerMode: DinnerModeSchema.enum.DINEIN,
                        bookedByUserId: 42
                    },
                    {
                        inhabitantId: 10, // Same person
                        ticketPriceId: 2, // Child ticket
                        dinnerMode: DinnerModeSchema.enum.DINEIN,
                        bookedByUserId: 42
                    }
                ]
            }
            const result = CreateOrdersRequestSchema.safeParse(multipleOrdersSameInhabitant)
            expect(result.success).toBe(true)
        })
    })

    describe('Business Rule: Different dinner modes allowed', () => {
        it('WHEN different family members have different dinner modes THEN validates successfully', () => {
            const differentModes = {
                dinnerEventId: 1,
                orders: [
                    {
                        inhabitantId: 10,
                        ticketPriceId: 1,
                        dinnerMode: DinnerModeSchema.enum.DINEIN,
                        bookedByUserId: 42
                    },
                    {
                        inhabitantId: 11,
                        ticketPriceId: 2,
                        dinnerMode: DinnerModeSchema.enum.TAKEAWAY,
                        bookedByUserId: 42
                    }
                ]
            }
            const result = CreateOrdersRequestSchema.safeParse(differentModes)
            expect(result.success).toBe(true)
        })
    })
})
