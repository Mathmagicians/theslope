import {describe, it, expect} from 'vitest'
import {useAllergy} from '~/composables/useAllergy'
import {useBookingValidation} from '~/composables/useBookingValidation'
import type {OrderDetail} from '~/composables/useBookingValidation'
import type {AllergyTypeDisplay} from '~/composables/useAllergyValidation'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

const {TicketTypeSchema} = useBookingValidation()
const TicketType = TicketTypeSchema.enum

const [PEANUTS, LACTOSE] = AllergyFactory.createMockAllergyTypes() as [AllergyTypeDisplay, AllergyTypeDisplay]

// Adult 1 kuv., child 0,5, baby 0 - the kitchen panel's portion weights
const ORDERS: OrderDetail[] = [
    OrderFactory.defaultOrderDetailWithAllergies(1, 'Anna', [PEANUTS, LACTOSE], {ticketType: TicketType.ADULT}),
    OrderFactory.defaultOrderDetailWithAllergies(2, 'Bo', [LACTOSE], {ticketType: TicketType.CHILD}),
    OrderFactory.defaultOrderDetailWithAllergies(3, 'Cy', [PEANUTS], {ticketType: TicketType.BABY}),
    OrderFactory.defaultOrderDetailWithAllergies(4, 'Dan', [], {ticketType: TicketType.ADULT})
]

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
        const result = () => computeAffectedDiners(ORDERS, menuAllergenIds)

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

    it.each([
        {scenario: 'an empty menu filter', orders: ORDERS, menuAllergenIds: []},
        {scenario: 'no diner with a registered allergy', orders: [ORDERS[3]!], menuAllergenIds: undefined},
        {scenario: 'no diner matching the menu', orders: [ORDERS[1]!], menuAllergenIds: [PEANUTS.id]}
    ])('GIVEN $scenario THEN returns null', ({orders, menuAllergenIds}) => {
        expect(computeAffectedDiners(orders, menuAllergenIds)).toBeNull()
    })
})

describe('useAllergy.computeAllergenOverview', () => {
    const {computeAllergenOverview} = useAllergy()
    const SESAME: AllergyTypeDisplay = {...PEANUTS, id: 99, name: 'Sesam'}

    it.each([
        {
            allergens: 'two carried allergens around one nobody carries',
            selection: [LACTOSE, SESAME, PEANUTS],
            totalPortions: 1.5,
            breakdown: [
                {name: LACTOSE.name, portions: 1.5},
                {name: SESAME.name, portions: 0},
                {name: PEANUTS.name, portions: 1}
            ],
            diners: ['Anna', 'Bo', 'Cy']
        },
        {
            allergens: 'only an allergen nobody carries',
            selection: [SESAME],
            totalPortions: 0,
            breakdown: [{name: SESAME.name, portions: 0}],
            diners: []
        },
        {allergens: 'no allergens', selection: [], totalPortions: 0, breakdown: [], diners: []}
    ])('GIVEN $allergens THEN totals the kuverter and lists every allergen in the given order', ({selection, totalPortions, breakdown, diners}) => {
        const overview = computeAllergenOverview(ORDERS, selection)

        expect(overview.totalPortions).toBe(totalPortions)
        expect(overview.breakdownByAllergen.map(({name, portions}) => ({name, portions}))).toEqual(breakdown)
        expect(overview.affectedList.map(diner => diner.inhabitant.name)).toEqual(diners)
    })
})
