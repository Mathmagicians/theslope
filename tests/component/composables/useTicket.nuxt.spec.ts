import {describe, it, expect, beforeEach} from 'vitest'
import {TicketFactory} from '../../e2e/testDataFactories/ticketFactory'

describe('useTicket', () => {
    const referenceDate = new Date('2025-01-15')
    const ticketPrices = TicketFactory.defaultTicketPrices()

    // Get composable inside tests (requires Nuxt context)
    const getComposable = () => useTicket()

    describe('ticketTypeConfig', () => {
        it.each(['ADULT', 'CHILD', 'BABY'] as const)(
            'GIVEN ticketTypeConfig WHEN checking %s THEN has all required properties',
            (type) => {
                const {ticketTypeConfig} = getComposable()
                const config = ticketTypeConfig[type]
                expect(config).toBeDefined()
                expect(config.label).toBeDefined()
                expect(config.color).toBeDefined()
                expect(config.icon).toBeDefined()
            }
        )
    })

    describe('determineTicketType', () => {
        describe('edge cases', () => {
            it.each([
                ['no birthDate', null, ticketPrices, 'ADULT'],
                ['no ticket prices', new Date('2020-01-01'), undefined, 'ADULT']
            ])('GIVEN %s WHEN determining ticket type THEN returns %s',
                (_, birthDate, prices, expected) => {
                    const result = determineTicketType(birthDate, prices, referenceDate)
                    expect(result).toBe(expected)
                }
            )
        })

        describe('age-based ticket types', () => {
            it.each([
                ['1 year old', '2024-01-01', 'BABY'],
                ['2 years old (boundary)', '2023-01-15', 'BABY'],
                ['3 years old', '2022-01-01', 'CHILD'],
                ['4 years old', '2021-01-15', 'CHILD'],
                ['8 years old', '2017-01-01', 'CHILD'],
                ['12 years old (boundary)', '2013-01-15', 'CHILD'],
                ['25 years old', '2000-01-01', 'ADULT']
            ])('GIVEN %s WHEN determining ticket type THEN returns %s',
                (_, birthDateStr, expectedType) => {
                    const birthDate = new Date(birthDateStr)
                    const result = determineTicketType(birthDate, ticketPrices, referenceDate)
                    expect(result).toBe(expectedType)
                }
            )
        })

        it('GIVEN custom age limits WHEN determining ticket type THEN uses custom limits', () => {
            const customPrices = TicketFactory.defaultTicketPrices({babyAge: 1, hungryBabyAge: 3, childAge: 10})
            const birthDate = new Date('2023-01-15') // 2 years old

            expect(determineTicketType(birthDate, customPrices, referenceDate)).toBe('BABY')
        })

        it('GIVEN unsorted ticket prices WHEN determining ticket type THEN still works correctly', () => {
            const unsortedPrices = [...ticketPrices].reverse()
            const birthDate = new Date('2022-01-01') // 3 years old

            expect(determineTicketType(birthDate, unsortedPrices, referenceDate)).toBe('CHILD')
        })
    })

    describe('getTicketTypeConfig', () => {
        it.each([
            ['1 year old', '2024-01-01', 'Baby', 'neutral', 'i-heroicons-face-smile'],
            ['8 years old', '2017-01-01', 'Barn', 'success', 'i-heroicons-user-circle'],
            ['25 years old', '2000-01-01', 'Voksen', 'primary', 'i-heroicons-user'],
            ['no birthDate', null, 'Voksen', 'primary', 'i-heroicons-user']
        ])('GIVEN %s WHEN getting config THEN returns correct config',
            (_, birthDateStr, expectedLabel, expectedColor, expectedIcon) => {
                const birthDate = birthDateStr ? new Date(birthDateStr) : null
                const config = getTicketTypeConfig(birthDate, ticketPrices, referenceDate)

                expect(config.label).toBe(expectedLabel)
                expect(config.color).toBe(expectedColor)
                expect(config.icon).toBe(expectedIcon)
            }
        )
    })

    describe('getTicketPriceForInhabitant', () => {
        it.each([
            ['1 year old (BABY)', '2024-01-01', 'BABY', 0],
            ['8 years old (CHILD)', '2017-01-01', 'CHILD', 3000],
            ['25 years old (ADULT)', '2000-01-01', 'ADULT', 5000]
        ])('GIVEN %s WHEN getting ticket price THEN returns matching TicketPrice with price %i',
            (_, birthDateStr, expectedType, expectedPrice) => {
                const birthDate = new Date(birthDateStr)
                const result = getTicketPriceForInhabitant(birthDate, ticketPrices, referenceDate)

                expect(result).toBeDefined()
                expect(result!.ticketType).toBe(expectedType)
                expect(result!.price).toBe(expectedPrice)
            }
        )

        it('GIVEN no birthDate WHEN getting ticket price THEN returns ADULT ticket price', () => {
            const result = getTicketPriceForInhabitant(null, ticketPrices, referenceDate)

            expect(result).toBeDefined()
            expect(result!.ticketType).toBe('ADULT')
            expect(result!.price).toBe(5000)
        })

        it('GIVEN no ticket prices WHEN getting ticket price THEN returns undefined', () => {
            const result = getTicketPriceForInhabitant(new Date('2020-01-01'), undefined, referenceDate)

            expect(result).toBeUndefined()
        })
    })

    describe('formatPrice', () => {
        it.each([
            [0, '0'],
            [100, '1'],
            [5000, '50'],
            [150000, '1.500'],
            [1234567, '12.346'],
        ])('GIVEN %i øre WHEN formatting THEN returns %s kr', (ore, expected) => {
            expect(formatPrice(ore)).toBe(expected)
        })
    })
})