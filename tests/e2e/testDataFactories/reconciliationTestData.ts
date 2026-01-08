/**
 * Reconciliation Test Data Factory
 *
 * Provides test data for all 4 reconciliation outcomes (create/update/delete/idempotent)
 * for Households, Inhabitants, and Users.
 *
 * Shared between unit tests and E2E tests.
 */

import { useCoreValidation } from '~/composables/useCoreValidation'
import type { HouseholdCreate, InhabitantCreate, UserCreate, UserDisplay } from '~/composables/useCoreValidation'
import testHelpers from '../testHelpers'

const { SystemRoleSchema, UserCreateSchema, InhabitantCreateSchema, UserDisplaySchema } = useCoreValidation()
const SystemRole = SystemRoleSchema.enum
const InhabitantDataSchema = InhabitantCreateSchema.omit({ householdId: true })

const { saltedId } = testHelpers

// ========================================================================
// HOUSEHOLD TEST DATA
// ========================================================================

const createHouseholdTestData = (
    heynaboId: number,
    name: string,
    address: string,
    theSlopeOverrides?: { pbsId?: number, movedInDate?: Date, moveOutDate?: Date }
): HouseholdCreate => ({
    heynaboId,
    pbsId: theSlopeOverrides?.pbsId ?? heynaboId,
    name,
    address,
    movedInDate: theSlopeOverrides?.movedInDate ?? new Date('2024-01-01'),
    moveOutDate: theSlopeOverrides?.moveOutDate,
    inhabitants: []
})

// Stable salt for reproducible test data
const TEST_SALT = 'reconciliation-test'
const EXISTING_MOVED_IN = new Date('2020-06-15')
const EXISTING_MOVED_OUT = new Date('2024-12-31')

/**
 * Household reconciliation test data covering all 4 outcomes.
 * Existing households have TheSlope-enriched values (unique pbsId, movedInDate, moveOutDate).
 * Incoming households have defaults (pbsId=heynaboId).
 */
export const householdReconciliationTestData = {
    existing: [
        createHouseholdTestData(1, 'Unchanged Household', 'Unchanged Street 1', { pbsId: saltedId(1000, TEST_SALT), movedInDate: EXISTING_MOVED_IN }),
        createHouseholdTestData(2, 'Old Name', 'Same Address 2', { pbsId: saltedId(2000, TEST_SALT), movedInDate: EXISTING_MOVED_IN, moveOutDate: EXISTING_MOVED_OUT }),
        createHouseholdTestData(3, 'To Be Deleted', 'Deleted Street 3', { pbsId: saltedId(3000, TEST_SALT), movedInDate: EXISTING_MOVED_IN })
    ],
    incoming: [
        createHouseholdTestData(1, 'Unchanged Household', 'Unchanged Street 1'),
        createHouseholdTestData(2, 'New Name', 'Same Address 2'),
        createHouseholdTestData(4, 'New Household', 'New Street 4')
    ],
    expected: {
        idempotent: { count: 1, heynaboIds: [1] },
        update: { count: 1, heynaboIds: [2] },
        delete: { count: 1, heynaboIds: [3] },
        create: { count: 1, heynaboIds: [4] }
    }
}

// ========================================================================
// INHABITANT & USER FACTORIES - Schema validated
// ========================================================================

const createUserTestData = (email: string, phone: string | null, isAdmin: boolean, isAllergyManager = false): UserCreate =>
    UserCreateSchema.parse({
        email,
        phone,
        passwordHash: 'removeme',
        systemRoles: [isAdmin && SystemRole.ADMIN, isAllergyManager && SystemRole.ALLERGYMANAGER].filter(Boolean)
    })

const createInhabitantTestData = (
    heynaboId: number,
    name: string,
    lastName: string,
    pictureUrl: string | null,
    birthDate: Date | null,
    user?: UserCreate
): Omit<InhabitantCreate, 'householdId'> => InhabitantDataSchema.parse({
        heynaboId,
        name,
        lastName,
        pictureUrl,
        birthDate,
        user
    })

const OLD_BIRTHDATE = new Date('1990-01-01')
const NEW_BIRTHDATE = new Date('1990-06-15')
const OLD_PICTURE = 'https://example.com/old.jpg'
const NEW_PICTURE = 'https://example.com/new.jpg'

export const inhabitantReconciliationTestData = {
    existing: [
        createInhabitantTestData(101, 'Anna', 'Unchanged', null, null, createUserTestData('anna@test.dk', '+4511111111', false)),
        createInhabitantTestData(102, 'Erik', 'OldLastName', null, null),
        createInhabitantTestData(103, 'To Be', 'Deleted', null, null),
        createInhabitantTestData(105, 'Email', 'Changer', null, null, createUserTestData('old-email@test.dk', '+4566666666', false)),
        createInhabitantTestData(106, 'Allergy', 'Manager', null, null, createUserTestData('allergy@test.dk', '+4577777777', false, true)),
        createInhabitantTestData(107, 'Picture', 'Changer', OLD_PICTURE, null),
        createInhabitantTestData(108, 'Birthdate', 'Changer', null, OLD_BIRTHDATE)
    ],
    incoming: [
        createInhabitantTestData(101, 'Anna', 'Unchanged', null, null, createUserTestData('anna@test.dk', '+4511111111', false)),
        createInhabitantTestData(102, 'Erik', 'NewLastName', null, null),
        createInhabitantTestData(104, 'New', 'Person', null, null),
        createInhabitantTestData(105, 'Email', 'Changer', null, null, createUserTestData('new-email@test.dk', '+4566666666', false)),
        createInhabitantTestData(106, 'Allergy', 'Manager', null, null, createUserTestData('allergy@test.dk', '+4577777777', false, false)),
        createInhabitantTestData(107, 'Picture', 'Changer', NEW_PICTURE, null),
        createInhabitantTestData(108, 'Birthdate', 'Changer', null, NEW_BIRTHDATE)
    ],
    expected: {
        idempotent: { count: 3, heynaboIds: [101, 105, 106] },
        update: { count: 3, heynaboIds: [102, 107, 108] },
        delete: { count: 1, heynaboIds: [103] },
        create: { count: 1, heynaboIds: [104] }
    }
}

// ========================================================================
// USER RECONCILIATION TEST DATA
// Existing: UserDisplay (as returned by fetchUsers)
// Incoming: InhabitantData with user (as returned by Heynabo import)
// ========================================================================

const createUserDisplayTestData = (
    heynaboId: number,
    name: string,
    lastName: string,
    birthDate: Date | null,
    email: string,
    phone: string | null,
    isAdmin: boolean,
    isAllergyManager = false
): UserDisplay => UserDisplaySchema.parse({
    id: heynaboId, // Use heynaboId as id for test simplicity
    email,
    phone,
    systemRoles: [isAdmin && SystemRole.ADMIN, isAllergyManager && SystemRole.ALLERGYMANAGER].filter(Boolean),
    createdAt: new Date(),
    updatedAt: new Date(),
    Inhabitant: { id: heynaboId, heynaboId, householdId: 1, name, lastName, pictureUrl: null, birthDate }
})

export const userReconciliationTestData = {
    existing: [
        createUserDisplayTestData(201, 'Unchanged', 'User', null, 'unchanged@test.dk', '+4511111111', false),
        createUserDisplayTestData(202, 'Allergy', 'Manager', null, 'allergymanager@test.dk', '+4588888888', false, true),
        createUserDisplayTestData(203, 'Phone', 'Changer', null, 'phone@test.dk', '+4522222222', false),
        createUserDisplayTestData(204, 'Admin', 'Demoted', null, 'admin@test.dk', '+4544444444', true),
        createUserDisplayTestData(205, 'Email', 'Changer', null, 'old-email@test.dk', '+4577777777', false),
        createUserDisplayTestData(206, 'To Be', 'Deleted', null, 'delete@test.dk', '+4533333333', false),
        createUserDisplayTestData(208, 'Unchanged', 'WithBirthdate', OLD_BIRTHDATE, 'birthdate@test.dk', '+4599999999', false),
        createUserDisplayTestData(209, 'Phone', 'NullVsEmpty', null, 'nullphone@test.dk', null, false)
    ],
    incoming: [
        createInhabitantTestData(201, 'Unchanged', 'User', null, null, createUserTestData('unchanged@test.dk', '+4511111111', false)),
        createInhabitantTestData(202, 'Allergy', 'Manager', null, null, createUserTestData('allergymanager@test.dk', '+4588888888', false, false)),
        createInhabitantTestData(203, 'Phone', 'Changer', null, null, createUserTestData('phone@test.dk', '+4599999999', false)),
        createInhabitantTestData(204, 'Admin', 'Demoted', null, null, createUserTestData('admin@test.dk', '+4544444444', false)),
        createInhabitantTestData(205, 'Email', 'Changer', null, null, createUserTestData('new-email@test.dk', '+4577777777', false)),
        createInhabitantTestData(207, 'New', 'User', null, null, createUserTestData('create@test.dk', '+4555555555', false)),
        createInhabitantTestData(208, 'Unchanged', 'WithBirthdate', null, NEW_BIRTHDATE, createUserTestData('birthdate@test.dk', '+4599999999', false)),
        createInhabitantTestData(209, 'Phone', 'NullVsEmpty', null, null, createUserTestData('nullphone@test.dk', '', false))
    ],
    expected: {
        idempotent: { count: 4, heynaboIds: [201, 202, 208, 209] },
        update: { count: 3, heynaboIds: [203, 204, 205] },
        delete: { count: 1, heynaboIds: [206] },
        create: { count: 1, heynaboIds: [207] }
    }
}
