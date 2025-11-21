import type {D1Database} from '@cloudflare/workers-types'
import {Prisma as PrismaFromClient, Prisma} from "@prisma/client"
import eventHandlerHelper from "../utils/eventHandlerHelper"
import {getPrismaClientConnection} from "../utils/database"

import type {Season} from "~/composables/useSeasonValidation"
import {useSeasonValidation} from "~/composables/useSeasonValidation"
import {useTicketPriceValidation} from "~/composables/useTicketPriceValidation"
import type {
    InhabitantCreate,
    InhabitantUpdate,
    InhabitantDetail,
    HouseholdCreate,
    HouseholdDisplay,
    HouseholdDetail,
    SystemRole,
    UserCreate,
    UserDisplay,
    UserDetail
} from '~/composables/useCoreValidation'
import {getHouseholdShortName, useCoreValidation} from '~/composables/useCoreValidation'
import type {
    CookingTeamDisplay,
    CookingTeamDetail,
    CookingTeamCreate,
    CookingTeamUpdate,
    CookingTeamAssignment,
    CookingTeamAssignmentCreate
} from '~/composables/useCookingTeamValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'

// ADR-010: Use domain types from composables, not Prisma types
// Repository transforms Prisma results to domain types before returning

const {h3eFromCatch} = eventHandlerHelper

/*** USERS ***/

// Get serialization utilities
const {serializeUserInput, deserializeUser, mergeUserRoles} = useCoreValidation()

export async function saveUser(d1Client: D1Database, user: UserCreate): Promise<UserDetail> {
    console.info(`🪪 > USER > [SAVE] Saving user ${user.email}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Check if user exists to merge roles
        const existingUser = await prisma.user.findUnique({
            where: {email: user.email}
        })

        let userToSave = user

        // If user exists, merge systemRoles instead of overwriting
        if (existingUser) {
            const existingDomain = deserializeUser(existingUser)
            userToSave = mergeUserRoles(existingDomain, user)
            console.info(`🪪 > USER > [SAVE] Merging roles for existing user ${user.email}: [${existingDomain.systemRoles}] + [${user.systemRoles}] = [${userToSave.systemRoles}]`)
        }

        // Serialize before writing to DB (ADR-010 pattern)
        const serializedUser = serializeUserInput(userToSave)
        const newUser = await prisma.user.upsert({
            where: {email: user.email},
            create: serializedUser,
            update: serializedUser
        })
        console.info(`🪪 > USER > [SAVE] Successfully saved user ${newUser.email} with ID ${newUser.id}`)

        // ADR-009: Return UserDetail with Inhabitant: null (no relation fetched for mutation)
        const deserialized = deserializeUser(newUser)
        return {
            ...deserialized,
            Inhabitant: null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving user ${user.email}`, error)
        console.error(`🪪 > USER > [SAVE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}


// Shared select clause for UserDisplay - ADR-009: lightweight relations
const USER_DISPLAY_SELECT = {
    id: true,
    email: true,
    phone: true,
    systemRoles: true,
    createdAt: true,
    updatedAt: true,
    Inhabitant: {
        select: {
            id: true,
            heynaboId: true,
            name: true,
            lastName: true,
            pictureUrl: true,
            birthDate: true
        }
    }
} as const

type UserWithInhabitantPayload = Prisma.UserGetPayload<{
    select: typeof USER_DISPLAY_SELECT
}>

// Shared deserialization logic for UserDisplay
function deserializeToUserDisplay(user: UserWithInhabitantPayload): UserDisplay {
    const {UserDisplaySchema} = useCoreValidation()

    // Let the schema do ALL the work - parse systemRoles JSON, validate fields, transform dates
    const userDisplay = {
        ...user,
        systemRoles: JSON.parse(user.systemRoles) // Only deserialize systemRoles from JSON
    }

    // Schema validation with z.coerce.date() handles date conversion and all other transformations
    return UserDisplaySchema.parse(userDisplay)
}

export async function fetchUsers(d1Client: D1Database): Promise<UserDisplay[]> {
    console.info(`🪪 > USER > [GET] Fetching users from database`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // ADR-009: Include lightweight Inhabitant relation for display
        const users = await prisma.user.findMany({
            select: USER_DISPLAY_SELECT
        })

        // Deserialize systemRoles from JSON string to array (ADR-010 pattern)
        const deserializedUsers = users.map(deserializeToUserDisplay)

        console.info(`🪪 > USER > [GET] Successfully fetched ${deserializedUsers.length} users`)
        return deserializedUsers
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching users', error)
        console.error(`🪪 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchUsersByRole(d1Client: D1Database, systemRole: SystemRole): Promise<UserDisplay[]> {
    console.info(`🪪 > USER > [GET] Fetching users with role ${systemRole}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Query users where systemRoles JSON array contains the specified role
        const users = await prisma.user.findMany({
            where: {
                systemRoles: {
                    contains: systemRole
                }
            },
            select: USER_DISPLAY_SELECT
        })

        // Deserialize systemRoles from JSON string to array (ADR-010 pattern)
        const deserializedUsers = users.map(deserializeToUserDisplay)

        console.info(`🪪 > USER > [GET] Successfully fetched ${deserializedUsers.length} users with role ${systemRole}`)
        return deserializedUsers
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching users with role ${systemRole}`, error)
        console.error(`🪪 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteUser(d1Client: D1Database, userId: number): Promise<UserDetail> {
    console.info(`🪪 > USER > [DELETE] Deleting user with ID ${userId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const deletedUser = await prisma.user.delete({
            where: {id: userId}
        })

        console.info(`🪪 > USER > [DELETE] Successfully deleted user ${deletedUser.email}`)

        // ADR-009: Return UserDetail with Inhabitant: null (no relation fetched for mutation)
        const deserialized = deserializeUser(deletedUser)
        return {
            ...deserialized,
            Inhabitant: null
        }
    } catch (error) {
        const h3e = h3eFromCatch('Error deleting user', error)
        console.error(`🪪 > USER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchUser(email: string, d1Client: D1Database): Promise<UserDetail | null> {
    console.info(`🪪 > USER > [GET] Fetching user for email ${email}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeUserWithInhabitant} = useCoreValidation()

    try {
        const user = await prisma.user.findUnique({
            where: {email},
            include: {
                Inhabitant: {
                    include: { household: true }
                }
            }
        })

        if (user) {
            console.info(`🪪 > USER > [GET] Successfully fetched user with ID ${user.id} for email ${email}`)

            // Log inhabitant info (simplified to avoid nested template literals)
            const inhabitantInfo = user.Inhabitant
                ? `id=${user.Inhabitant.id}, household=${user.Inhabitant.household?.id ?? 'NULL'}`
                : 'NULL'
            console.info(`🪪 > USER > [GET] Inhabitant: ${inhabitantInfo}`)

            // Use composable deserialization function (ADR-010)
            return deserializeUserWithInhabitant(user)
        } else {
            console.info(`🪪 > USER > [GET] No user found for email ${email}`)
        }
        return null
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching user for email ${email}`, error)
        console.error(`🪪 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** INHABITANTS ***/

export async function saveInhabitant(d1Client: D1Database, inhabitant: InhabitantCreate, householdId: number): Promise<InhabitantDetail> {
    console.info(`👩‍🏠 > INHABITANT > [SAVE] Saving inhabitant ${inhabitant.name} to household ${householdId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeInhabitant} = useCoreValidation()

    try {
        const data = {
            heynaboId: inhabitant.heynaboId,
            pictureUrl: inhabitant.pictureUrl,
            name: inhabitant.name,
            lastName: inhabitant.lastName,
            birthDate: inhabitant.birthDate,
            user: PrismaFromClient.skip,
            household: {
                connect: {id: householdId}
            }
        }

        const newInhabitant = await prisma.inhabitant.upsert({
            where: {heynaboId: inhabitant.heynaboId},
            create: data,
            update: data
        })
        console.info(`👩‍🏠 > INHABITANT > [SAVE] Successfully saved inhabitant ${inhabitant.name} with ID ${newInhabitant.id}`)

        if (inhabitant.user) {
            const newUser = await saveUser(d1Client, inhabitant.user)
            const updatedInhabitant = await prisma.inhabitant.update({
                where: {id: newInhabitant.id},
                data: {
                    user: {
                        connect: {id: newUser.id}
                    }
                }
            })
            console.info(`👩‍🏠 > INHABITANT > [SAVE] Associated user profile for ${inhabitant.name} in household ${householdId}`)
            // ADR-010: Deserialize to domain type before returning
            return deserializeInhabitant(updatedInhabitant)
        } else {
            console.info(`👩‍🏠 > INHABITANT > [SAVE] Inhabitant ${inhabitant.name} saved without user profile`)
        }

        // ADR-010: Deserialize to domain type before returning
        return deserializeInhabitant(newInhabitant)
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving inhabitant ${inhabitant.name} to household ${householdId}`, error)
        console.error(`👩‍🏠 > INHABITANT > [SAVE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchInhabitants(d1Client: D1Database): Promise<InhabitantDetail[]> {
    console.info(`👩‍🏠 > INHABITANT > [GET] Fetching inhabitants`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeWeekDayMap} = useCoreValidation()

    try {
        const inhabitants = await prisma.inhabitant.findMany()

        // ADR-010: Deserialize database format to domain format
        const deserializedInhabitants = inhabitants.map(inhabitant => ({
            ...inhabitant,
            birthDate: inhabitant.birthDate ? new Date(inhabitant.birthDate) : null,
            dinnerPreferences: inhabitant.dinnerPreferences
                ? deserializeWeekDayMap(inhabitant.dinnerPreferences)
                : null
        }))

        console.info(`👩‍🏠 > INHABITANT > [GET] Successfully fetched ${inhabitants.length} inhabitants`)
        return deserializedInhabitants
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching inhabitants', error)
        console.error(`👩‍🏠 > INHABITANT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchInhabitant(d1Client: D1Database, id: number): Promise<InhabitantDetail | null> {
    console.info(`👩‍🏠 > INHABITANT > [GET] Fetching inhabitant with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeWeekDayMap} = useCoreValidation()

    try {
        const inhabitant = await prisma.inhabitant.findFirst({
            where: {id}
        })

        if (!inhabitant) return null

        // ADR-010: Deserialize database format to domain format
        const deserializedInhabitant = {
            ...inhabitant,
            birthDate: inhabitant.birthDate ? new Date(inhabitant.birthDate) : null,
            dinnerPreferences: inhabitant.dinnerPreferences
                ? deserializeWeekDayMap(inhabitant.dinnerPreferences)
                : null
        }

        console.info(`👩‍🏠 > INHABITANT > [GET] Successfully fetched inhabitant ${inhabitant.name} with ID ${id}`)
        return deserializedInhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching inhabitant with ID ${id}`, error)
        console.error(`👩‍🏠 > INHABITANT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}


export async function updateInhabitant(d1Client: D1Database, id: number, inhabitantData: Partial<InhabitantUpdate>): Promise<InhabitantDetail> {
    console.info(`👩‍🏠 > INHABITANT > [UPDATE] Updating inhabitant with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const {serializeWeekDayMap, deserializeWeekDayMap} = useCoreValidation()

        const updateData: Record<string, unknown> = {...inhabitantData}

        if (inhabitantData.dinnerPreferences !== undefined) {
            updateData.dinnerPreferences = inhabitantData.dinnerPreferences
                ? serializeWeekDayMap(inhabitantData.dinnerPreferences)
                : null
        }

        const updatedInhabitant = await prisma.inhabitant.update({
            where: {id},
            data: updateData
        })

        if (updatedInhabitant.dinnerPreferences) {
            updatedInhabitant.dinnerPreferences = deserializeWeekDayMap(updatedInhabitant.dinnerPreferences)
        }

        console.info(`👩‍🏠 > INHABITANT > [UPDATE] Successfully updated inhabitant ${updatedInhabitant.name} ${updatedInhabitant.lastName} with ID ${id}`)
        return updatedInhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating inhabitant with ID ${id}`, error)
        console.error(`👩‍🏠 > INHABITANT > [UPDATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteInhabitant(d1Client: D1Database, id: number): Promise<InhabitantDetail> {
    console.info(`👩‍🏠 > INHABITANT > [DELETE] Deleting inhabitant with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeInhabitant} = useCoreValidation()

    try {

        // Delete inhabitant - cascade handles strong associations automatically:
        // - Strong associations (Allergies, DinnerPreferences, Orders, CookingTeamAssignments) → CASCADE DELETE
        // TODO check if we need to change prisma setting for cascade and setNull to work properly ?
        const deletedInhabitant = await prisma.inhabitant.delete({
            where: {id}
        })

        console.info(`👩‍🏠 > INHABITANT > [DELETE] Successfully deleted inhabitant ${deletedInhabitant.name} ${deletedInhabitant.lastName}`)
        // ADR-010: Deserialize to domain type before returning
        return deserializeInhabitant(deletedInhabitant)
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting inhabitant with ID ${id}`, error)
        console.error(`👩‍🏠 > INHABITANT > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** HOUSEHOLDS ***/

export async function saveHousehold(d1Client: D1Database, household: HouseholdCreate): Promise<HouseholdDetail> {
    console.info(`🏠 > HOUSEHOLD > [SAVE] Saving household at ${household.address} (Heynabo ID: ${household.heynaboId})`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const data = {
            heynaboId: household.heynaboId,
            pbsId: household.pbsId,
            movedInDate: household.movedInDate,
            moveOutDate: household.moveOutDate ?? Prisma.skip,
            name: household.name,
            address: household.address,
        }

        const newHousehold = await prisma.household.upsert({
            where: {heynaboId: household.heynaboId},
            create: data,
            update: data
        })
        console.info(`🏠 > HOUSEHOLD > [SAVE] Successfully saved household ${newHousehold.address} with ID ${newHousehold.id}`)

        if (household.inhabitants) {
            const inhabitantIds = await Promise.all(
                household.inhabitants.map(inhabitant => saveInhabitant(d1Client, inhabitant, newHousehold.id))
            )
            console.info(`🏠 > HOUSEHOLD > [SAVE] Saved ${inhabitantIds.length} inhabitants to household ${newHousehold.address}`)
        }

        // ADR-009: Return HouseholdDetail with empty inhabitants (client refetches if needed)
        return {
            ...newHousehold,
            movedInDate: new Date(newHousehold.movedInDate),
            moveOutDate: newHousehold.moveOutDate ? new Date(newHousehold.moveOutDate) : null,
            shortName: getHouseholdShortName(newHousehold.address),
            inhabitants: []
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving household at ${household?.address}`, error)
        console.error(`🏠 > HOUSEHOLD > [SAVE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

// ADR-009 & ADR-010: Returns HouseholdDisplay (all scalar fields + lightweight inhabitant relation)
export async function fetchHouseholds(d1Client: D1Database): Promise<HouseholdDisplay[]> {
    console.info(`🏠 > HOUSEHOLD > [GET] Fetching households with lightweight inhabitant data`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeHouseholdSummary} = useCoreValidation()

    try {
        const households = await prisma.household.findMany({
            include: {
                inhabitants: {
                    select: {
                        id: true,
                        heynaboId: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        // ADR-010: Repository validates data after deserialization
        const validatedHouseholds = households.map(household => deserializeHouseholdSummary(household))

        console.info(`🏠 > HOUSEHOLD > [GET] Successfully fetched ${households.length} households`)
        return validatedHouseholds
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching households', error)
        console.error(`🏠 > HOUSEHOLD > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchHousehold(d1Client: D1Database, id: number): Promise<HouseholdDetail | null> {
    console.info(`🏠 > HOUSEHOLD > [GET] Fetching household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeHouseholdWithInhabitants} = useCoreValidation()

    try {
        const household = await prisma.household.findFirst({
            where: {id},
            include: {
                inhabitants: {
                    include: {
                        allergies: {
                            include: {
                                allergyType: true
                            }
                        }
                    }
                }
            }
        })

        if (!household) return null

        // ADR-010: Repository validates data after deserialization
        const validatedHousehold = deserializeHouseholdWithInhabitants(household)

        console.info(`🏠 > HOUSEHOLD > [GET] Successfully fetched household ${household.name} with ${household.inhabitants?.length ?? 0} inhabitants`)
        return validatedHousehold
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching household with ID ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function updateHousehold(d1Client: D1Database, id: number, householdData: Partial<HouseholdCreate>): Promise<HouseholdDetail> {
    console.info(`🏠 > HOUSEHOLD > [UPDATE] Updating household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Handle undefined values with Prisma.skip to satisfy strictUndefinedChecks
        const data: Partial<HouseholdCreate> = {}
        if (householdData.heynaboId !== undefined) data.heynaboId = householdData.heynaboId
        if (householdData.pbsId !== undefined) data.pbsId = householdData.pbsId
        if (householdData.movedInDate !== undefined) data.movedInDate = householdData.movedInDate
        if (householdData.name !== undefined) data.name = householdData.name
        if (householdData.address !== undefined) data.address = householdData.address
        // Only set moveOutDate if provided (use Prisma.skip for null to avoid undefined)
        if (householdData.moveOutDate !== undefined) {
            data.moveOutDate = householdData.moveOutDate ?? Prisma.skip
        }

        const updatedHousehold = await prisma.household.update({
            where: {id},
            data
        })

        // ADR-009: Return HouseholdDetail with empty inhabitants (client refetches if needed)
        const householdDetail: HouseholdDetail = {
            ...updatedHousehold,
            movedInDate: new Date(updatedHousehold.movedInDate),
            moveOutDate: updatedHousehold.moveOutDate ? new Date(updatedHousehold.moveOutDate) : null,
            shortName: getHouseholdShortName(updatedHousehold.address),
            inhabitants: []
        }

        console.info(`🏠 > HOUSEHOLD > [UPDATE] Successfully updated household ${updatedHousehold.name} with ID ${id}`)
        return householdDetail
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating household with id ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [UPDATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteHousehold(d1Client: D1Database, id: number): Promise<HouseholdDetail> {
    console.info(`🏠 > HOUSEHOLD > [DELETE] Deleting household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const deletedHousehold = await prisma.household.delete({
            where: {id}
        })
        console.info(`🏠 > HOUSEHOLD > [DELETE] Successfully deleted household ${deletedHousehold.name} with ID ${id}`)

        // ADR-009: Return HouseholdDetail with empty inhabitants
        return {
            ...deletedHousehold,
            movedInDate: new Date(deletedHousehold.movedInDate),
            moveOutDate: deletedHousehold.moveOutDate ? new Date(deletedHousehold.moveOutDate) : null,
            shortName: getHouseholdShortName(deletedHousehold.address),
            inhabitants: []
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting household with id ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** SEASON AGGREGATE ROOT - aggregates team assignments, teams, and dinner events ***/

// Get serialization utilities
const {serializeSeason, deserializeSeason} = useSeasonValidation()

export async function fetchSeasonForRange(d1Client: D1Database, start: string, end: string): Promise<Season | null> {
    console.info(`🌞 > SEASON > [GET] Fetching season for range ${start} to ${end}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const seasonDatesStr = JSON.stringify({
            start: start,
            end: end
        })

        const season = await prisma.season.findFirst({
            where: {
                seasonDates: seasonDatesStr
            }
        })

        if (season) {
            console.info(`🌞 > SEASON > [GET] Found season ${season.shortName} (ID: ${season.id}) for range`)
            return deserializeSeason(season)
        } else {
            console.info(`🌞 > SEASON > [GET] No season found for range ${start} to ${end}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching season for range ${start} to ${end}`, error)
        console.error(`🌞 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchCurrentSeason(d1Client: D1Database): Promise<Season | null> {
    console.info(`🌞 > SEASON > [GET] Fetching current active season`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const season = await prisma.season.findFirst({
            where: {
                isActive: true
            }
        })

        if (season) {
            console.info(`🌞 > SEASON > [GET] Found current active season ${season.shortName} (ID: ${season.id})`)
            return deserializeSeason(season)
        } else {
            console.info(`🌞 > SEASON > [GET] No active season found`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching current active season', error)
        console.error(`🌞 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Fetch the ID of the currently active season (if any)
 * Validates that only one season is active (data integrity check)
 * @param d1Client - D1 database client
 * @returns Active season ID or null if no season is active
 * @throws Error if multiple active seasons found (data integrity violation)
 */
export async function fetchActiveSeasonId(d1Client: D1Database): Promise<number | null> {
    console.info(`🌞 > SEASON > [GET] Fetching active season ID`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Get all active seasons to validate uniqueness
    const activeSeasons = await prisma.season.findMany({
        where: { isActive: true },
        select: { id: true }
    })

    // Validate uniqueness - should only be one active season
    if (activeSeasons.length > 1) {
        console.error(`🌞 > SEASON > [GET] Data integrity error: ${activeSeasons.length} active seasons found`)
        throw createError({
            statusCode: 500,
            message: `Data integrity error: Multiple active seasons found (${activeSeasons.length})`
        })
    }

    const seasonId = activeSeasons[0]?.id ?? null
    console.info(`🌞 > SEASON > [GET] Active season ID: ${seasonId}`)
    return seasonId
}

/**
 * Activate a season - ensures only one season is active at a time
 * Validates that season exists before deactivating other seasons
 * @param d1Client - D1 database client
 * @param seasonId - ID of season to activate
 * @returns Activated season
 */
export async function activateSeason(d1Client: D1Database, seasonId: number): Promise<Season> {
    console.info(`🌞 > SEASON > [POST] Activating season ID ${seasonId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // First, verify the season exists
        const seasonToActivate = await prisma.season.findUnique({
            where: { id: seasonId }
        })

        if (!seasonToActivate) {
            console.warn(`🌞 > SEASON > [POST] Season ${seasonId} not found`)
            throw createError({
                statusCode: 404,
                message: `Sæson med ID ${seasonId} blev ikke fundet`
            })
        }

        console.info(`🌞 > SEASON > [POST] Found season ${seasonToActivate.shortName}, proceeding with activation`)

        // Deactivate all currently active seasons
        await prisma.season.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        })
        console.info(`🌞 > SEASON > [POST] Deactivated all previously active seasons`)

        // Activate the requested season
        const activatedSeason = await prisma.season.update({
            where: { id: seasonId },
            data: { isActive: true }
        })

        console.info(`🌞 > SEASON > [POST] Activated season ${activatedSeason.shortName} (ID: ${seasonId})`)
        return deserializeSeason(activatedSeason)
    } catch (error) {
        const h3e = h3eFromCatch('Error activating season', error)
        console.error(`🌞 > SEASON > [POST] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchSeason(d1Client: D1Database, id: number): Promise<Season | null> {
    console.info(`🌞 > SEASON > [GET] Fetching season with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const season = await prisma.season.findFirst({
            where: {id},
            include: {
                dinnerEvents: true,
                CookingTeams: {
                    include: {
                        assignments: {
                            include: {inhabitant: true}
                        },
                        _count: {
                            select: {
                                dinners: true  // Aggregate count of dinners per team
                            }
                        }
                    }
                },
                ticketPrices: true
            }
        })

        if (season) {
            console.info(`🌞 > SEASON > [GET] Found season ${season.shortName} (ID: ${season.id})`)
            // Transform to include cookingDaysCount in team objects
            const seasonWithCounts = {
                ...season,
                CookingTeams: season.CookingTeams?.map(team => ({
                    ...team,
                    cookingDaysCount: team._count.dinners
                }))
            }
            return deserializeSeason(seasonWithCounts)
        } else {
            console.info(`🌞 > SEASON > [GET] No season found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching season with ID ${id}`, error)
        console.error(`🌞 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}


export async function fetchSeasons(d1Client: D1Database): Promise<Season[]> {
    console.info(`🌞 > SEASON > [GET] Fetching all seasons`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {SeasonSchema} = useSeasonValidation()

    try {
        const seasons = await prisma.season.findMany({
            include: {
                ticketPrices: true
            },
            orderBy: {
                seasonDates: 'desc'
            }
        })
        console.info(`🌞 > SEASON > [GET] Successfully fetched ${seasons.length} seasons`)

        // Validate each season after deserialization
        return seasons.map(season => {
            const deserialized = deserializeSeason(season)
            return SeasonSchema.parse(deserialized)
        })
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching seasons', error)
        console.error(`🌞 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteSeason(d1Client: D1Database, id: number): Promise<Season> {
    console.info(`🌞 > SEASON > [DELETE] Deleting season with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        // Delete CookingTeamAssignments (strong relation to teams) - handled by cascade
        // Delete CookingTeams (strong relation to season) - handled by cascade
        // Delete DinnerEvents (strong relation to season - part of season schedule) - handled by cascade

        const deletedSeason = await prisma.season.delete({
            where: {id}
        })

        console.info(`🌞 > SEASON > [DELETE] Successfully deleted season ${deletedSeason.shortName}`)
        return deletedSeason
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting season with ID ${id}`, error)
        console.error(`🌞 > SEASON > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function createSeason(d1Client: D1Database, seasonData: Season): Promise<Season> {
    console.info(`🌞 > SEASON > [CREATE] Creating season ${seasonData.shortName}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {CreateTicketPricesArraySchema} = useTicketPriceValidation()

    // Serialize domain object to database format
    const serialized = serializeSeason(seasonData)

    // Exclude id and read-only relation fields from create
    const {id, dinnerEvents, CookingTeams, ticketPrices, ...createData} = serialized

    // Validate and strip IDs from ticket prices for creation
    const ticketPricesForCreate = ticketPrices && ticketPrices.length > 0
        ? CreateTicketPricesArraySchema.parse(ticketPrices)
        : Prisma.skip

    try {
        const newSeason = await prisma.season.create({
            data: {
                ...createData,
                ticketPrices: { create: ticketPricesForCreate }
            },
            include: {
                ticketPrices: true,
                dinnerEvents: true,
                CookingTeams: true
            }
        })

        console.info(`🌞 > SEASON > [CREATE] Successfully created season ${newSeason.shortName} with ID ${newSeason.id} and ${newSeason.ticketPrices.length} ticket prices`)

        // Deserialize before returning
        return deserializeSeason(newSeason)
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating season ${seasonData?.shortName}`, error)
        console.error(`🌞 > SEASON > [CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function updateSeason(d1Client: D1Database, seasonData: Season): Promise<Season> {
    console.info(`🌞 > SEASON > [UPDATE] Updating season with ID ${seasonData.id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Serialize domain object to database format
    const serialized = serializeSeason(seasonData)

    // Exclude id and read-only relation fields from update
    const {id, dinnerEvents, CookingTeams, ticketPrices, ...updateData} = serialized
    try {

        const updatedSeason = await prisma.season.update({
            where: {id: seasonData.id},
            data: {
                ...updateData,
                // Replace all ticket prices (delete existing, create new)
                ticketPrices: ticketPrices ? {
                    deleteMany: {},  // Delete all existing ticket prices for this season
                    // Strip id and seasonId - Prisma auto-generates id and sets seasonId from relation
                    create: ticketPrices.map(({id, seasonId, ...price}) => price)
                } : undefined
            },
            include: {
                ticketPrices: true
            }
        })

        console.info(`🌞 > SEASON > [UPDATE] Successfully updated season ${updatedSeason.shortName} (ID: ${updatedSeason.id}) with ${updatedSeason.ticketPrices.length} ticket prices`)

        // Deserialize before returning
        return deserializeSeason(updatedSeason)
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating season with ID ${id}`, error)
        console.error(`🌞 > SEASON > [UPDATE] ${h3e.message}`, error)
        throw h3e
    }
}

/*** SEASON > TEAM ***/
// ADR-005: CookingTeam relationships:
// - Strong to Season (team cannot exist without season)
// - Strong to CookingTeamAssignments (assignments cannot exist without team)
// - Weak to DinnerEvents (events can exist without assigned team)

// Get serialization utilities for CookingTeam
const {serializeCookingTeam: _serializeCookingTeam, deserializeCookingTeam, deserializeCookingTeamAssignment} = useCookingTeamValidation()

/**
 * Create team assignment (ADR-009)
 * Accepts: CookingTeamAssignment without id (cookingTeamId required in body)
 * Returns: CookingTeamAssignment (with all relations)
 */
export async function createTeamAssignment(d1Client: D1Database, assignmentData: Omit<CookingTeamAssignment, 'id'>): Promise<CookingTeamAssignment> {
    console
        .info(`👥🔗 > ASSIGNMENT > [CREATE] Creating team assignment for inhabitant ${assignmentData.inhabitantId} in team ${assignmentData.cookingTeamId} with role ${assignmentData.role}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {serializeWeekDayMap} = useCookingTeamValidation()

    // Extract affinity and inhabitant (relation field) for conditional handling
    const {affinity, inhabitant, ...createData} = assignmentData

    try {
        const assignment = await prisma.cookingTeamAssignment.create({
            data: {
                ...createData,
                // Serialize affinity (WeekDayMap) to JSON string for database
                affinity: affinity ? serializeWeekDayMap(affinity) : PrismaFromClient.skip
            },
            include: {
                inhabitant: true,
                cookingTeam: true
            }
        })

        console.info(`👥🔗 > ASSIGNMENT > [CREATE] Successfully created team assignment with ID ${assignment.id}`)

        // ADR-010: Deserialize to domain type before returning
        return deserializeCookingTeamAssignment(assignment)
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating team assignment for inhabitant ${assignmentData.inhabitantId}`, error)
        console.error(`👥🔗 > ASSIGNMENT > [CREATE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function fetchTeamAssignment(d1Client: D1Database, id: number): Promise<CookingTeamAssignment | null> {
    console.info(`👥🔗 > ASSIGNMENT > [GET] Fetching team assignment with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const assignment = await prisma.cookingTeamAssignment.findUnique({
            where: {id},
            include: {
                inhabitant: true,
                cookingTeam: true
            }
        })

        if (assignment) {
            console.info(`👥🔗 > ASSIGNMENT > [GET] Found assignment ID ${assignment.id}`)
            // ADR-010: Deserialize to domain type before returning
            return deserializeCookingTeamAssignment(assignment)
        } else {
            console.info(`👥🔗 > ASSIGNMENT > [GET] No assignment found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching team assignment with ID ${id}`, error)
        console.error(`👥🔗 > ASSIGNMENT > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

export async function deleteCookingTeamAssignments(d1Client: D1Database, assignmentIds: number[]): Promise<number> {
    if (assignmentIds.length === 0) {
        console.info(`👥🔗 > ASSIGNMENT > [DELETE] No assignments to delete`)
        return 0
    }

    console.info(`👥🔗 > ASSIGNMENT > [DELETE] Deleting ${assignmentIds.length} team assignments`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const result = await prisma.cookingTeamAssignment.deleteMany({
            where: {id: {in: assignmentIds}}
        })

        console.info(`👥🔗 > ASSIGNMENT > [DELETE] Successfully deleted ${result.count} team assignments`)
        return result.count
    } catch (error) {
        const h3e = h3eFromCatch('Error deleting team assignments', error)
        console.error(`👥🔗 > ASSIGNMENT > [DELETE] ${h3e.message}`, error)
        throw h3e
    }
}

/**
 * Fetch cooking teams with Display data (ADR-009)
 * Includes: assignments (with inhabitants), cookingDaysCount aggregate
 * For list views - no dinnerEvents array
 */
export async function fetchTeams(d1Client: D1Database, seasonId?: number): Promise<CookingTeamDisplay[]> {
    console.info(`👥 > TEAM > [GET] Fetching teams${seasonId ? ` for season ${seasonId}` : ''}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const teams = await prisma.cookingTeam.findMany({
            where: seasonId ? {seasonId} : PrismaFromClient.skip,
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                },
                _count: {
                    select: {dinners: true}
                }
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Transform to include cookingDaysCount aggregate (map Prisma _count.dinners → cookingDaysCount)
        const teamsWithCount = teams.map(team => ({
            id: team.id,
            seasonId: team.seasonId,
            name: team.name,
            affinity: team.affinity,
            assignments: team.assignments,
            cookingDaysCount: team._count.dinners
        }))

        // Deserialize from database format
        const deserializedTeams = teamsWithCount.map(team => deserializeCookingTeam(team))

        console.info(`👥 > TEAM > [GET] Successfully fetched ${teams.length} teams`, 'Season: ', seasonId ? ` for season ${seasonId}` : '')
        return deserializedTeams
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching teams for season ${seasonId}`, error)
        console.error(`👥 > TEAM > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

/**
* Fetch single cooking team with Detail data (ADR-009)
* Includes: assignments (with inhabitants), dinnerEvents array, cookingDaysCount aggregate
*/
export async function fetchTeam(id: number, d1Client: D1Database):Promise<CookingTeamDetail | null> {
    console.info(`👥 > TEAM > [GET] Fetching team with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeCookingTeamDetail} = useCookingTeamValidation()

    try {
        const team = await prisma.cookingTeam.findFirst({
            where: {id},
            include: {
                season: true,
                assignments: {
                    include: {inhabitant: true}
                },
                dinners: true,  // Include full dinners array for Detail
                _count: {
                    select: {dinners: true}
                }
            }
        })

        if (team) {
            console.info(`👥 > TEAM > [GET] Found team ${team.name} (ID: ${team.id})`)
            // Transform to include cookingDaysCount aggregate and map dinners → dinnerEvents
            // Exclude Prisma-only fields (season object, _count)
            const teamWithCount = {
                id: team.id,
                seasonId: team.seasonId,
                name: team.name,
                affinity: team.affinity,
                assignments: team.assignments,
                dinnerEvents: team.dinners,  // Map Prisma 'dinners' relation to domain 'dinnerEvents'
                cookingDaysCount: team._count.dinners
            }
            return deserializeCookingTeamDetail(teamWithCount)
        } else {
            console.info(`👥 > TEAM > [GET] No team found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching team with ID ${id}`, error)
        console.error(`👥 > TEAM > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/**
 * Fetch teams for a user (inhabitant) in a specific season
 * Returns CookingTeamDetail[] with dinnerEvents
 *
 * ADR-009: Returns Detail type (with dinnerEvents) because:
 * - Bounded: User typically on 1-3 teams max
 * - Essential: /chef page needs dinnerEvents for each team
 * - Performance safe: Small dataset per user
 */
export async function fetchMyTeams(d1Client: D1Database, seasonId: number, inhabitantId: number): Promise<CookingTeamDetail[]> {
    console.info(`👥 > TEAM > [GET MY] Fetching teams for inhabitant ${inhabitantId} in season ${seasonId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeCookingTeamDetail} = useCookingTeamValidation()

    try {
        const teams = await prisma.cookingTeam.findMany({
            where: {
                seasonId,
                assignments: {
                    some: {
                        inhabitantId
                    }
                }
            },
            include: {
                season: true,
                assignments: {
                    include: {inhabitant: true}
                },
                dinners: true,  // Include dinnerEvents for /chef page
                _count: {
                    select: {dinners: true}
                }
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Transform and deserialize
        const teamsWithDinners = teams.map(team => ({
            id: team.id,
            seasonId: team.seasonId,
            name: team.name,
            affinity: team.affinity,
            assignments: team.assignments,
            dinnerEvents: team.dinners,  // Map Prisma 'dinners' to domain 'dinnerEvents'
            cookingDaysCount: team._count.dinners
        }))

        const deserializedTeams = teamsWithDinners.map(team => deserializeCookingTeamDetail(team))

        console.info(`👥 > TEAM > [GET MY] Found ${teams.length} teams for inhabitant ${inhabitantId}`)
        return deserializedTeams
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching teams for inhabitant ${inhabitantId} in season ${seasonId}`, error)
        console.error(`👥 > TEAM > [GET MY] ${h3e.message}`, error)
        throw h3e
    }
}

/**
 * Create new cooking team (ADR-009)
 * Accepts: CookingTeamCreate (input schema without id, cookingDaysCount, dinnerEvents)
 * Returns: CookingTeamDetail (full output with dinnerEvents array)
 */
export async function createTeam(d1Client: D1Database, teamData: CookingTeamCreate): Promise<CookingTeamDetail> {
    console.info(`👥 > TEAM > [CREATE] Creating team ${teamData.name}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {toPrismaCreateData, deserializeCookingTeamDetail} = useCookingTeamValidation()

    // Transform domain object to Prisma create format (excludes computed fields, serializes WeekDayMap)
    const {assignments, affinity, ...createData} = toPrismaCreateData(teamData)

    try {
        const newTeam = await prisma.cookingTeam.create({
            data: {
                ...createData,
                // Use Prisma.skip to omit field entirely when affinity is null/undefined
                affinity: affinity ?? PrismaFromClient.skip,
                assignments: assignments?.length ? { create: assignments } : PrismaFromClient.skip
            },
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                },
                dinners: true,
                _count: {
                    select: {dinners: true}
                }
            }
        })

        console.info(`👥 > TEAM > [CREATE] Successfully created team ${newTeam.name} with ID ${newTeam.id}`)

        // Transform to include cookingDaysCount and map dinners → dinnerEvents
        const teamWithCount = {
            id: newTeam.id,
            seasonId: newTeam.seasonId,
            name: newTeam.name,
            affinity: newTeam.affinity,
            assignments: newTeam.assignments,
            dinnerEvents: newTeam.dinners,
            cookingDaysCount: newTeam._count.dinners
        }

        // Deserialize before returning (ADR-010)
        return deserializeCookingTeamDetail(teamWithCount)
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating team ${teamData.name}`, error)
        console.error(`👥 > TEAM > [CREATE] ${h3e.message}`, error)
        throw h3e
    }
}

/**
 * Update cooking team (ADR-009)
 * Accepts: CookingTeamUpdate (partial input with required id)
 * Returns: CookingTeamDetail (full output with dinnerEvents array)
 */
export async function updateTeam(d1Client: D1Database, id: number, teamData: CookingTeamUpdate): Promise<CookingTeamDetail> {
    console.info(`👥 > TEAM > [UPDATE] Updating team with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {toPrismaUpdateData, deserializeCookingTeamDetail} = useCookingTeamValidation()

    // Transform domain object to Prisma update format (excludes computed fields, serializes WeekDayMap)
    const {assignments, affinity, ...updateData} = toPrismaUpdateData(teamData)

    try {
        const updatedTeam = await prisma.cookingTeam.update({
            where: {id},
            data: {
                ...updateData,
                // Use Prisma.skip to omit field entirely when affinity is null/undefined
                affinity: affinity ?? PrismaFromClient.skip,
                // Replace all assignments (delete existing, create new)
                assignments: assignments?.length ? {
                    deleteMany: {},  // Delete all existing assignments for this team
                    // Strip id and cookingTeamId - Prisma auto-generates id and sets cookingTeamId from relation
                    // Handle affinity: null using Prisma.skip to omit field entirely
                    create: assignments.map(({id, cookingTeamId, affinity, ...assignment}) => ({
                        ...assignment,
                        affinity: affinity ?? PrismaFromClient.skip
                    }))
                } : PrismaFromClient.skip
            },
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                },
                dinners: true,
                _count: {
                    select: {dinners: true}
                }
            }
        })
        console.info(`👥 > TEAM > [UPDATE] Successfully updated team ${updatedTeam.name} (ID: ${updatedTeam.id})`)

        // Transform to include cookingDaysCount and map dinners → dinnerEvents
        const teamWithCount = {
            id: updatedTeam.id,
            seasonId: updatedTeam.seasonId,
            name: updatedTeam.name,
            affinity: updatedTeam.affinity,
            assignments: updatedTeam.assignments,
            dinnerEvents: updatedTeam.dinners,
            cookingDaysCount: updatedTeam._count.dinners
        }

        // Deserialize before returning (ADR-010)
        return deserializeCookingTeamDetail(teamWithCount)
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating team with ID ${id}`, error)
        console.error(`👥 > TEAM > [UPDATE] ${h3e.message}`, error)
        throw h3e
    }
}

/**
 * Delete cooking team (ADR-009)
 * Returns: CookingTeamDetail (with empty dinnerEvents and assignments arrays)
 */
export async function deleteTeam(d1Client: D1Database, id: number): Promise<CookingTeamDetail> {
    console.info(`👥 > TEAM > [DELETE] Deleting team with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeCookingTeamDetail} = useCookingTeamValidation()

    try {
        // Delete team - cascade will handle strong associations (CookingTeamAssignments) automatically, and clear weak associations
        const deletedTeam = await prisma.cookingTeam.delete({
            where: {id}
        })

        console.info(`👥 > TEAM > [DELETE] Successfully deleted team ${deletedTeam.name}`)

        // Transform to Detail format (add empty arrays for deleted relations)
        const teamWithEmptyRelations = {
            id: deletedTeam.id,
            seasonId: deletedTeam.seasonId,
            name: deletedTeam.name,
            affinity: deletedTeam.affinity,
            assignments: [],
            dinnerEvents: [],
            cookingDaysCount: 0
        }

        // ADR-010: Deserialize to domain type before returning
        return deserializeCookingTeamDetail(teamWithEmptyRelations)
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting team with ID ${id}`, error)
        console.error(`👥 > TEAM > [DELETE] ${h3e.message}`, error)
        throw h3e
    }
}

/**
 * DINNER EVENTS and ORDERS moved to financesRepository.ts
 * See: server/data/financesRepository.ts
 *
 * DinnerEvent functions: saveDinnerEvent, fetchDinnerEvents, fetchDinnerEvent, updateDinnerEvent, deleteDinnerEvent
 * Order functions: createOrder, createOrders, fetchOrder, fetchOrders, deleteOrder
 */
