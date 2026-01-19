import {describe, it, expect} from 'vitest'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'

describe('useBookingValidation - CreateOrdersRequestSchema Business Rules', () => {
    const {CreateOrdersRequestSchema, DinnerModeSchema} = useBookingValidation()
    const DINEIN = DinnerModeSchema.enum.DINEIN
    const TAKEAWAY = DinnerModeSchema.enum.TAKEAWAY

    // Helper to create order with defaults
    const order = (inhabitantId: number, ticketPriceId: number, bookedByUserId: number, dinnerMode: typeof DINEIN | typeof TAKEAWAY = DINEIN) =>
        ({inhabitantId, ticketPriceId, bookedByUserId, dinnerMode, isGuestTicket: false})

    it.each([
        {
            scenario: 'same bookedByUserId for all orders',
            orders: [order(10, 1, 42), order(11, 2, 42)],
            shouldSucceed: true
        },
        {
            scenario: 'different bookedByUserId across orders',
            orders: [order(10, 1, 42), order(11, 2, 99)],
            shouldSucceed: false,
            expectedError: 'samme bruger'
        },
        {
            scenario: 'multiple orders for same inhabitant',
            orders: [order(10, 1, 42), order(10, 2, 42)],
            shouldSucceed: true
        },
        {
            scenario: 'different dinner modes for family members',
            orders: [order(10, 1, 42, DINEIN), order(11, 2, 42, TAKEAWAY)],
            shouldSucceed: true
        }
    ])('GIVEN $scenario THEN validation $shouldSucceed', ({orders, shouldSucceed, expectedError}) => {
        const request = OrderFactory.defaultCreateOrdersRequest({orders})
        const result = CreateOrdersRequestSchema.safeParse(request)

        expect(result.success).toBe(shouldSucceed)
        if (!shouldSucceed && expectedError && !result.success) {
            expect(result.error.issues[0]?.message).toContain(expectedError)
        }
    })
})
