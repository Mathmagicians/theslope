import type {D1Database} from '@cloudflare/workers-types'
import {Prisma as PrismaFromClient, Prisma} from "@prisma/client"
import eventHandlerHelper from "../utils/eventHandlerHelper"
import {getPrismaClientConnection} from "../utils/database"
import type {PreferenceUpdate} from '~/composables/useSeason'

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
import {useCoreValidation} from '~/composables/useCoreValidation'
import type {
    CookingTeamDisplay,
    CookingTeamDetail,
    CookingTeamCreate,
    CookingTeamUpdate,
    CookingTeamAssignment
} from '~/composables/useCookingTeamValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'

// ADR-010: Use domain types from composables, not Prisma types
// Repository transforms Prisma results to domain types before returning

const {throwH3Error} = eventHandlerHelper

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
        return throwH3Error(`🪪 > USER > [SAVE]: Error saving user ${user.email}`, error)
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
            householdId: true,
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
        return throwH3Error('🪪 > USERS > [GET]: Error fetching users', error)
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
        return throwH3Error(`🪪 > USER > [FETCH BY ROLE]: Error fetching users with role ${systemRole}`, error)
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
        return throwH3Error('🪪 > USER > [DELETE]: Error deleting user', error)
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
                    include: {household: true}
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
        return throwH3Error(`🪪 > USER > [GET]: Error fetching user for email ${email}`, error)
    }
}

/*** INHABITANTS ***/

export async function saveInhabitant(d1Client: D1Database, inhabitant: Omit<InhabitantCreate, 'householdId'>, householdId: number): Promise<InhabitantDetail> {
    console.info(`👩‍🏠 > INHABITANT > [SAVE] Saving inhabitant ${inhabitant.name} to household ${householdId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeInhabitantDetail} = useCoreValidation()

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
            return deserializeInhabitantDetail(updatedInhabitant)
        } else {
            console.info(`👩‍🏠 > INHABITANT > [SAVE] Inhabitant ${inhabitant.name} saved without user profile`)
        }

        // ADR-010: Deserialize to domain type before returning
        return deserializeInhabitantDetail(newInhabitant)
    } catch (error) {
        return throwH3Error(`👩‍🏠 > INHABITANT > [SAVE]: Error saving inhabitant ${inhabitant.name} to household ${householdId}`, error)
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
        return throwH3Error('👩‍🏠 > INHABITANT > [GET]: Error fetching inhabitants', error)
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
        return throwH3Error(`👩‍🏠 > INHABITANT > [GET]: Error fetching inhabitant with ID ${id}`, error)
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

        // ADR-010: Deserialize to domain type before returning
        const deserializedInhabitant = {
            ...updatedInhabitant,
            dinnerPreferences: updatedInhabitant.dinnerPreferences
                ? deserializeWeekDayMap(updatedInhabitant.dinnerPreferences)
                : null
        }

        console.info(`👩‍🏠 > INHABITANT > [UPDATE] Successfully updated inhabitant ${deserializedInhabitant.name} ${deserializedInhabitant.lastName} with ID ${id}`)
        return deserializedInhabitant
    } catch (error) {
        return throwH3Error(`\`👩‍🏠 > INHABITANT > [UPDATE]: Error updating inhabitant with ID ${id}`, error)
    }
}

export async function deleteInhabitant(d1Client: D1Database, id: number): Promise<InhabitantDetail> {
    console.info(`👩‍🏠 > INHABITANT > [DELETE] Deleting inhabitant with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeInhabitantDetail} = useCoreValidation()

    try {

        // Delete inhabitant - cascade handles strong associations automatically:
        // - Strong associations (Allergies, DinnerPreferences, Orders, CookingTeamAssignments) → CASCADE DELETE
        // TODO check if we need to change prisma setting for cascade and setNull to work properly ?
        const deletedInhabitant = await prisma.inhabitant.delete({
            where: {id}
        })

        console.info(`👩‍🏠 > INHABITANT > [DELETE] Successfully deleted inhabitant ${deletedInhabitant.name} ${deletedInhabitant.lastName}`)
        // ADR-010: Deserialize to domain type before returning
        return deserializeInhabitantDetail(deletedInhabitant)
    } catch (error) {
        return throwH3Error(`👩‍🏠 > INHABITANT > [DELETE]: Error deleting inhabitant with ID ${id}`, error)
    }
}

/**
 * Bulk update inhabitant dinner preferences.
 * ADR-009: Batch operations return count (Display-weight) to avoid D1 rate limits.
 *
 * @param updates - Array of {inhabitantId, dinnerPreferences} to update
 * @returns Number of successfully updated inhabitants
 */
export async function updateInhabitantPreferencesBulk(
    d1Client: D1Database,
    updates: PreferenceUpdate[]
): Promise<number> {
    console.info(`👩‍🏠 > INHABITANT > [BULK_PREFS] Updating preferences for ${updates.length} inhabitants`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {serializeWeekDayMap} = useCoreValidation()

    try {
        const results = await Promise.all(
            updates.map(({inhabitantId, dinnerPreferences}) =>
                prisma.inhabitant.update({
                    where: {id: inhabitantId},
                    data: {dinnerPreferences: serializeWeekDayMap(dinnerPreferences)},
                    select: {id: true} // Minimal select for performance
                })
            )
        )

        console.info(`👩‍🏠 > INHABITANT > [BULK_PREFS] Successfully updated ${results.length} inhabitants`)
        return results.length
    } catch (error) {
        return throwH3Error('👩‍🏠 > INHABITANT > [BULK_PREFS]: Error updating inhabitant preferences', error)
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
                household.inhabitants.map((inhabitant) => saveInhabitant(d1Client, inhabitant, newHousehold.id))
            )
            console.info(`🏠 > HOUSEHOLD > [SAVE] Saved ${inhabitantIds.length} inhabitants to household ${newHousehold.address}`)
        }

        // ADR-009: Return HouseholdDetail (same as GET/:id) by refetching with relations
        const householdDetail = await fetchHousehold(d1Client, newHousehold.id)
        if (!householdDetail) {
            throw createError({
                statusCode: 500,
                message: `Failed to fetch household after creation: ${newHousehold.id}`
            })
        }

        console.info(`🏠 > HOUSEHOLD > [SAVE] Successfully saved household ${householdDetail.name} with ${householdDetail.inhabitants.length} inhabitants`)
        return householdDetail
    } catch (error) {
        return throwH3Error(`🏠 > HOUSEHOLD > [SAVE]: Error saving household at ${household?.address}`, error)
    }
}

// ADR-009 & ADR-010: Returns HouseholdDisplay (all scalar fields + lightweight inhabitant relation)
export async function fetchHouseholds(d1Client: D1Database): Promise<HouseholdDisplay[]> {
    console.info(`🏠 > HOUSEHOLD > [GET] Fetching households with lightweight inhabitant data`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeHouseholdDisplay} = useCoreValidation()

    try {
        const households = await prisma.household.findMany({
            include: {
                inhabitants: {
                    select: {
                        id: true,
                        heynaboId: true,
                        userId: true,
                        householdId: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true,
                        dinnerPreferences: true
                    }
                }
            },
            orderBy: {
                address: 'asc'  // Sort alphabetically by address for consistent UI ordering
            }
        })

        // ADR-010: Repository validates data after deserialization
        const validatedHouseholds = households.map(household => deserializeHouseholdDisplay(household))

        console.info(`🏠 > HOUSEHOLD > [GET] Successfully fetched ${households.length} households`)
        return validatedHouseholds
    } catch (error) {
        return throwH3Error('🏠 > HOUSEHOLDS > [GET]: Error fetching households', error)
    }
}

export async function fetchHousehold(d1Client: D1Database, id: number): Promise<HouseholdDetail | null> {
    console.info(`🏠 > HOUSEHOLD > [GET] Fetching household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeHouseholdDetail} = useCoreValidation()

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
        const validatedHousehold = deserializeHouseholdDetail(household)

        console.info(`🏠 > HOUSEHOLD > [GET] Successfully fetched household ${household.name} with ${household.inhabitants?.length ?? 0} inhabitants`)
        return validatedHousehold
    } catch (error) {
        return throwH3Error(`🏠 > HOUSEHOLD > [GET]: Error fetching household with ID ${id}`, error)
    }
}

export async function updateHousehold(d1Client: D1Database, id: number, householdData: Partial<HouseholdCreate>): Promise<HouseholdDetail> {
    console.info(`🏠 > HOUSEHOLD > [UPDATE] Updating household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Build Prisma update data with Prisma.skip for undefined fields (ADR-012)
        await prisma.household.update({
            where: {id},
            data: {
                heynaboId: householdData.heynaboId ?? Prisma.skip,
                pbsId: householdData.pbsId ?? Prisma.skip,
                movedInDate: householdData.movedInDate ?? Prisma.skip,
                name: householdData.name ?? Prisma.skip,
                address: householdData.address ?? Prisma.skip,
                moveOutDate: householdData.moveOutDate === undefined ? Prisma.skip : householdData.moveOutDate
            }
        })

        // ADR-009: Return HouseholdDetail (same as GET/:id) by refetching with relations
        const householdDetail = await fetchHousehold(d1Client, id)
        if (!householdDetail) {
            throw createError({
                statusCode: 404,
                message: `Household not found after update: ${id}`
            })
        }

        console.info(`🏠 > HOUSEHOLD > [UPDATE] Successfully updated household ${householdDetail.name} with ${householdDetail.inhabitants.length} inhabitants`)
        return householdDetail
    } catch (error) {
        return throwH3Error(`🏠 > HOUSEHOLD > [UPDATE]: Error updating household with id ${id}`, error)
    }
}

export async function deleteHousehold(d1Client: D1Database, id: number): Promise<HouseholdDetail> {
    console.info(`🏠 > HOUSEHOLD > [DELETE] Deleting household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeHouseholdDetail} = useCoreValidation()

    try {
        // ADR-009: Include relations in delete response (same structure as GET/:id)
        const deletedHousehold = await prisma.household.delete({
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

        // ADR-010: Repository validates data after deserialization
        const householdDetail = deserializeHouseholdDetail(deletedHousehold)

        console.info(`🏠 > HOUSEHOLD > [DELETE] Successfully deleted household ${householdDetail.name} with ${householdDetail.inhabitants.length} inhabitants`)
        return householdDetail
    } catch (error) {
        return throwH3Error(`Error deleting household with id ${id}`, error)
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
        return throwH3Error(`🌞 > SEASON > [FETCH FOR RANGE]: Error fetching season for range ${start} to ${end}`, error)
    }
}

// Returns active season or null if none active
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
        return throwH3Error('🌞 > SEASON > [FETCH CURRENT]: Error fetching current active season', error)
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
    let activeSeasons
    try {
        // Get all active seasons to validate uniqueness
        activeSeasons = await prisma.season.findMany({
            where: {isActive: true},
            select: {id: true}
        })
    } catch (error) {
        return throwH3Error('🌞> SEASON > [FETCH ACTIVE]: Error fetching active season ID', error)
    }

    // Validate uniqueness - should only be one active season
    if (activeSeasons.length > 1) {
        console.error(`🌞 > SEASON > [FETCH ACTIVE] Data integrity error: ${activeSeasons.length} active seasons found`)
        throw createError({
            statusCode: 500,
            message: `[FETCH ACTIVE]: Data integrity error: Multiple active seasons found (${activeSeasons.length}):`
        })
    }

    const seasonId = activeSeasons[0]?.id ?? null
    console.info(`🌞 > SEASON > [GET] Active season ID: ${seasonId}`)
    return seasonId
}

/**
 * Deactivate the current active season (idempotent - returns null if none active)
 * @param d1Client - D1 database client
 * @returns Deactivated season or null if none was active
 */
export async function deactivateSeason(d1Client: D1Database): Promise<Season | null> {
    console.info(`🌞 > SEASON > [DEACTIVATE] Deactivating active season`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const activeSeason = await fetchCurrentSeason(d1Client)
        if (!activeSeason) {
            console.info(`🌞 > SEASON > [DEACTIVATE] No active season to deactivate`)
            return null
        }

        await prisma.season.update({
            where: {id: activeSeason.id},
            data: {isActive: false}
        })

        const season = await fetchSeason(d1Client, activeSeason.id)
        console.info(`🌞 > SEASON > [DEACTIVATE] Deactivated season ${season?.shortName}`)
        return season
    } catch (error) {
        return throwH3Error('🌞 > SEASON > [DEACTIVATE] Error deactivating season', error)
    }
}

export async function activateSeason(d1Client: D1Database, seasonId: number): Promise<Season> {
    console.info(`🌞 > SEASON > [POST] Activating season ID ${seasonId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // First, verify the season exists
        const seasonToActivate = await prisma.season.findUnique({
            where: {id: seasonId}
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
            where: {isActive: true},
            data: {isActive: false}
        })
        console.info(`🌞 > SEASON > [POST] Deactivated all previously active seasons`)

        // Activate the requested season
        const activatedSeason = await prisma.season.update({
            where: {id: seasonId},
            data: {isActive: true},
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

        console.info(`🌞 > SEASON > [POST] Activated season ${activatedSeason.shortName} (ID: ${seasonId})`)
        return deserializeSeason(activatedSeason)
    } catch (error) {
        return throwH3Error(' > SEASON > [POST]: Error activating season', error)
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
        return throwH3Error(`🌞 > SEASON > [GET]: Error fetching season with ID ${id}`, error)
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
        return throwH3Error('🌞 > SEASON > [GET]: Error fetching seasons', error)
    }
}

export async function deleteSeason(d1Client: D1Database, id: number): Promise<Season> {
    console.info(`🌞 > SEASON > [DELETE] Deleting season with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {SeasonSchema} = useSeasonValidation()

    try {
        // Delete CookingTeamAssignments (strong relation to teams) - handled by cascade
        // Delete CookingTeams (strong relation to season) - handled by cascade
        // Delete DinnerEvents (strong relation to season - part of season schedule) - handled by cascade

        const deletedSeason = await prisma.season.delete({
            where: {id},
            include: {
                ticketPrices: true
            }
        })

        console.info(`🌞 > SEASON > [DELETE] Successfully deleted season ${deletedSeason.shortName}`)
        // ADR-010: Repository MUST validate returned data
        const deserialized = deserializeSeason(deletedSeason)
        return SeasonSchema.parse(deserialized)
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [DELETE]: Error deleting season with ID ${id}`, error)
    }
}

export async function createSeason(d1Client: D1Database, seasonData: Season): Promise<Season> {
    console.info(`🌞 > SEASON > [CREATE] Creating season ${seasonData.shortName}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {CreateTicketPricesArraySchema} = useTicketPriceValidation()
    const {SeasonSchema} = useSeasonValidation()

    // ADR-010: Validate input BEFORE writing to database
    const validatedSeasonData = SeasonSchema.parse(seasonData)

    // Serialize domain object to database format
    const serialized = serializeSeason(validatedSeasonData)

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
                ticketPrices: {create: ticketPricesForCreate}
            },
            include: {
                ticketPrices: true,
                dinnerEvents: true,
                CookingTeams: true
            }
        })

        console.info(`🌞 > SEASON > [CREATE] Successfully created season ${newSeason.shortName} with ID ${newSeason.id} and ${newSeason.ticketPrices.length} ticket prices`)

        // ADR-010: Validate output BEFORE returning (ensure DB returned valid data)
        const deserialized = deserializeSeason(newSeason)
        return SeasonSchema.parse(deserialized)
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [CREATE]: Error creating season ${seasonData?.shortName}`, error)
    }
}

export async function updateSeason(d1Client: D1Database, seasonData: Season): Promise<Season> {
    console.info(`🌞 > SEASON > [UPDATE] Updating season with ID ${seasonData.id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {SeasonSchema} = useSeasonValidation()
    const {reconcileTicketPrices} = useTicketPriceValidation()

    // ADR-010: Validate input BEFORE writing to database
    const validatedSeasonData = SeasonSchema.parse(seasonData)

    // Serialize domain object to database format
    const serialized = serializeSeason(validatedSeasonData)

    // Exclude id and read-only relation fields from update
    const {id, dinnerEvents, CookingTeams, ticketPrices, ...updateData} = serialized
    try {
        // Handle ticket prices using reconcileTicketPrices to respect FK constraint (Order.ticketPriceId onDelete: Restrict)
        if (ticketPrices && ticketPrices.length > 0) {
            const existingPrices = await prisma.ticketPrice.findMany({
                where: { seasonId: validatedSeasonData.id }
            })

            const { create, update, delete: toDelete } = reconcileTicketPrices(existingPrices)(ticketPrices)

            for (const tp of create) {
                await prisma.ticketPrice.create({
                    data: {
                        seasonId: validatedSeasonData.id,
                        ticketType: tp.ticketType,
                        price: tp.price,
                        // ADR-012: Use Prisma.skip for optional fields that may be undefined
                        description: tp.description === undefined ? Prisma.skip : tp.description,
                        maximumAgeLimit: tp.maximumAgeLimit === undefined ? Prisma.skip : tp.maximumAgeLimit
                    }
                })
            }

            for (const tp of update) {
                const { id: tpId, seasonId: _seasonId, ...priceData } = tp
                if (tpId) await prisma.ticketPrice.update({ where: { id: tpId }, data: priceData })
            }

            for (const tp of toDelete) {
                if (tp.id) {
                    try {
                        await prisma.ticketPrice.delete({ where: { id: tp.id } })
                    } catch {
                        console.warn(`🌞 > SEASON > [UPDATE] Cannot delete ticket price ${tp.id} - referenced by orders`)
                    }
                }
            }
        }

        const updatedSeason = await prisma.season.update({
            where: {id: validatedSeasonData.id},
            data: updateData,
            include: {
                ticketPrices: true
            }
        })

        console.info(`🌞 > SEASON > [UPDATE] Successfully updated season ${updatedSeason.shortName} (ID: ${updatedSeason.id}) with ${updatedSeason.ticketPrices.length} ticket prices`)

        // ADR-010: Validate output BEFORE returning (ensure DB returned valid data)
        const deserialized = deserializeSeason(updatedSeason)
        return SeasonSchema.parse(deserialized)
    } catch (error) {
        return throwH3Error(`🌞 > SEASON > [UPDATE]: Error updating season with ID ${id}`, error)
    }
}

/*** SEASON > TEAM ***/
// ADR-005: CookingTeam relationships:
// - Strong to Season (team cannot exist without season)
// - Strong to CookingTeamAssignments (assignments cannot exist without team)
// - Weak to DinnerEvents (events can exist without assigned team)

// Get serialization utilities for CookingTeam
const {
    serializeCookingTeam: _serializeCookingTeam,
    deserializeCookingTeamDisplay,
    deserializeCookingTeamAssignment
} = useCookingTeamValidation()

/**
 * Create team assignment (ADR-009)
 * Accepts: CookingTeamAssignment without id and inhabitant (inhabitant populated via Prisma include)
 * Returns: CookingTeamAssignment (with all relations including inhabitant)
 */
export async function createTeamAssignment(d1Client: D1Database, assignmentData: Omit<CookingTeamAssignment, 'id' | 'inhabitant'>): Promise<CookingTeamAssignment> {
    console
        .info(`👥🔗 > ASSIGNMENT > [CREATE] Creating team assignment for inhabitant ${assignmentData.inhabitantId} in team ${assignmentData.cookingTeamId} with role ${assignmentData.role}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {serializeWeekDayMap} = useCookingTeamValidation()

    // Extract affinity for conditional handling
    const {affinity, ...createData} = assignmentData

    try {
        const assignment = await prisma.cookingTeamAssignment.create({
            data: {
                cookingTeamId: createData.cookingTeamId,
                inhabitantId: createData.inhabitantId,
                role: createData.role,
                allocationPercentage: createData.allocationPercentage,
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
        return throwH3Error(`👥🔗 > ASSIGNMENT > [CREATE]: Error creating team assignment for inhabitant ${assignmentData.inhabitantId}`, error)
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
        return throwH3Error(`👥🔗 > ASSIGNMENT > [GET]: Error fetching team assignment with ID ${id}`, error)
    }
}

/**
 * Find a CookingTeamAssignment by cookingTeamId and inhabitantId
 *
 * ADR-010: Returns domain type (CookingTeamAssignment), not Prisma type
 * Returns: CookingTeamAssignment | null
 */
export async function findTeamAssignmentByTeamAndInhabitant(
    d1Client: D1Database,
    cookingTeamId: number,
    inhabitantId: number
): Promise<CookingTeamAssignment | null> {
    console.info(`👥🔗 > ASSIGNMENT > [FIND] Finding assignment for team ${cookingTeamId} and inhabitant ${inhabitantId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {CookingTeamAssignmentSchema, deserializeWeekDayMap} = useCookingTeamValidation()

    try {
        const assignment = await prisma.cookingTeamAssignment.findFirst({
            where: {
                cookingTeamId,
                inhabitantId
            },
            include: {
                inhabitant: true
            }
        })

        if (!assignment) {
            console.info(`👥🔗 > ASSIGNMENT > [FIND] No assignment found for team ${cookingTeamId} and inhabitant ${inhabitantId}`)
            return null
        }

        // ADR-010: Deserialize affinity if present
        const deserializedAssignment = {
            ...assignment,
            affinity: assignment.affinity ? deserializeWeekDayMap(assignment.affinity) : null
        }

        return CookingTeamAssignmentSchema.parse(deserializedAssignment)
    } catch (error) {
        return throwH3Error(`👥🔗 > ASSIGNMENT > [FIND]: Error finding team assignment`, error)
    }
}

/**
 * Update a CookingTeamAssignment
 *
 * ADR-010: Accepts and returns domain types, handles serialization internally
 * Returns: CookingTeamAssignment (with inhabitant relation)
 */
export async function updateTeamAssignment(
    d1Client: D1Database,
    id: number,
    updateData: Partial<Omit<CookingTeamAssignment, 'id' | 'inhabitant'>>
): Promise<CookingTeamAssignment> {
    console.info(`👥🔗 > ASSIGNMENT > [UPDATE] Updating team assignment ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {CookingTeamAssignmentSchema, serializeWeekDayMapNullable, deserializeWeekDayMap} = useCookingTeamValidation()

    try {
        // Extract affinity for serialization if present
        const {affinity, ...restData} = updateData

        const assignment = await prisma.cookingTeamAssignment.update({
            where: {id},
            data: {
                ...restData,
                // Use Prisma.skip to omit field entirely when not being updated
                affinity: affinity === undefined ? Prisma.skip : serializeWeekDayMapNullable(affinity)
            },
            include: {
                inhabitant: true
            }
        })

        // ADR-010: Deserialize affinity if present
        const deserializedAssignment = {
            ...assignment,
            affinity: assignment.affinity ? deserializeWeekDayMap(assignment.affinity) : null
        }

        console.info(`👥🔗 > ASSIGNMENT > [UPDATE] Successfully updated assignment ${id}`)
        return CookingTeamAssignmentSchema.parse(deserializedAssignment)
    } catch (error) {
        return throwH3Error(`👥🔗 > ASSIGNMENT > [UPDATE]: Error updating team assignment ${id}`, error)
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
        return throwH3Error('👥🔗 > ASSIGNMENT > [DELETE]: Error deleting team assignments: ', error)
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
        const deserializedTeams = teamsWithCount.map(team => deserializeCookingTeamDisplay(team))

        console.info(`👥 > TEAM > [GET] Successfully fetched ${teams.length} teams`, 'Season: ', seasonId ? ` for season ${seasonId}` : '')
        return deserializedTeams
    } catch (error) {
        return throwH3Error(`👥 > TEAM > [GET]: Error fetching teams for season ${seasonId}: `, error)
    }
}

/**
 * Fetch single cooking team with Detail data (ADR-009)
 * Includes: assignments (with inhabitants), dinnerEvents array, cookingDaysCount aggregate
 */
export async function fetchTeam(id: number, d1Client: D1Database): Promise<CookingTeamDetail | null> {
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
        return throwH3Error(`👥 > TEAM > [GET]: Error fetching team with ID ${id}: `, error)
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
        return throwH3Error(`👥 > TEAM > [GET MY]: Error fetching teams for inhabitant ${inhabitantId} in season ${seasonId}: `, error)
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
                assignments: assignments?.length ? {create: assignments} : PrismaFromClient.skip
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
        return throwH3Error(`👥 > TEAM > [CREATE]: Error creating team ${teamData.name}: `, error)
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
    const {toPrismaUpdateData, deserializeCookingTeamDetail, serializeCookingTeamAssignment} = useCookingTeamValidation()

    // Transform domain object to Prisma update format (excludes computed fields, serializes WeekDayMap)
    const {assignments, affinity, ...updateData} = toPrismaUpdateData(teamData)

    try {
        const updatedTeam = await prisma.cookingTeam.update({
            where: {id},
            data: {
                ...updateData,
                // affinity already serialized by toPrismaUpdateData (string | null | undefined)
                // undefined = omit from update, null = set to NULL, string = set value
                affinity: affinity === undefined ? Prisma.skip : affinity,
                // Replace all assignments (delete existing, create new)
                assignments: assignments?.length ? {
                    deleteMany: {},  // Delete all existing assignments for this team
                    // ADR-010: Use composable's serialize function for assignment data
                    create: assignments.map((item: CookingTeamAssignment) => serializeCookingTeamAssignment(item))
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
        return throwH3Error(`👥 > TEAM > [UPDATE] > Error updating team with ID ${id}`, error)
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
        return throwH3Error(`👥 > TEAM > [DELETE] > Error deleting team with ID ${id}`, error)
    }
}
