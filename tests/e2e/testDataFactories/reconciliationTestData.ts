/**
 * Reconciliation Test Data Factory
 *
 * Provides test data for all 4 reconciliation outcomes (create/update/delete/idempotent)
 * for Households, Inhabitants, and Users.
 *
 * Shared between unit tests and E2E tests.
 */

import { addDays } from 'date-fns'
import { useCoreValidation } from '~/composables/useCoreValidation'
import type { HouseholdCreate, HouseholdDisplay, InhabitantCreate, InhabitantDisplay, UserCreate, UserDisplay } from '~/composables/useCoreValidation'
import testHelpers from '../testHelpers'

const { SystemRoleSchema, UserCreateSchema, InhabitantCreateSchema, InhabitantDisplaySchema, HouseholdDisplaySchema, UserDisplaySchema } = useCoreValidation()
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

const createInhabitantDisplayTestData = (
    heynaboId: number,
    name: string,
    lastName: string,
    pictureUrl: string | null,
    birthDate: Date | null
): InhabitantDisplay => InhabitantDisplaySchema.parse({
        id: heynaboId,
        heynaboId,
        householdId: 1, // stamped to the real household by createHouseholdDisplayTestData
        name,
        lastName,
        pictureUrl,
        birthDate
    })

const OLD_BIRTHDATE = new Date('1990-01-01')
const NEW_BIRTHDATE = new Date('1990-06-15')
const OLD_PICTURE = 'https://example.com/old.jpg'
const NEW_PICTURE = 'https://example.com/new.jpg'

// ========================================================================
// INHABITANT IMPORT PLAN TEST DATA (ADR-013)
//
// One plan per import. Heynabo owns member existence and address; TheSlope owns which
// household at the address holds the inhabitant. Buckets reuse PruneAndCreateResult:
// create/update/idempotent carry InhabitantCreate (member + target household),
// delete carries the existing InhabitantDisplay rows Heynabo no longer sends.
// ========================================================================

const ADDRESS_A = 42
const ADDRESS_B = 77

const createHouseholdDisplayTestData = (
    id: number,
    heynaboId: number,
    moveOutDate: Date | null,
    inhabitants: InhabitantDisplay[],
    movedInDate: Date = EXISTING_MOVED_IN
): HouseholdDisplay => HouseholdDisplaySchema.parse({
    id,
    heynaboId,
    pbsId: saltedId(id, TEST_SALT),
    name: `Household ${id}`,
    shortName: `H_${id}`,
    address: `Street ${heynaboId}`,
    movedInDate,
    moveOutDate,
    inhabitants: inhabitants.map(i => ({ ...i, householdId: id }))
})

/** The member as Heynabo sends them — optionally with changed Heynabo-owned data */
const asMember = (
    person: InhabitantDisplay,
    changes: Partial<Pick<InhabitantDisplay, 'name' | 'lastName' | 'pictureUrl' | 'birthDate'>> = {}
): Omit<InhabitantCreate, 'householdId'> => {
    const sent = { ...person, ...changes }
    return createInhabitantTestData(sent.heynaboId, sent.name, sent.lastName, sent.pictureUrl ?? null, sent.birthDate ?? null)
}

/** Heynabo's view of one address and the members living there */
const asAddress = (heynaboId: number, members: Array<Omit<InhabitantCreate, 'householdId'>>): HouseholdCreate => ({
    ...createHouseholdTestData(heynaboId, `Household ${heynaboId}`, `Street ${heynaboId}`),
    inhabitants: members
})

// Address A: the active family, and the moved-out family whose household is preserved
const ANNA = createInhabitantDisplayTestData(100, 'Anna', 'Aktiv', null, null)
const BENT = createInhabitantDisplayTestData(101, 'Bent', 'Aktiv', null, OLD_BIRTHDATE)
const CILLE = createInhabitantDisplayTestData(102, 'Cille', 'Fraflyttet', OLD_PICTURE, null)
const DITTE = createInhabitantDisplayTestData(103, 'Ditte', 'Fraflyttet', null, null)
const FREJA = createInhabitantDisplayTestData(104, 'Freja', 'Fraflyttet', null, null)
// Address B
const EJNAR = createInhabitantDisplayTestData(105, 'Ejnar', 'Flytter', null, null)
const KAREN = createInhabitantDisplayTestData(106, 'Karen', 'Bliver', null, null)
// Not in TheSlope yet
const GORM = createInhabitantTestData(107, 'Gorm', 'Ny', null, null)

const ACTIVE_AT_A = createHouseholdDisplayTestData(1, ADDRESS_A, null, [ANNA, BENT])
const MOVEDOUT_AT_A = createHouseholdDisplayTestData(2, ADDRESS_A, EXISTING_MOVED_OUT, [CILLE, DITTE, FREJA])
const ACTIVE_AT_B = createHouseholdDisplayTestData(3, ADDRESS_B, null, [EJNAR, KAREN])

// Future move-in at address A: the old family is LEAVING (future moveOutDate, still resident);
// the new family's household is FUTURE-MOVE-IN (future movedInDate, no moveOutDate).
// The resolver targets the future-move-in household for members it doesn't hold yet.
const FUTURE_MOVE_OUT = addDays(new Date(), 30)
const FUTURE_MOVE_IN = addDays(new Date(), 31)
const LEAVING_AT_A = createHouseholdDisplayTestData(4, ADDRESS_A, FUTURE_MOVE_OUT, [CILLE, DITTE])
const FUTURE_MOVEIN_AT_A = createHouseholdDisplayTestData(5, ADDRESS_A, null, [], FUTURE_MOVE_IN)

const ACTIVE_FAMILY_AS_SENT = [asMember(ANNA), asMember(BENT)]
const MOVEDOUT_FAMILY_AS_SENT = [asMember(CILLE), asMember(DITTE), asMember(FREJA)]

// expected pairs: [inhabitant heynaboId, target household id]
export const inhabitantImportPlanScenarios = [
    {
        scenario: 'GIVEN a member unknown to TheSlope THEN they are created in the active household at their address',
        incoming: [asAddress(ADDRESS_A, [...ACTIVE_FAMILY_AS_SENT, GORM])],
        existing: [ACTIVE_AT_A],
        expected: {
            create: [[GORM.heynaboId, ACTIVE_AT_A.id]],
            update: [],
            idempotent: [[ANNA.heynaboId, ACTIVE_AT_A.id], [BENT.heynaboId, ACTIVE_AT_A.id]],
            delete: []
        }
    },
    {
        scenario: 'GIVEN Heynabo changed member data THEN the inhabitant is updated in the household they live in',
        incoming: [asAddress(ADDRESS_A, [asMember(ANNA), asMember(BENT, { lastName: 'NytEfternavn', birthDate: NEW_BIRTHDATE })])],
        existing: [ACTIVE_AT_A],
        expected: {
            create: [],
            update: [[BENT.heynaboId, ACTIVE_AT_A.id]],
            idempotent: [[ANNA.heynaboId, ACTIVE_AT_A.id]],
            delete: []
        }
    },
    {
        scenario: 'GIVEN previous inhabitants in the moved-out household, unchanged THEN they stay there',
        incoming: [asAddress(ADDRESS_A, [...ACTIVE_FAMILY_AS_SENT, ...MOVEDOUT_FAMILY_AS_SENT])],
        existing: [ACTIVE_AT_A, MOVEDOUT_AT_A],
        expected: {
            create: [],
            update: [],
            idempotent: [
                [ANNA.heynaboId, ACTIVE_AT_A.id], [BENT.heynaboId, ACTIVE_AT_A.id],
                [CILLE.heynaboId, MOVEDOUT_AT_A.id], [DITTE.heynaboId, MOVEDOUT_AT_A.id], [FREJA.heynaboId, MOVEDOUT_AT_A.id]
            ],
            delete: []
        }
    },
    {
        scenario: 'GIVEN a previous inhabitant with changed data THEN they are updated in the moved-out household, NOT moved to the active one',
        incoming: [asAddress(ADDRESS_A, [...ACTIVE_FAMILY_AS_SENT, asMember(CILLE, { pictureUrl: NEW_PICTURE }), asMember(DITTE), asMember(FREJA)])],
        existing: [ACTIVE_AT_A, MOVEDOUT_AT_A],
        expected: {
            create: [],
            update: [[CILLE.heynaboId, MOVEDOUT_AT_A.id]],
            idempotent: [
                [ANNA.heynaboId, ACTIVE_AT_A.id], [BENT.heynaboId, ACTIVE_AT_A.id],
                [DITTE.heynaboId, MOVEDOUT_AT_A.id], [FREJA.heynaboId, MOVEDOUT_AT_A.id]
            ],
            delete: []
        }
    },
    {
        scenario: 'GIVEN a leaving family and a future move-in household at one address THEN newcomers are created in the future-move-in household and the leaving family stays in theirs',
        incoming: [asAddress(ADDRESS_A, [asMember(CILLE), asMember(DITTE), GORM])],
        existing: [LEAVING_AT_A, FUTURE_MOVEIN_AT_A],
        expected: {
            create: [[GORM.heynaboId, FUTURE_MOVEIN_AT_A.id]],
            update: [],
            idempotent: [[CILLE.heynaboId, LEAVING_AT_A.id], [DITTE.heynaboId, LEAVING_AT_A.id]],
            delete: []
        }
    },
    {
        scenario: 'GIVEN Heynabo moved a member to another address THEN they are re-homed to the active household there and NOT deleted',
        incoming: [asAddress(ADDRESS_A, [...ACTIVE_FAMILY_AS_SENT, asMember(EJNAR)]), asAddress(ADDRESS_B, [asMember(KAREN)])],
        existing: [ACTIVE_AT_A, ACTIVE_AT_B],
        expected: {
            create: [],
            update: [[EJNAR.heynaboId, ACTIVE_AT_A.id]],
            idempotent: [[ANNA.heynaboId, ACTIVE_AT_A.id], [BENT.heynaboId, ACTIVE_AT_A.id], [KAREN.heynaboId, ACTIVE_AT_B.id]],
            delete: []
        }
    },
    {
        scenario: 'GIVEN a member deleted in Heynabo THEN the inhabitant is deleted — also from the moved-out household',
        incoming: [asAddress(ADDRESS_A, [...ACTIVE_FAMILY_AS_SENT, asMember(CILLE), asMember(DITTE)])],
        existing: [ACTIVE_AT_A, MOVEDOUT_AT_A],
        expected: {
            create: [],
            update: [],
            idempotent: [
                [ANNA.heynaboId, ACTIVE_AT_A.id], [BENT.heynaboId, ACTIVE_AT_A.id],
                [CILLE.heynaboId, MOVEDOUT_AT_A.id], [DITTE.heynaboId, MOVEDOUT_AT_A.id]
            ],
            delete: [FREJA.heynaboId]
        }
    },
    {
        scenario: 'GIVEN the whole moved-out family deleted in Heynabo THEN all are deleted and the active family is untouched',
        incoming: [asAddress(ADDRESS_A, ACTIVE_FAMILY_AS_SENT)],
        existing: [ACTIVE_AT_A, MOVEDOUT_AT_A],
        expected: {
            create: [],
            update: [],
            idempotent: [[ANNA.heynaboId, ACTIVE_AT_A.id], [BENT.heynaboId, ACTIVE_AT_A.id]],
            delete: [CILLE.heynaboId, DITTE.heynaboId, FREJA.heynaboId]
        }
    },
    {
        scenario: 'GIVEN an address TheSlope does not hold yet THEN its members are not routed (households are created before the plan)',
        incoming: [asAddress(ADDRESS_A, ACTIVE_FAMILY_AS_SENT), asAddress(999, [GORM])],
        existing: [ACTIVE_AT_A],
        expected: {
            create: [],
            update: [],
            idempotent: [[ANNA.heynaboId, ACTIVE_AT_A.id], [BENT.heynaboId, ACTIVE_AT_A.id]],
            delete: []
        }
    },
    {
        scenario: 'GIVEN Heynabo sends no members THEN every inhabitant is deleted (Heynabo is the backend)',
        incoming: [asAddress(ADDRESS_A, [])],
        existing: [ACTIVE_AT_A, MOVEDOUT_AT_A],
        expected: {
            create: [],
            update: [],
            idempotent: [],
            delete: [ANNA.heynaboId, BENT.heynaboId, CILLE.heynaboId, DITTE.heynaboId, FREJA.heynaboId]
        }
    },
    {
        scenario: 'GIVEN nothing on either side THEN the plan is empty',
        incoming: [],
        existing: [],
        expected: { create: [], update: [], idempotent: [], delete: [] }
    }
]

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
