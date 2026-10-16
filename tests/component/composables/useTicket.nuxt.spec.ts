import {describe, it, expect} from 'vitest'
import {TicketFactory} from '../../e2e/testDataFactories/ticketFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import appConfig from '~/app.config'

describe('useTicket', () => {
    const referenceDate = new Date('2025-01-15')
    const ticketPrices = TicketFactory.defaultTicketPrices()
    const {TicketTypeSchema} = useBookingValidation()
    const TicketType = TicketTypeSchema.enum

    describe('ticketTypeWords', () => {
        it.each([
            [TicketType.ADULT, 'Voksen', 'V'],
            [TicketType.CHILD, 'Barn', 'B'],
            [TicketType.BABY, 'Baby', 'b']
        ] as const)('GIVEN %s THEN it goes by %s and the letter %s', (type, label, compactLabel) => {
            expect(useTicket().ticketTypeWords[type]).toEqual({label, compactLabel})
        })
    })

    describe('determineTicketType', () => {
        it.each([
            // Edge cases
            ['no birthDate', null, ticketPrices, 'ADULT'],
            ['no ticket prices (5yo)', new Date('2020-01-01'), undefined, 'CHILD'],  // Falls back to defaults
            ['empty ticket prices (1yo)', new Date('2024-01-01'), [] as TicketPrice[], 'BABY'],  // Falls back to defaults
            // Age-based with explicit prices (maximumAgeLimit means UNDER that age)
            ['0 years old', new Date('2025-01-01'), ticketPrices, 'BABY'],  // Under 2 → BABY
            ['1 year old', new Date('2024-01-01'), ticketPrices, 'BABY'],   // Under 2 → BABY
            ['2 years old (boundary)', new Date('2023-01-15'), ticketPrices, 'CHILD'],  // Not under 2 → CHILD
            ['3 years old', new Date('2022-01-01'), ticketPrices, 'CHILD'],
            ['11 years old', new Date('2014-01-01'), ticketPrices, 'CHILD'], // Under 12 → CHILD
            ['12 years old (boundary)', new Date('2013-01-15'), ticketPrices, 'ADULT'],  // Not under 12 → ADULT
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

    describe('findTicketPriceByType', () => {
        const {TicketTypeSchema} = useBookingValidation()
        const TicketType = TicketTypeSchema.enum

        it.each([
            [TicketType.ADULT, TicketType.ADULT, 5000],
            [TicketType.CHILD, TicketType.CHILD, 3000],
            [TicketType.BABY, TicketType.BABY, 0]  // Returns first/cheapest BABY
        ])('GIVEN %s THEN returns ticketType=%s price=%i',
            (type, expectedType, expectedPrice) => {
                const {findTicketPriceByType} = useTicket()
                const result = findTicketPriceByType(type, ticketPrices)
                expect(result).toBeDefined()
                expect(result!.ticketType).toBe(expectedType)
                expect(result!.price).toBe(expectedPrice)
            }
        )

        it('GIVEN no ticketPrices THEN returns undefined', () => {
            const {findTicketPriceByType} = useTicket()
            expect(findTicketPriceByType(TicketType.ADULT, undefined)).toBeUndefined()
            expect(findTicketPriceByType(TicketType.ADULT, [])).toBeUndefined()
        })

        it('GIVEN type not in prices THEN returns undefined', () => {
            const {findTicketPriceByType} = useTicket()
            const adultsOnly = ticketPrices.filter(tp => tp.ticketType === TicketType.ADULT)
            expect(findTicketPriceByType(TicketType.CHILD, adultsOnly)).toBeUndefined()
        })
    })

    describe('resolveTicketType', () => {
        it.each([
            ['1 year old', new Date('2024-01-01'), TicketType.BABY],
            ['8 years old', new Date('2017-01-01'), TicketType.CHILD],
            ['25 years old', new Date('2000-01-01'), TicketType.ADULT],
            ['no birthDate', null, TicketType.ADULT]
        ])('GIVEN %s THEN resolves to %s', (_, birthDate, expected) => {
            expect(useTicket().resolveTicketType(birthDate, ticketPrices, referenceDate)).toBe(expected)
        })

        it.each([
            // priceAtBooking fallback when no birthDate (guest/orphan orders)
            ['priceAtBooking 0 (baby)', 0, TicketType.BABY],
            ['priceAtBooking 1500 (hungry baby)', 1500, TicketType.BABY],
            ['priceAtBooking 3000 (child)', 3000, TicketType.CHILD],
            ['priceAtBooking 5000 (adult)', 5000, TicketType.ADULT],
            ['priceAtBooking unmatched', 9999, TicketType.ADULT]  // Falls back to ADULT
        ])('GIVEN no birthDate with %s THEN resolves to %s', (_, priceAtBooking, expected) => {
            expect(useTicket().resolveTicketType(null, ticketPrices, referenceDate, priceAtBooking)).toBe(expected)
        })

        it('GIVEN birthDate takes priority over priceAtBooking', () => {
            // 25yo = ADULT, but priceAtBooking is 0 (baby price) - birthDate wins
            expect(useTicket().resolveTicketType(new Date('2000-01-01'), ticketPrices, referenceDate, 0)).toBe(TicketType.ADULT)
        })

        it.each([
            // No ticket prices: default age limits classify - children must not become Voksen
            ['1 year old', new Date('2024-01-01'), TicketType.BABY],
            ['8 years old', new Date('2017-01-01'), TicketType.CHILD],
            ['25 years old', new Date('2000-01-01'), TicketType.ADULT],
            ['no birthDate', null, TicketType.ADULT]
        ])('GIVEN %s WITHOUT ticket prices THEN classifies by default age limits as %s', (_, birthDate, expected) => {
            expect(useTicket().resolveTicketType(birthDate, undefined, referenceDate)).toBe(expected)
        })
    })

    describe('groupInhabitantsByTicketCategory', () => {
        const inhabitantWithAge = (birthDate: Date | null, testSalt: string) =>
            ({...HouseholdFactory.defaultInhabitantData(testSalt), birthDate})

        const mixedInhabitants = [
            inhabitantWithAge(new Date('2000-01-01'), 'adult1'),
            inhabitantWithAge(new Date('2024-01-01'), 'baby1'),
            inhabitantWithAge(new Date('2017-01-01'), 'child1'),
            inhabitantWithAge(new Date('2014-01-01'), 'child2')
        ]

        it.each([
            ['with ticket prices', ticketPrices],
            ['without ticket prices (default age limits)', undefined]
        ])('GIVEN mixed ages %s THEN buckets in fixed order ADULT, CHILD, BABY with counts', (_, prices) => {
            const {groupInhabitantsByTicketCategory} = useTicket()
            const groups = groupInhabitantsByTicketCategory(mixedInhabitants, prices, referenceDate)
            expect(groups.map(g => g.ticketType)).toEqual([TicketType.ADULT, TicketType.CHILD, TicketType.BABY])
            expect(groups.map(g => g.count)).toEqual([1, 2, 1])
            expect(groups.map(g => g.inhabitants.length)).toEqual([1, 2, 1])
        })

        it('GIVEN missing birthDate THEN counts as ADULT and empty categories stay present with count 0', () => {
            const {groupInhabitantsByTicketCategory} = useTicket()
            const groups = groupInhabitantsByTicketCategory([inhabitantWithAge(null, 'unknown1')], ticketPrices, referenceDate)
            expect(groups.map(g => g.count)).toEqual([1, 0, 0])
        })
    })

    describe('resolveTicketPrice', () => {
        // Sorted by price asc (as from DB): BABY 0, BABY 1500, CHILD 3000, ADULT 5000
        const sortedPrices = TicketFactory.defaultTicketPrices()

        it.each([
            // Priority 1: birthDate → ticketType → cheapest for type
            ['1yo with birthDate', new Date('2024-01-01'), undefined, 'BABY', 0],
            ['8yo with birthDate', new Date('2017-01-01'), undefined, 'CHILD', 3000],
            ['25yo with birthDate', new Date('2000-01-01'), undefined, 'ADULT', 5000],
            // Priority 2: priceAtBooking (no birthDate)
            ['priceAtBooking 0 (free baby)', null, 0, 'BABY', 0],
            ['priceAtBooking 1500 (hungry baby)', null, 1500, 'BABY', 1500],
            ['priceAtBooking 3000 (child)', null, 3000, 'CHILD', 3000],
            ['priceAtBooking 5000 (adult)', null, 5000, 'ADULT', 5000],
            // Fallback: ADULT when no birthDate and no matching price
            ['no birthDate, no priceAtBooking', null, undefined, 'ADULT', 5000],
            ['no birthDate, unmatched price', null, 9999, 'ADULT', 5000],
        ])('GIVEN %s THEN returns ticketType=%s price=%i',
            (_, birthDate, priceAtBooking, expectedType, expectedPrice) => {
                const {resolveTicketPrice} = useTicket()
                const result = resolveTicketPrice(birthDate, priceAtBooking, sortedPrices, referenceDate)
                expect(result).toBeDefined()
                expect(result!.ticketType).toBe(expectedType)
                expect(result!.price).toBe(expectedPrice)
            }
        )

        it('GIVEN birthDate for BABY THEN returns cheapest BABY (free, not hungry)', () => {
            const {resolveTicketPrice} = useTicket()
            // 1yo = BABY, sorted prices have BABY at 0 and 1500, should return 0 (cheapest)
            const result = resolveTicketPrice(new Date('2024-01-01'), undefined, sortedPrices, referenceDate)
            expect(result!.ticketType).toBe('BABY')
            expect(result!.price).toBe(0) // Cheapest BABY, not 1500
        })

        it('GIVEN no ticketPrices THEN returns undefined', () => {
            const {resolveTicketPrice} = useTicket()
            expect(resolveTicketPrice(new Date('2020-01-01'), undefined, undefined, referenceDate)).toBeUndefined()
            expect(resolveTicketPrice(new Date('2020-01-01'), undefined, [], referenceDate)).toBeUndefined()
        })

        it('GIVEN no ADULT price AND unmatched priceAtBooking THEN returns last available price', () => {
            const {resolveTicketPrice} = useTicket()
            const childAndBabyOnly = TicketFactory.defaultTicketPrices().filter(tp => tp.ticketType !== 'ADULT')
            const result = resolveTicketPrice(null, 9999, childAndBabyOnly, referenceDate)
            expect(result).toBeDefined()
            expect(result!.ticketType).toBe('CHILD')  // Last in the filtered array
        })

        it('GIVEN birthDate takes priority over priceAtBooking', () => {
            const {resolveTicketPrice} = useTicket()
            // 25yo = ADULT, but priceAtBooking is 0 (baby price)
            // birthDate should win → ADULT 5000
            const result = resolveTicketPrice(new Date('2000-01-01'), 0, sortedPrices, referenceDate)
            expect(result!.ticketType).toBe('ADULT')
            expect(result!.price).toBe(5000)
        })
    })

    describe('portionsOf', () => {
        // The config's default prices hold the weight of their tickets; a price matches on its type and amount
        const defaults = appConfig.theslope.defaultSeason.ticketPrices
        const firstOfType = (ticketType: typeof TicketType[keyof typeof TicketType]) => defaults.find(price => price.ticketType === ticketType)!

        it.each(defaults.map(price => ({...price, label: `${price.ticketType} at ${price.price} øre`})))(
            'a ticket priced as the default $label weighs its portions', ({ticketType, price, portions}) => {
                expect(useTicket().portionsOf({ticketType, price})).toBe(portions)
            })

        it('a ticket at a price no default names weighs the first default price of its type', () => {
            const {ticketType, price} = defaults.find(candidate => candidate.ticketType === TicketType.BABY && candidate.portions > 0)!
            expect(useTicket().portionsOf({ticketType, price: price + 1})).toBe(firstOfType(TicketType.BABY).portions)
        })

        it('two prices of one type weigh apart', () => {
            const babies = defaults.filter(price => price.ticketType === TicketType.BABY)
            expect(new Set(babies.map(price => useTicket().portionsOf(price))).size).toBe(babies.length)
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
