/**
 * Unit tests for domain fragments
 * Validates that fragments parse factory data correctly and support extension pattern
 */

import {describe, it, expect} from 'vitest'
import {z} from 'zod'
import {
    UserFragmentSchema,
    InhabitantFragmentSchema,
    HouseholdFragmentSchema,
    SeasonFragmentSchema,
    CookingTeamFragmentSchema,
    DinnerEventFragmentSchema,
    OrderFragmentSchema,
    TicketPriceFragmentSchema,
    AllergyTypeFragmentSchema
} from '~/composables/fragments/domainFragments'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import {DinnerEventFactory} from '~~/tests/e2e/testDataFactories/dinnerEventFactory'
import {OrderFactory} from '~~/tests/e2e/testDataFactories/orderFactory'
import {TicketFactory} from '~~/tests/e2e/testDataFactories/ticketFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'

// ============================================================================
// CORE DOMAIN FRAGMENTS
// ============================================================================

describe('UserFragmentSchema', () => {
    it('should parse default user from factory', () => {
        const user = {...UserFactory.defaultUser(), id: 1}
        const result = UserFragmentSchema.parse(user)

        expect(result.id).toBe(user.id)
        expect(result.email).toBe(user.email)
        expect(result.systemRoles).toEqual(user.systemRoles)
    })

    it('should support fragment extension pattern', () => {
        const ExtendedUserSchema = UserFragmentSchema.extend({
            passwordHash: z.string()
        })

        const user = {...UserFactory.defaultUser(), id: 1}
        const result = ExtendedUserSchema.parse(user)

        expect(result.passwordHash).toBe(user.passwordHash)
        expect(result.email).toBe(user.email)
    })
})

describe('InhabitantFragmentSchema', () => {
    it('should parse default inhabitant from factory', () => {
        const inhabitant = {...HouseholdFactory.defaultInhabitantData(), id: 1}
        const result = InhabitantFragmentSchema.parse(inhabitant)

        expect(result.id).toBe(inhabitant.id)
        expect(result.name).toBe(inhabitant.name)
        expect(result.lastName).toBe(inhabitant.lastName)
    })

    it('should support fragment extension pattern', () => {
        const ExtendedInhabitantSchema = InhabitantFragmentSchema.extend({
            householdId: z.number()
        })

        const inhabitant = {...HouseholdFactory.defaultInhabitantData(), id: 1, householdId: 42}
        const result = ExtendedInhabitantSchema.parse(inhabitant)

        expect(result.householdId).toBe(42)
    })
})

describe('HouseholdFragmentSchema', () => {
    it('should parse default household from factory', () => {
        const household = {...HouseholdFactory.defaultHouseholdData(), id: 1}
        const result = HouseholdFragmentSchema.parse(household)

        expect(result.id).toBe(household.id)
        expect(result.name).toBe(household.name)
        expect(result.movedInDate).toBeInstanceOf(Date)
    })
})

// ============================================================================
// PLANNING DOMAIN FRAGMENTS
// ============================================================================

describe('SeasonFragmentSchema', () => {
    it('should parse default season from factory', () => {
        const season = {...SeasonFactory.defaultSeason(), id: 1}
        const result = SeasonFragmentSchema.parse(season)

        expect(result.id).toBe(season.id)
        expect(result.shortName).toBe(season.shortName)
        expect(result.isActive).toBe(season.isActive)
    })
})

describe('CookingTeamFragmentSchema', () => {
    it('should parse default cooking team from factory', () => {
        const team = {...SeasonFactory.defaultCookingTeam(), id: 1}
        const result = CookingTeamFragmentSchema.parse(team)

        expect(result.id).toBe(team.id)
        expect(result.name).toBe(team.name)
        expect(result.seasonId).toBe(team.seasonId)
    })
})

describe('DinnerEventFragmentSchema', () => {
    it('should parse default dinner event from factory', () => {
        const dinnerEvent = DinnerEventFactory.defaultDinnerEventDisplay()
        const result = DinnerEventFragmentSchema.parse(dinnerEvent)

        expect(result.id).toBe(dinnerEvent.id)
        expect(result.date).toBeInstanceOf(Date)
        expect(result.menuTitle).toBe(dinnerEvent.menuTitle)
    })
})

// ============================================================================
// BOOKING DOMAIN FRAGMENTS
// ============================================================================

describe('OrderFragmentSchema', () => {
    it('should parse default order from factory', () => {
        const order = OrderFactory.defaultOrder()
        const result = OrderFragmentSchema.parse(order)

        expect(result.id).toBe(order.id)
        expect(result.dinnerEventId).toBe(order.dinnerEventId)
        expect(result.inhabitantId).toBe(order.inhabitantId)
        expect(result.state).toBe(order.state)
    })
})

describe('TicketPriceFragmentSchema', () => {
    it('should parse default ticket price from factory', () => {
        const ticketPrices = TicketFactory.defaultTicketPrices({seasonId: 1})
        const ticketPrice = {...ticketPrices[0], id: 1}
        const result = TicketPriceFragmentSchema.parse(ticketPrice)

        expect(result.id).toBe(ticketPrice.id)
        expect(result.price).toBe(ticketPrice.price)
        expect(result.ticketType).toBe(ticketPrice.ticketType)
    })
})

// ============================================================================
// HEALTH DOMAIN FRAGMENTS
// ============================================================================

describe('AllergyTypeFragmentSchema', () => {
    it('should parse default allergy type from factory', () => {
        const allergyType = {...AllergyFactory.defaultAllergyTypeData(), id: 1}
        const result = AllergyTypeFragmentSchema.parse(allergyType)

        expect(result.id).toBe(allergyType.id)
        expect(result.name).toBe(allergyType.name)
        expect(result.description).toBe(allergyType.description)
    })
})

// ============================================================================
// FRAGMENT PATTERN VALIDATION
// ============================================================================

describe('Fragment Pattern - Cross-domain reuse', () => {
    it('should allow same fragment to be extended differently by different domains', () => {
        // Domain 1: Household context - extends with householdId
        const HouseholdInhabitantSchema = InhabitantFragmentSchema.extend({
            householdId: z.number()
        })

        // Domain 2: User context - extends with userId
        const UserInhabitantSchema = InhabitantFragmentSchema.extend({
            userId: z.number().nullable().optional()
        })

        const coreData = {...HouseholdFactory.defaultInhabitantData(), id: 1}

        // Both domains parse core data successfully
        const householdResult = HouseholdInhabitantSchema.parse({
            ...coreData,
            householdId: 42
        })
        const userResult = UserInhabitantSchema.parse({
            ...coreData,
            userId: 123
        })

        expect(householdResult.name).toBe(coreData.name)
        expect(userResult.name).toBe(coreData.name)
        expect(householdResult.householdId).toBe(42)
        expect(userResult.userId).toBe(123)
    })
})