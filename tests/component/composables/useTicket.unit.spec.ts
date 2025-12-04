import {describe, it, expect} from 'vitest'
import {useTicket} from '~/composables/useTicket'
import {TicketFactory} from '../../e2e/testDataFactories/ticketFactory'

describe('useTicket', () => {
    const {ticketTypeConfig, determineTicketType, getTicketTypeConfig, formatPrice} = useTicket()
    const referenceDate = new Date('2025-01-15')
    const ticketPrices = TicketFactory.defaultTicketPrices()

    describe('ticketTypeConfig', () => {
        it('GIVEN ticketTypeConfig WHEN checking structure THEN has all required properties', () => {
            const expectedTypes = ['ADULT', 'CHILD', 'BABY']
            const expectedProps = ['label', 'color', 'icon']

            expectedTypes.forEach(type => {
                expect(ticketTypeConfig[type]).toBeDefined()
                expectedProps.forEach(prop => {
                    expect(ticketTypeConfig[type][prop]).toBeDefined()
                })
            })
        })
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