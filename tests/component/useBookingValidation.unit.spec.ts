import {describe, it, expect} from 'vitest'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

describe('useBookingValidation - CreateOrdersRequestSchema Business Rules', () => {
    const {CreateOrdersRequestSchema, DinnerModeSchema} = useBookingValidation()

    describe('Business Rule: ONE user books for entire family', () => {
        it('WHEN all orders have same bookedByUserId THEN validates successfully', () => {
            const request = OrderFactory.defaultCreateOrdersRequest({
                orders: [
                    {inhabitantId: 10, ticketPriceId: 1, bookedByUserId: 42},
                    {inhabitantId: 11, ticketPriceId: 2, bookedByUserId: 42}
                ]
            })
            const result = CreateOrdersRequestSchema.safeParse(request)
            expect(result.success).toBe(true)
        })

        it('WHEN orders have different bookedByUserId THEN fails validation', () => {
            const request = OrderFactory.defaultCreateOrdersRequest({
                orders: [
                    {inhabitantId: 10, ticketPriceId: 1, bookedByUserId: 42},
                    {inhabitantId: 11, ticketPriceId: 2, bookedByUserId: 99}
                ]
            })
            const result = CreateOrdersRequestSchema.safeParse(request)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error.issues[0]?.message).toContain('samme bruger')
            }
        })
    })

    describe('Business Rule: Multiple orders for same inhabitant allowed', () => {
        it('WHEN same inhabitant has multiple orders THEN validates successfully', () => {
            const request = OrderFactory.defaultCreateOrdersRequest({
                orders: [
                    {inhabitantId: 10, ticketPriceId: 1, bookedByUserId: 42},
                    {inhabitantId: 10, ticketPriceId: 2, bookedByUserId: 42}
                ]
            })
            const result = CreateOrdersRequestSchema.safeParse(request)
            expect(result.success).toBe(true)
        })
    })

    describe('Business Rule: Different dinner modes allowed', () => {
        it('WHEN different family members have different dinner modes THEN validates successfully', () => {
            const request = OrderFactory.defaultCreateOrdersRequest({
                orders: [
                    {inhabitantId: 10, ticketPriceId: 1, dinnerMode: DinnerModeSchema.enum.DINEIN, bookedByUserId: 42},
                    {inhabitantId: 11, ticketPriceId: 2, dinnerMode: DinnerModeSchema.enum.TAKEAWAY, bookedByUserId: 42}
                ]
            })
            const result = CreateOrdersRequestSchema.safeParse(request)
            expect(result.success).toBe(true)
        })
    })
})
