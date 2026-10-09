import {describe, it, expect} from 'vitest'
import {useAllergy} from '~/composables/useAllergy'
import {useBookingValidation} from '~/composables/useBookingValidation'
import {useOrder} from '~/composables/useOrder'
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import DINNER_644 from '~~/tests/component/fixtures/dinner-644-tickets.json'

const {TicketTypeSchema, DinnerModeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum
const DinnerMode = DinnerModeSchema.enum

const CATALOGUE = AllergyFactory.createMockAllergyTypes()
const [PEANUTS, LACTOSE] = CATALOGUE as [AllergyTypeDisplay, AllergyTypeDisplay]

// Adult 1 kuv., child 0,5, baby 0 - the kitchen panel's portion weights
const ORDERS: OrderDetail[] = [
    OrderFactory.defaultOrderDetailWithAllergies(1, 'Anna', [PEANUTS, LACTOSE], {ticketType: TicketType.ADULT}),
    OrderFactory.defaultOrderDetailWithAllergies(2, 'Bo', [LACTOSE], {ticketType: TicketType.CHILD}),
    OrderFactory.defaultOrderDetailWithAllergies(3, 'Cy', [PEANUTS], {ticketType: TicketType.BABY}),
    OrderFactory.defaultOrderDetailWithAllergies(4, 'Dan', [], {ticketType: TicketType.ADULT})
]

const withDuplicatedAllergyRows = (order: OrderDetail): OrderDetail => ({
    ...order,
    inhabitant: {...order.inhabitant, allergies: [...order.inhabitant.allergies!, ...order.inhabitant.allergies!]}
})

// A guest ticket books on Anna's inhabitant and carries Anna's allergies on that inhabitant
const guestOf = (orderId: number, provenanceAllergies?: string[]): OrderDetail => ({
    ...OrderFactory.defaultOrderDetailWithAllergies(1, 'Anna', [PEANUTS, LACTOSE], {ticketType: TicketType.ADULT}),
    id: orderId,
    isGuestTicket: true,
    provenanceAllergies
})

// The dev-server detail of dinner 644: one inhabitant carries the same allergy as two rows and books a guest ticket
const FIXTURE = DINNER_644 as unknown as {allergens: AllergyTypeDisplay[], tickets: OrderDetail[]}
const FIXTURE_CATALOGUE = Array.from(new Map(
    FIXTURE.tickets.flatMap(ticket => ticket.inhabitant.allergies?.map(allergy => allergy.allergyType) ?? [])
        .concat(FIXTURE.allergens)
        .map(allergyType => [allergyType.id, allergyType])
).values())
const [FIXTURE_MILK, FIXTURE_NUTS] = FIXTURE.allergens as [AllergyTypeDisplay, AllergyTypeDisplay]

describe('useAllergy.computeAffectedDiners', () => {
    const {computeAffectedDiners} = useAllergy()

    describe.each([
        {
            filter: 'no menu filter (every registered allergy)',
            menuAllergenIds: undefined,
            totalAffected: 3,
            totalPortions: 1.5,
            breakdown: [
                {name: LACTOSE.name, count: 2, portions: 1.5},
                {name: PEANUTS.name, count: 2, portions: 1}
            ],
            diners: [
                {name: 'Anna', allergens: [PEANUTS.name, LACTOSE.name]},
                {name: 'Bo', allergens: [LACTOSE.name]},
                {name: 'Cy', allergens: [PEANUTS.name]}
            ]
        },
        {
            filter: 'menu filter on peanuts',
            menuAllergenIds: [PEANUTS.id],
            totalAffected: 2,
            totalPortions: 1,
            breakdown: [{name: PEANUTS.name, count: 2, portions: 1}],
            diners: [
                {name: 'Anna', allergens: [PEANUTS.name]},
                {name: 'Cy', allergens: [PEANUTS.name]}
            ]
        },
        {
            filter: 'menu filter on lactose',
            menuAllergenIds: [LACTOSE.id],
            totalAffected: 2,
            totalPortions: 1.5,
            breakdown: [{name: LACTOSE.name, count: 2, portions: 1.5}],
            diners: [
                {name: 'Anna', allergens: [LACTOSE.name]},
                {name: 'Bo', allergens: [LACTOSE.name]}
            ]
        }
    ])('GIVEN an adult, a child and a baby with allergies and $filter', ({menuAllergenIds, totalAffected, totalPortions, breakdown, diners}) => {
        const result = () => computeAffectedDiners(ORDERS, CATALOGUE, menuAllergenIds)

        it(`THEN counts ${totalAffected} diners and ${totalPortions} kuverter`, () => {
            expect(result()?.totalAffected).toBe(totalAffected)
            expect(result()?.totalPortions).toBe(totalPortions)
        })

        it('THEN lists each allergen with its kuverter, most kuverter first', () => {
            expect(result()?.breakdownByAllergen.map(({name, count, portions}) => ({name, count, portions}))).toEqual(breakdown)
        })

        it('THEN lists each diner with the allergens counted', () => {
            expect(result()?.affectedList.map(diner => ({
                name: diner.inhabitant.name,
                allergens: diner.matchingAllergens.map(a => a.name)
            }))).toEqual(diners)
        })
    })

    describe.each([
        {
            scenario: 'an inhabitant carrying the same allergy as two rows',
            orders: [withDuplicatedAllergyRows(ORDERS[1]!)],
            totalAffected: 1,
            totalPortions: 0.5,
            breakdown: [{name: LACTOSE.name, count: 1, portions: 0.5}]
        },
        {
            scenario: 'a guest ticket with its own allergies, booked by an allergic inhabitant',
            orders: [guestOf(10, [LACTOSE.name])],
            totalAffected: 1,
            totalPortions: 1,
            breakdown: [{name: LACTOSE.name, count: 1, portions: 1}]
        },
        {
            scenario: 'a guest ticket beside its allergic booker',
            orders: [ORDERS[0]!, guestOf(10, [LACTOSE.name])],
            totalAffected: 2,
            totalPortions: 2,
            breakdown: [
                {name: LACTOSE.name, count: 2, portions: 2},
                {name: PEANUTS.name, count: 1, portions: 1}
            ]
        },
        {
            scenario: 'a guest ticket whose allergy the menu filter leaves out',
            orders: [guestOf(10, [LACTOSE.name])],
            menuAllergenIds: [PEANUTS.id],
            totalAffected: 0,
            totalPortions: 0,
            breakdown: []
        },
        {
            scenario: 'a guest ticket naming an allergy outside the catalogue',
            orders: [guestOf(10, ['Selleri'])],
            totalAffected: 0,
            totalPortions: 0,
            breakdown: []
        },
        {
            scenario: 'a guest ticket without allergies, booked by an allergic inhabitant',
            orders: [guestOf(10)],
            totalAffected: 0,
            totalPortions: 0,
            breakdown: []
        }
    ])('GIVEN $scenario', ({orders, menuAllergenIds, totalAffected, totalPortions, breakdown}) => {
        const result = () => computeAffectedDiners(orders, CATALOGUE, menuAllergenIds)

        it(`THEN counts ${totalAffected} diners and ${totalPortions} kuverter`, () => {
            expect(result()?.totalAffected ?? 0).toBe(totalAffected)
            expect(result()?.totalPortions ?? 0).toBe(totalPortions)
        })

        it('THEN lists each allergen once per diner', () => {
            expect(result()?.breakdownByAllergen.map(({name, count, portions}) => ({name, count, portions})) ?? []).toEqual(breakdown)
        })
    })

    it.each([
        {scenario: 'an empty menu filter', orders: ORDERS, menuAllergenIds: []},
        {scenario: 'no diner with a registered allergy', orders: [ORDERS[3]!], menuAllergenIds: undefined},
        {scenario: 'no diner matching the menu', orders: [ORDERS[1]!], menuAllergenIds: [PEANUTS.id]}
    ])('GIVEN $scenario THEN returns null', ({orders, menuAllergenIds}) => {
        expect(computeAffectedDiners(orders, CATALOGUE, menuAllergenIds)).toBeNull()
    })

    it('GIVEN the tickets of dinner 644 THEN the duplicated allergy row and the guest ticket count no extra kuverter', () => {
        const result = computeAffectedDiners(FIXTURE.tickets, FIXTURE_CATALOGUE)
        expect(result?.breakdownByAllergen.find(allergen => allergen.id === FIXTURE_MILK.id)?.portions).toBe(2)
        expect(result?.breakdownByAllergen.find(allergen => allergen.id === FIXTURE_NUTS.id)?.portions).toBe(1)
    })
})

describe('useAllergy.computeAllergenOverview', () => {
    const {computeAllergenOverview} = useAllergy()
    const SESAME: AllergyTypeDisplay = {...PEANUTS, id: 99, name: 'Sesam'}

    it.each([
        {
            allergens: 'two carried allergens around one nobody carries',
            orders: ORDERS,
            selection: [LACTOSE, SESAME, PEANUTS],
            totalPortions: 1.5,
            breakdown: [
                {...LACTOSE, portions: 1.5},
                {...SESAME, portions: 0},
                {...PEANUTS, portions: 1}
            ],
            diners: ['Anna', 'Bo', 'Cy']
        },
        {
            allergens: 'only an allergen nobody carries',
            orders: ORDERS,
            selection: [SESAME],
            totalPortions: 0,
            breakdown: [{...SESAME, portions: 0}],
            diners: []
        },
        {allergens: 'no allergens', orders: ORDERS, selection: [], totalPortions: 0, breakdown: [], diners: []},
        {
            allergens: 'the menu of dinner 644 on its tickets',
            orders: FIXTURE.tickets,
            selection: FIXTURE.allergens,
            totalPortions: 3,
            breakdown: [
                {...FIXTURE_MILK, portions: 2},
                {...FIXTURE_NUTS, portions: 1}
            ],
            diners: ['Diner 14', 'Diner 1', 'Diner 3']
        }
    ])('GIVEN $allergens THEN totals the kuverter and lists every allergen itself, its icon included, in the given order', ({orders, selection, totalPortions, breakdown, diners}) => {
        const overview = computeAllergenOverview(orders, selection)

        expect(overview.totalPortions).toBe(totalPortions)
        expect(overview.totalPortions).toBeGreaterThanOrEqual(Math.max(0, ...overview.breakdownByAllergen.map(allergen => allergen.portions)))
        expect(overview.breakdownByAllergen).toEqual(breakdown)
        expect(overview.affectedList.map(diner => diner.inhabitant.name)).toEqual(diners)
    })

    it('GIVEN the menu of dinner 644 THEN the kitchen panels split the chef total and each allergen by dining mode', () => {
        const {getActiveOrders, getReleasedOrders} = useOrder()
        const active = getActiveOrders(FIXTURE.tickets)
        const panels = [
            ...Object.values(DinnerMode).map(mode => active.filter(order => order.dinnerMode === mode)),
            getReleasedOrders(FIXTURE.tickets)
        ].map(orders => computeAllergenOverview(orders, FIXTURE.allergens))
        const chef = computeAllergenOverview(FIXTURE.tickets, FIXTURE.allergens)

        expect(panels.reduce((sum, panel) => sum + panel.totalPortions, 0)).toBe(chef.totalPortions)
        chef.breakdownByAllergen.forEach(({id, portions}) => {
            expect(panels.reduce((sum, panel) => sum + panel.breakdownByAllergen.find(allergen => allergen.id === id)!.portions, 0)).toBe(portions)
        })
    })
})
