import {describe, it, expect} from 'vitest'
import {TicketFactory} from '../../e2e/testDataFactories/ticketFactory'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'

describe('useTicket', () => {
    const referenceDate = new Date('2025-01-15')
    const ticketPrices = TicketFactory.defaultTicketPrices()

    describe('ticketTypeConfig', () => {
        it.each([
            ['ADULT', 'Voksen', 'primary', 'i-heroicons-user'],
            ['CHILD', 'Barn', 'success', 'i-heroicons-user-circle'],
            ['BABY', 'Baby', 'neutral', 'i-heroicons-face-smile']
        ] as const)('GIVEN %s THEN has label=%s color=%s icon=%s',
            (type, expectedLabel, expectedColor, expectedIcon) => {
                const {ticketTypeConfig} = useTicket()
                const config = ticketTypeConfig[type]
                expect(config.label).toBe(expectedLabel)
                expect(config.color).toBe(expectedColor)
                expect(config.icon).toBe(expectedIcon)
            }
        )
    })

    describe('determineTicketType', () => {
        it.each([
            // Edge cases
            ['no birthDate', null, ticketPrices, 'ADULT'],
            ['no ticket prices (5yo)', new Date('2020-01-01'), undefined, 'CHILD'],  // Falls back to defaults
            ['empty ticket prices (1yo)', new Date('2024-01-01'), [] as TicketPrice[], 'BABY'],  // Falls back to defaults
            // Age-based with explicit prices
            ['1 year old', new Date('2024-01-01'), ticketPrices, 'BABY'],
            ['2 years old (boundary)', new Date('2023-01-15'), ticketPrices, 'BABY'],
            ['3 years old', new Date('2022-01-01'), ticketPrices, 'CHILD'],
            ['12 years old (boundary)', new Date('2013-01-15'), ticketPrices, 'CHILD'],
            ['25 years old', new Date('2000-01-01'), ticketPrices, 'ADULT']
        ])('GIVEN %s THEN returns %s',
            (_, birthDate, prices, expected) => {
                const {determineTicketType} = useTicket()
                expect(determineTicketType(birthDate, prices, referenceDate)).toBe(expected)
            }
        )

        it('GIVEN custom age limits WHEN determining ticket type THEN uses custom limits', () => {
            const {determineTicketType} = useTicket()
            const customPrices = TicketFactory.defaultTicketPrices({babyAge: 1, hungryBabyAge: 3, childAge: 10})
            expect(determineTicketType(new Date('2023-01-15'), customPrices, referenceDate)).toBe('BABY')
        })

        it('GIVEN unsorted ticket prices THEN still works correctly', () => {
            const {determineTicketType} = useTicket()
            const unsortedPrices = [...ticketPrices].reverse()
            expect(determineTicketType(new Date('2022-01-01'), unsortedPrices, referenceDate)).toBe('CHILD')
        })
    })

    describe('getTicketTypeConfig', () => {
        it.each([
            ['1 year old', new Date('2024-01-01'), 'Baby', 'neutral', 'i-heroicons-face-smile'],
            ['8 years old', new Date('2017-01-01'), 'Barn', 'success', 'i-heroicons-user-circle'],
            ['25 years old', new Date('2000-01-01'), 'Voksen', 'primary', 'i-heroicons-user'],
            ['no birthDate', null, 'Voksen', 'primary', 'i-heroicons-user']
        ])('GIVEN %s THEN returns label=%s color=%s icon=%s',
            (_, birthDate, expectedLabel, expectedColor, expectedIcon) => {
                const {getTicketTypeConfig} = useTicket()
                const config = getTicketTypeConfig(birthDate, ticketPrices, referenceDate)
                expect(config.label).toBe(expectedLabel)
                expect(config.color).toBe(expectedColor)
                expect(config.icon).toBe(expectedIcon)
            }
        )
    })

    describe('getTicketPriceForInhabitant', () => {
        it.each([
            ['1 year old', new Date('2024-01-01'), 'BABY', 0],
            ['8 years old', new Date('2017-01-01'), 'CHILD', 3000],
            ['25 years old', new Date('2000-01-01'), 'ADULT', 5000],
            ['no birthDate', null, 'ADULT', 5000]
        ])('GIVEN %s THEN returns ticketType=%s price=%i',
            (_, birthDate, expectedType, expectedPrice) => {
                const {getTicketPriceForInhabitant} = useTicket()
                const result = getTicketPriceForInhabitant(birthDate, ticketPrices, referenceDate)
                expect(result).toBeDefined()
                expect(result!.ticketType).toBe(expectedType)
                expect(result!.price).toBe(expectedPrice)
            }
        )

        it('GIVEN no ticket prices THEN returns undefined', () => {
            const {getTicketPriceForInhabitant} = useTicket()
            expect(getTicketPriceForInhabitant(new Date('2020-01-01'), undefined, referenceDate)).toBeUndefined()
        })
    })

    describe('formatPrice', () => {
        it.each([
            [0, '0'],
            [100, '1'],
            [5000, '50'],
            [150000, '1.500'],
            [1234567, '12.346']
        ])('GIVEN %i øre THEN returns %s kr', (ore, expected) => {
            const {formatPrice} = useTicket()
            expect(formatPrice(ore)).toBe(expected)
        })
    })
})
