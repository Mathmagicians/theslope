import {describe, it, expect} from 'vitest'
import {TicketFactory} from '../../e2e/testDataFactories/ticketFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import type {TicketPrice} from '~/composables/useTicketPriceValidation'
import {ticketTypeLabel, ticketTypeLetter, ticketTypeCount} from '~/composables/useTicket'
import appConfig from '~/app.config'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {addDays, addMonths, subYears} from 'date-fns'

describe('useTicket', () => {
    const referenceDate = new Date('2025-01-15')
    const ticketPrices = TicketFactory.defaultTicketPrices()
    const {TicketTypeSchema} = useBookingValidation()
    const TicketType = TicketTypeSchema.enum

    describe('ticket type words', () => {
        it.each([
            {type: TicketType.ADULT, label: 'Voksen', letter: 'V', one: '1 voksen', many: '8 voksne', none: '0 voksne'},
            {type: TicketType.CHILD, label: 'Barn', letter: 'B', one: '1 barn', many: '8 børn', none: '0 børn'},
            {type: TicketType.BABY, label: 'Baby', letter: 'b', one: '1 baby', many: '8 babyer', none: '0 babyer'}
        ])('GIVEN $type THEN it goes by $label, the letter $letter, and counts "$one" and "$many"', ({type, label, letter, one, many, none}) => {
            expect(ticketTypeLabel(type)).toBe(label)
            expect(ticketTypeLetter(type)).toBe(letter)
            expect([1, 8, 0].map(count => ticketTypeCount(type, count))).toEqual([one, many, none])
        })
    })

    describe('determineTicketType', () => {
        it.each([
            // Edge cases
            ['no birthDate', null, ticketPrices, TicketType.ADULT],
            ['no ticket prices (5yo)', new Date('2020-01-01'), undefined, TicketType.CHILD],  // Falls back to defaults
            // Age-based with explicit prices (maximumAgeLimit means UNDER that age)
            ['1 year old', new Date('2024-01-01'), ticketPrices, TicketType.BABY],   // Under 2 → BABY
            ['2 years old (boundary)', new Date('2023-01-15'), ticketPrices, TicketType.CHILD],  // Not under 2 → CHILD
            ['11 years old', new Date('2014-01-01'), ticketPrices, TicketType.CHILD], // Under 12 → CHILD
            ['12 years old (boundary)', new Date('2013-01-15'), ticketPrices, TicketType.ADULT]  // Not under 12 → ADULT
        ])('GIVEN %s THEN returns %s',
            (_, birthDate, prices, expected) => {
                const {determineTicketType} = useTicket()
                expect(determineTicketType(birthDate, prices as TicketPrice[] | undefined, referenceDate)).toBe(expected)
            }
        )

        it('GIVEN custom age limits WHEN determining ticket type THEN uses custom limits', () => {
            const {determineTicketType} = useTicket()
            const customPrices = TicketFactory.defaultTicketPrices({babyAge: 1, hungryBabyAge: 3, childAge: 10})
            expect(determineTicketType(new Date('2023-01-15'), customPrices, referenceDate)).toBe(TicketType.BABY)
        })

        it('GIVEN unsorted ticket prices THEN still works correctly', () => {
            const {determineTicketType} = useTicket()
            const unsortedPrices = [...ticketPrices].reverse()
            expect(determineTicketType(new Date('2022-01-01'), unsortedPrices, referenceDate)).toBe(TicketType.CHILD)
        })
    })

    describe('findTicketPriceByType', () => {
        it('GIVEN a type with two prices THEN returns the first, cheapest one', () => {
            const {findTicketPriceByType} = useTicket()
            const result = findTicketPriceByType(TicketType.BABY, ticketPrices)
            expect(result).toBeDefined()
            expect(result!.ticketType).toBe(TicketType.BABY)
            expect(result!.price).toBe(0)
        })

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

    describe('findTicketPriceById', () => {
        it('GIVEN a price row id THEN returns that row', () => {
            const child = TicketFactory.defaultPriceOf(TicketType.CHILD)
            expect(useTicket().findTicketPriceById(child.id!, ticketPrices)).toEqual(child)
        })

        it.each([
            {desc: 'an id the season holds no row for', ticketPriceId: ticketPrices.length + 1},
            {desc: 'no id', ticketPriceId: null}
        ])('GIVEN $desc THEN returns undefined', ({ticketPriceId}) => {
            expect(useTicket().findTicketPriceById(ticketPriceId, ticketPrices)).toBeUndefined()
        })
    })

    // The priorities (birthDate, priceAtBooking, fallback) are resolveTicketPrice's, below
    describe('resolveTicketType', () => {
        it('GIVEN ticket prices THEN resolves to the type of the resolved price', () => {
            expect(useTicket().resolveTicketType(new Date('2017-01-01'), ticketPrices, referenceDate)).toBe(TicketType.CHILD)
        })

        // No ticket prices: default age limits classify - children must not become Voksen
        it('GIVEN an 8 year old WITHOUT ticket prices THEN classifies by default age limits as CHILD', () => {
            expect(useTicket().resolveTicketType(new Date('2017-01-01'), undefined, referenceDate)).toBe(TicketType.CHILD)
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

        it('GIVEN mixed ages THEN buckets in fixed order ADULT, CHILD, BABY with counts', () => {
            const {groupInhabitantsByTicketCategory} = useTicket()
            const groups = groupInhabitantsByTicketCategory(mixedInhabitants, ticketPrices, referenceDate)
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
        // Sorted by price asc (as from DB): BABY 0, BABY 900, CHILD 1700, ADULT 4000
        const sortedPrices = TicketFactory.defaultTicketPrices()

        it.each([
            // Priority 1: birthDate → ticketType → cheapest for type
            ['8yo with birthDate', new Date('2017-01-01'), undefined, TicketType.CHILD, 1700],
            // Priority 2: priceAtBooking (no birthDate) matches the exact price, not the cheapest of its type
            ['priceAtBooking 900 (hungry baby)', null, 900, TicketType.BABY, 900],
            // Fallback: ADULT when no birthDate and no matching price
            ['no birthDate, no priceAtBooking', null, undefined, TicketType.ADULT, 4000],
            ['no birthDate, unmatched price', null, 9999, TicketType.ADULT, 4000]
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
            // 1yo = BABY, sorted prices have BABY at 0 and 900, should return 0 (cheapest)
            const result = resolveTicketPrice(new Date('2024-01-01'), undefined, sortedPrices, referenceDate)
            expect(result!.ticketType).toBe(TicketType.BABY)
            expect(result!.price).toBe(0) // Cheapest BABY, not 900
        })

        it('GIVEN no ticketPrices THEN returns undefined', () => {
            const {resolveTicketPrice} = useTicket()
            expect(resolveTicketPrice(new Date('2020-01-01'), undefined, undefined, referenceDate)).toBeUndefined()
            expect(resolveTicketPrice(new Date('2020-01-01'), undefined, [], referenceDate)).toBeUndefined()
        })

        it('GIVEN no ADULT price AND unmatched priceAtBooking THEN returns last available price', () => {
            const {resolveTicketPrice} = useTicket()
            const childAndBabyOnly = TicketFactory.defaultTicketPrices().filter(tp => tp.ticketType !== TicketType.ADULT)
            const result = resolveTicketPrice(null, 9999, childAndBabyOnly, referenceDate)
            expect(result).toBeDefined()
            expect(result!.ticketType).toBe(TicketType.CHILD)  // Last in the filtered array
        })

        it('GIVEN birthDate takes priority over priceAtBooking', () => {
            const {resolveTicketPrice} = useTicket()
            // 25yo = ADULT, but priceAtBooking is 0 (baby price)
            // birthDate should win → ADULT 4000
            const result = resolveTicketPrice(new Date('2000-01-01'), 0, sortedPrices, referenceDate)
            expect(result!.ticketType).toBe(TicketType.ADULT)
            expect(result!.price).toBe(4000)
        })
    })

    // A booked ticket keeps its own price row whatever the person's age; a dinner without one takes the row for the
    // person's age on the dinner's date, as the save prices it
    describe('resolveTicketPriceOn', () => {
        const dinnerDate = addMonths(new Date(), 1)
        const [childPrice, adultPrice] = [TicketType.CHILD, TicketType.ADULT].map(type => ticketPrices.find(tp => tp.ticketType === type)!)
        const turnsAdultOnTheDinner = subYears(dinnerDate, childPrice!.maximumAgeLimit!)
        const bookedAt = (ticketPriceId: number | null) =>
            OrderFactory.defaultOrder(undefined, {ticketPriceId, ticketType: childPrice!.ticketType, priceAtBooking: childPrice!.price})

        it.each([
            {given: 'an adult booked at the CHILD price row', birthDate: new Date('1990-01-01'), order: bookedAt(childPrice!.id!), expected: childPrice},
            {given: 'an adult booked at a price row since deleted', birthDate: new Date('1990-01-01'), order: bookedAt(null), expected: childPrice},
            {given: 'a child today who turns 12 on the dinner, without a booking', birthDate: turnsAdultOnTheDinner, order: undefined, expected: adultPrice}
        ])('GIVEN $given THEN the price row is $expected.ticketType', ({birthDate, order, expected}) => {
            expect(useTicket().resolveTicketPriceOn(birthDate, order, ticketPrices, dinnerDate)).toEqual(expected)
        })
    })

    // A person's first dinner at a new ticket type: the first dinner whose type, by the person's age on its date, differs
    // from the type on the dinner before it
    describe('ticketTypeChangeOf', () => {
        const today = new Date()
        // Three dinners a week apart, sorted; the birthdays fall around the second
        const dinnerDates = [7, 14, 21].map(days => addDays(today, days))
        const [firstDinner, secondDinner] = dinnerDates as [Date, Date, Date]
        const betweenTheFirstTwo = addDays(firstDinner, 3)
        // The birth date of a person who reaches a price row's age limit on a day
        const reaching = (ticketType: typeof TicketType[keyof typeof TicketType], day: Date) =>
            subYears(day, TicketFactory.defaultPriceOf(ticketType).maximumAgeLimit!)

        it.each([
            {name: 'turning 12 on a day without a dinner gives the next dinner, at ADULT', birthDate: reaching(TicketType.CHILD, betweenTheFirstTwo),
                change: {date: secondDinner, ticketType: TicketType.ADULT}},
            {name: 'a birthday on a dinner\'s date gives that dinner', birthDate: reaching(TicketType.CHILD, secondDinner),
                change: {date: secondDinner, ticketType: TicketType.ADULT}},
            {name: 'turning 2 gives CHILD', birthDate: reaching(TicketType.BABY, betweenTheFirstTwo),
                change: {date: secondDinner, ticketType: TicketType.CHILD}},
            {name: 'no change across the dinners, 12 the day before the first, gives null', birthDate: reaching(TicketType.CHILD, addDays(firstDinner, -1)),
                change: null},
            {name: 'no birth date gives null', birthDate: null, change: null}
        ])('$name', ({birthDate, change}) => {
            expect(useTicket().ticketTypeChangeOf(birthDate, ticketPrices)(dinnerDates)).toEqual(change)
        })
    })

    describe('portionsOf', () => {
        // The config's default prices hold the weight of their tickets; a price matches on its type and amount
        const defaults = appConfig.theslope.defaultSeason.ticketPrices
        const firstOfType = (ticketType: typeof TicketType[keyof typeof TicketType]) => useTicket().findTicketPriceByType(ticketType, defaults)!

        it('a ticket priced as a default weighs the portions of that default', () => {
            const misses = defaults.filter(({ticketType, price, portions}) => useTicket().portionsOf({ticketType, price}) !== portions)
            expect(misses).toEqual([])
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

    // A ticket of 0 portions takes nothing from the kitchen; the predicate answers by the id of the ticket's price row
    describe('takesNoPortionOf', () => {
        // The factory lists the baby who tastes, the hungry baby, the child and the adult
        const [tasting, hungry, child, adult] = ticketPrices

        it.each([
            {ticket: 'the baby who tastes', ticketPriceId: tasting!.id!, takesNoPortion: true},
            {ticket: 'the hungry baby', ticketPriceId: hungry!.id!, takesNoPortion: false},
            {ticket: 'the child', ticketPriceId: child!.id!, takesNoPortion: false},
            {ticket: 'the adult', ticketPriceId: adult!.id!, takesNoPortion: false},
            {ticket: 'a price row the prices do not hold', ticketPriceId: 99, takesNoPortion: false}
        ])('GIVEN $ticket THEN it takes no portion: $takesNoPortion', ({ticketPriceId, takesNoPortion}) => {
            expect(useTicket().takesNoPortionOf(ticketPrices)(ticketPriceId)).toBe(takesNoPortion)
        })
    })

    describe('formatPrice', () => {
        it.each([
            [5000, '50'],
            [1234567, '12.346']
        ])('GIVEN %i øre THEN returns %s kr', (ore, expected) => {
            const {formatPrice} = useTicket()
            expect(formatPrice(ore)).toBe(expected)
        })
    })
})
