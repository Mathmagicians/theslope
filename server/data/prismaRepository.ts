import type {D1Database} from '@cloudflare/workers-types'
import {PrismaD1} from "@prisma/adapter-d1"
import {PrismaClient, Prisma as PrismaFromClient} from "@prisma/client"
import eventHandlerHelper from "../utils/eventHandlerHelper"
import type {
    Season,
    User,
    Inhabitant,
    Household,
    CookingTeam,
    DinnerEvent,
    Order,
    TicketPrice as PrismaTicketPrice,
    AllergyType,
    Allergy
} from "@prisma/client"

import type {Season as DomainSeason} from "~/composables/useSeasonValidation"
import {useSeasonValidation} from "~/composables/useSeasonValidation"
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
import type {InhabitantCreate, InhabitantUpdate, HouseholdCreate} from '~/composables/useHouseholdValidation'
import {getHouseholdShortName, useHouseholdValidation} from '~/composables/useHouseholdValidation'
import type {DinnerEventCreate} from '~/composables/useDinnerEventValidation'
import type {OrderCreate} from '~/composables/useOrderValidation'
import type {CookingTeam as CookingTeamCreate, CookingTeamWithMembers, SerializedCookingTeam, TeamRole as TeamRoleCreate} from '~/composables/useCookingTeamValidation'
import {useCookingTeamValidation} from '~/composables/useCookingTeamValidation'
import type {UserCreate, UserDisplay, SystemRole} from '~/composables/useUserValidation'
import {useUserValidation} from '~/composables/useUserValidation'
import type {
    AllergyTypeCreate,
    AllergyTypeUpdate,
    AllergyTypeResponse,
    AllergyTypeWithInhabitants,
    AllergyCreate,
    AllergyUpdate,
    AllergyResponse,
    AllergyWithRelations
} from '~/composables/useAllergyValidation'

export type UserWithInhabitant = PrismaFromClient.UserGetPayload<{
    include: {
        Inhabitant: {
            include: { household: true }
        }
    }
}>

export type SeasonWithRelations = PrismaFromClient.SeasonGetPayload<{
    include: {
        dinnerEvents: true,
        CookingTeams: {
            include: {
                assignments: {
                    include: { inhabitant: true }
                }
            }
        },
        ticketPrices: true
    }
}>

export type CookingTeamAssignmentWithRelations = PrismaFromClient.CookingTeamAssignmentGetPayload<{
    include: {
        inhabitant: true
        cookingTeam: true
    }
}>

// ADR-010: Use domain types from composables, not Prisma types
// Repository transforms Prisma results to domain types before returning

const {h3eFromCatch, h3eFromPrismaError} = eventHandlerHelper

export async function getPrismaClientConnection(d1Client: D1Database) {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter})
    await prisma.$connect()
    return prisma
}

/*** USERS ***/

// Get serialization utilities
const {serializeUser, deserializeUser, mergeUserRoles} = useUserValidation()

export async function saveUser(d1Client: D1Database, user: UserCreate): Promise<User> {
    console.info(`🪪 > USER > [SAVE] Saving user ${user.email}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {UserResponseSchema} = useUserValidation()

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
        const serializedUser = serializeUser(userToSave)
        const newUser = await prisma.user.upsert({
            where: {email: user.email},
            create: serializedUser,
            update: serializedUser
        })
        console.info(`🪪 > USER > [SAVE] Successfully saved user ${newUser.email} with ID ${newUser.id}`)

        // Deserialize and validate before returning (ADR-010 pattern)
        const deserialized = deserializeUser(newUser)
        return UserResponseSchema.parse(deserialized)
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

// Shared deserialization logic for UserDisplay
function deserializeToUserDisplay(user: any): UserDisplay {
    const {UserDisplaySchema} = useUserValidation()

    const deserialized = deserializeUser({
        ...user,
        passwordHash: '', // Not needed for display
        systemRoles: user.systemRoles
    })

    const userDisplay = {
        id: deserialized.id!,
        email: deserialized.email,
        phone: deserialized.phone,
        systemRoles: deserialized.systemRoles,
        Inhabitant: user.Inhabitant
    }

    // Schema validation with z.coerce.date() handles birthDate conversion
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

export async function deleteUser(d1Client: D1Database, userId: number): Promise<User> {
    console.info(`🪪 > USER > [DELETE] Deleting user with ID ${userId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {UserResponseSchema} = useUserValidation()

    try {
        const deletedUser = await prisma.user.delete({
            where: {id: userId}
        })

        console.info(`🪪 > USER > [DELETE] Successfully deleted user ${deletedUser.email}`)

        // Deserialize and validate before returning (ADR-010 pattern)
        const deserialized = deserializeUser(deletedUser)
        return UserResponseSchema.parse(deserialized)
    } catch (error) {
        const h3e = h3eFromCatch('Error deleting user', error)
        console.error(`🪪 > USER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchUser(email: string, d1Client: D1Database): Promise<UserWithInhabitant | null> {
    console.info(`🪪 > USER > [GET] Fetching user for email ${email}`)
    const prisma = await getPrismaClientConnection(d1Client)

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
            // Deserialize systemRoles (ADR-010 pattern)
            const deserializedRoles = JSON.parse(user.systemRoles)

            // Add computed shortName to household if inhabitant exists
            if (user.Inhabitant?.household) {
                user.Inhabitant.household.shortName = getHouseholdShortName(user.Inhabitant.household.address)
            }

            console.info(`🪪 > USER > [GET] Successfully fetched user with ID ${user.id} for email ${email}`)
            console.info(`🪪 > USER > [GET] Inhabitant: ${user.Inhabitant ? `id=${user.Inhabitant.id}, household=${user.Inhabitant.household ? user.Inhabitant.household.id : 'NULL'}` : 'NULL'}`)

            // Return with deserialized roles
            return {
                ...user,
                systemRoles: deserializedRoles
            }
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

export async function saveInhabitant(d1Client: D1Database, inhabitant: InhabitantCreate, householdId: number): Promise<Inhabitant> {
    console.info(`👩‍🏠 > INHABITANT > [SAVE] Saving inhabitant ${inhabitant.name} to household ${householdId}`)
    const prisma = await getPrismaClientConnection(d1Client)

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
            return updatedInhabitant
        } else {
            console.info(`👩‍🏠 > INHABITANT > [SAVE] Inhabitant ${inhabitant.name} saved without user profile`)
        }

        return newInhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving inhabitant ${inhabitant.name} to household ${householdId}`, error)
        console.error(`👩‍🏠 > INHABITANT > [SAVE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchInhabitants(d1Client: D1Database): Promise<Inhabitant[]> {
    console.info(`👩‍🏠 > INHABITANT > [GET] Fetching inhabitants`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeWeekDayMap} = useHouseholdValidation()

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

export async function fetchInhabitant(d1Client: D1Database, id: number): Promise<Inhabitant | null> {
    console.info(`👩‍🏠 > INHABITANT > [GET] Fetching inhabitant with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeWeekDayMap} = useHouseholdValidation()

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


export async function updateInhabitant(d1Client: D1Database, id: number, inhabitantData: Partial<InhabitantUpdate>): Promise<Inhabitant> {
    console.info(`👩‍🏠 > INHABITANT > [UPDATE] Updating inhabitant with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const {serializeWeekDayMap, deserializeWeekDayMap} = useHouseholdValidation()

        const updateData: any = {...inhabitantData}

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

export async function deleteInhabitant(d1Client: D1Database, id: number): Promise<Inhabitant> {
    console.info(`👩‍🏠 > INHABITANT > [DELETE] Deleting inhabitant with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {

        // Delete inhabitant - cascade handles strong associations automatically:
        // - Strong associations (Allergies, DinnerPreferences, Orders, CookingTeamAssignments) → CASCADE DELETE
        // TODO check if we need to change prisma setting for cascade and setNull to work properly ?
        const deletedInhabitant = await prisma.inhabitant.delete({
            where: {id}
        })

        console.info(`👩‍🏠 > INHABITANT > [DELETE] Successfully deleted inhabitant ${deletedInhabitant.name} ${deletedInhabitant.lastName}`)
        return deletedInhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting inhabitant with ID ${id}`, error)
        console.error(`👩‍🏠 > INHABITANT > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** ALLERGY TYPES ***/

export async function fetchAllergyTypes(d1Client: D1Database): Promise<AllergyTypeWithInhabitants[]> {
    console.info(`🏥 > ALLERGY_TYPE > [GET] Fetching all allergy types with inhabitants`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const allergyTypes = await prisma.allergyType.findMany({
            include: {
                Allergy: {
                    include: {
                        inhabitant: {
                            select: {
                                id: true,
                                name: true,
                                lastName: true,
                                pictureUrl: true,
                                birthDate: true,
                                household: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        // Transform to AllergyTypeWithInhabitants format
        const result = allergyTypes.map(allergyType => ({
            id: allergyType.id,
            name: allergyType.name,
            description: allergyType.description,
            icon: allergyType.icon,
            inhabitants: allergyType.Allergy.map(allergy => ({
                id: allergy.inhabitant.id,
                name: allergy.inhabitant.name,
                lastName: allergy.inhabitant.lastName,
                pictureUrl: allergy.inhabitant.pictureUrl,
                birthDate: allergy.inhabitant.birthDate,
                householdName: allergy.inhabitant.household.name,
                inhabitantComment: allergy.inhabitantComment
            }))
        }))

        // Sort by number of inhabitants (descending)
        result.sort((a, b) => b.inhabitants.length - a.inhabitants.length)

        console.info(`🏥 > ALLERGY_TYPE > [GET] Successfully fetched ${result.length} allergy types with inhabitants`)
        return result
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching allergy types', error)
        console.error(`🏥 > ALLERGY_TYPE > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchAllergyType(d1Client: D1Database, id: number): Promise<AllergyTypeResponse | null> {
    console.info(`🏥 > ALLERGY_TYPE > [GET] Fetching allergy type with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const allergyType = await prisma.allergyType.findFirst({
            where: {id}
        })

        if (allergyType) {
            console.info(`🏥 > ALLERGY_TYPE > [GET] Found allergy type ${allergyType.name} (ID: ${allergyType.id})`)
            return allergyType
        } else {
            console.info(`🏥 > ALLERGY_TYPE > [GET] No allergy type found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergy type with ID ${id}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function createAllergyType(d1Client: D1Database, allergyTypeData: AllergyTypeCreate): Promise<AllergyTypeResponse> {
    console.info(`🏥 > ALLERGY_TYPE > [CREATE] Creating allergy type ${allergyTypeData.name}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const newAllergyType = await prisma.allergyType.create({
            data: allergyTypeData
        })

        console.info(`🏥 > ALLERGY_TYPE > [CREATE] Successfully created allergy type ${newAllergyType.name} with ID ${newAllergyType.id}`)
        return newAllergyType
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating allergy type ${allergyTypeData.name}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function updateAllergyType(d1Client: D1Database, allergyTypeData: AllergyTypeUpdate): Promise<AllergyTypeResponse> {
    console.info(`🏥 > ALLERGY_TYPE > [UPDATE] Updating allergy type with ID ${allergyTypeData.id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    const {id, ...updateData} = allergyTypeData

    try {
        const updatedAllergyType = await prisma.allergyType.update({
            where: {id},
            data: updateData
        })

        console.info(`🏥 > ALLERGY_TYPE > [UPDATE] Successfully updated allergy type ${updatedAllergyType.name}`)
        return updatedAllergyType
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating allergy type with ID ${id}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [UPDATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteAllergyType(d1Client: D1Database, id: number): Promise<AllergyTypeResponse> {
    console.info(`🏥 > ALLERGY_TYPE > [DELETE] Deleting allergy type with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // ADR-005: Single atomic delete - Prisma handles CASCADE deletion of related allergies
        const deletedAllergyType = await prisma.allergyType.delete({
            where: {id}
        })

        console.info(`🏥 > ALLERGY_TYPE > [DELETE] Successfully deleted allergy type ${deletedAllergyType.name}`)
        return deletedAllergyType
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting allergy type with ID ${id}`, error)
        console.error(`🏥 > ALLERGY_TYPE > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** ALLERGIES ***/

export async function fetchAllergiesForInhabitant(d1Client: D1Database, inhabitantId: number): Promise<AllergyWithRelations[]> {
    console.info(`🏥 > ALLERGY > [GET] Fetching allergies for inhabitant ID ${inhabitantId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const allergies = await prisma.allergy.findMany({
            where: {inhabitantId},
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [GET] Successfully fetched ${allergies.length} allergies for inhabitant ${inhabitantId}`)
        return allergies
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergies for inhabitant ${inhabitantId}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchAllergiesForHousehold(d1Client: D1Database, householdId: number): Promise<AllergyWithRelations[]> {
    console.info(`🏥 > ALLERGY > [GET] Fetching allergies for household ID ${householdId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const allergies = await prisma.allergy.findMany({
            where: {
                inhabitant: {
                    householdId
                }
            },
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [GET] Successfully fetched ${allergies.length} allergies for household ${householdId}`)
        return allergies
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergies for household ${householdId}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchAllergiesForAllergyType(d1Client: D1Database, allergyTypeId: number): Promise<AllergyResponse[]> {
    console.info(`🏥 > ALLERGY > [GET] Fetching allergies for allergy type ID ${allergyTypeId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const allergies = await prisma.allergy.findMany({
            where: {allergyTypeId},
            include: {
                allergyType: true,
                inhabitant: {
                    include: {
                        household: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [GET] Successfully fetched ${allergies.length} allergies for allergy type ${allergyTypeId}`)
        return allergies
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergies for allergy type ${allergyTypeId}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchAllergy(d1Client: D1Database, id: number): Promise<AllergyWithRelations | null> {
    console.info(`🏥 > ALLERGY > [GET] Fetching allergy with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const allergy = await prisma.allergy.findFirst({
            where: {id},
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        if (allergy) {
            console.info(`🏥 > ALLERGY > [GET] Found allergy (ID: ${allergy.id})`)
            return allergy
        } else {
            console.info(`🏥 > ALLERGY > [GET] No allergy found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching allergy with ID ${id}`, error)
        console.error(`🏥 > ALLERGY > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function createAllergy(d1Client: D1Database, allergyData: AllergyCreate): Promise<AllergyWithRelations> {
    console.info(`🏥 > ALLERGY > [CREATE] Creating allergy for inhabitant ID ${allergyData.inhabitantId} with allergy type ID ${allergyData.allergyTypeId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const newAllergy = await prisma.allergy.create({
            data: allergyData,
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [CREATE] Successfully created allergy with ID ${newAllergy.id}`)
        return newAllergy
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating allergy for inhabitant ${allergyData.inhabitantId}`, error)
        console.error(`🏥 > ALLERGY > [CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function updateAllergy(d1Client: D1Database, allergyData: AllergyUpdate): Promise<AllergyWithRelations> {
    console.info(`🏥 > ALLERGY > [UPDATE] Updating allergy with ID ${allergyData.id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    const {id, ...updateData} = allergyData

    try {
        const updatedAllergy = await prisma.allergy.update({
            where: {id},
            data: updateData,
            include: {
                allergyType: true,
                inhabitant: {
                    select: {
                        id: true,
                        name: true,
                        lastName: true,
                        pictureUrl: true,
                        birthDate: true
                    }
                }
            }
        })

        console.info(`🏥 > ALLERGY > [UPDATE] Successfully updated allergy with ID ${updatedAllergy.id}`)
        return updatedAllergy
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating allergy with ID ${id}`, error)
        console.error(`🏥 > ALLERGY > [UPDATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteAllergy(d1Client: D1Database, id: number): Promise<AllergyResponse> {
    console.info(`🏥 > ALLERGY > [DELETE] Deleting allergy with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const deletedAllergy = await prisma.allergy.delete({
            where: {id}
        })

        console.info(`🏥 > ALLERGY > [DELETE] Successfully deleted allergy with ID ${deletedAllergy.id}`)
        return deletedAllergy
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting allergy with ID ${id}`, error)
        console.error(`🏥 > ALLERGY > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** HOUSEHOLDS ***/

export async function saveHousehold(d1Client: D1Database, household: HouseholdCreate): Promise<Household> {
    console.info(`🏠 > HOUSEHOLD > [SAVE] Saving household at ${household.address} (Heynabo ID: ${household.heynaboId})`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const data = {
            heynaboId: household.heynaboId,
            pbsId: household.pbsId,
            movedInDate: household.movedInDate,
            moveOutDate: household.moveOutDate,
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

        return {
            ...newHousehold,
            shortName: getHouseholdShortName(newHousehold.address)
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving household at ${household?.address}`, error)
        console.error(`🏠 > HOUSEHOLD > [SAVE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

// ADR-009 & ADR-010: Returns HouseholdSummary (all scalar fields + lightweight inhabitant relation)
export async function fetchHouseholds(d1Client: D1Database): Promise<import('~/composables/useHouseholdValidation').HouseholdSummary[]> {
    console.info(`🏠 > HOUSEHOLD > [GET] Fetching households with lightweight inhabitant data`)
    const prisma = await getPrismaClientConnection(d1Client)

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

        // ADR-010: Deserialize database format to domain format + add computed shortName
        const householdsWithShortName = households.map(household => ({
            ...household,
            movedInDate: new Date(household.movedInDate),
            moveOutDate: household.moveOutDate ? new Date(household.moveOutDate) : null,
            shortName: getHouseholdShortName(household.address),
            inhabitants: household.inhabitants.map(inhabitant => ({
                ...inhabitant,
                birthDate: inhabitant.birthDate ? new Date(inhabitant.birthDate) : null
            }))
        }))

        console.info(`🏠 > HOUSEHOLD > [GET] Successfully fetched ${households.length} households`)
        return householdsWithShortName
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching households', error)
        console.error(`🏠 > HOUSEHOLD > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchHousehold(d1Client: D1Database, id: number): Promise<HouseholdWithInhabitants | null> {
    console.info(`🏠 > HOUSEHOLD > [GET] Fetching household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const {deserializeWeekDayMap} = useHouseholdValidation()

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

        // ADR-010: Deserialize database format to domain format
        const inhabitantsWithDeserializedData = household.inhabitants.map(inhabitant => ({
            ...inhabitant,
            birthDate: inhabitant.birthDate ? new Date(inhabitant.birthDate) : null,
            dinnerPreferences: inhabitant.dinnerPreferences
                ? deserializeWeekDayMap(inhabitant.dinnerPreferences)
                : null
        }))

        // Add computed shortName (domain logic)
        const householdWithShortName = {
            ...household,
            movedInDate: new Date(household.movedInDate),
            moveOutDate: household.moveOutDate ? new Date(household.moveOutDate) : null,
            shortName: getHouseholdShortName(household.address),
            inhabitants: inhabitantsWithDeserializedData
        }

        console.info(`🏠 > HOUSEHOLD > [GET] Successfully fetched household ${household.name} with ${household.inhabitants?.length ?? 0} inhabitants`)
        return householdWithShortName
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching household with ID ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function updateHousehold(d1Client: D1Database, id: number, householdData: Partial<HouseholdCreate>): Promise<Household> {
    console.info(`🏠 > HOUSEHOLD > [UPDATE] Updating household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const updatedHousehold = await prisma.household.update({
            where: {id},
            data: householdData
        })

        // Add computed shortName field + deserialize dates
        const householdWithShortName = {
            ...updatedHousehold,
            movedInDate: new Date(updatedHousehold.movedInDate),
            moveOutDate: updatedHousehold.moveOutDate ? new Date(updatedHousehold.moveOutDate) : null,
            shortName: getHouseholdShortName(updatedHousehold.address)
        }

        console.info(`🏠 > HOUSEHOLD > [UPDATE] Successfully updated household ${updatedHousehold.name} with ID ${id}`)
        return householdWithShortName
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating household with id ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [UPDATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteHousehold(d1Client: D1Database, id: number): Promise<Household> {
    console.info(`🏠 > HOUSEHOLD > [DELETE] Deleting household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const deletedHousehold = await prisma.household.delete({
            where: {id}
        })
        console.info(`🏠 > HOUSEHOLD > [DELETE] Successfully deleted household ${deletedHousehold.name} with ID ${id}`)
        return deletedHousehold
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting household with id ${id}`, error)
        console.error(`🏠 > HOUSEHOLD > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

/*** SEASON AGGREGATE ROOT - aggregates team assignments, teams, and dinner events ***/

// Get serialization utilities
const {serializeSeason, deserializeSeason} = useSeasonValidation()

export async function fetchSeasonForRange(d1Client: D1Database, start: string, end: string): Promise<DomainSeason | null> {
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

export async function fetchCurrentSeason(d1Client: D1Database): Promise<DomainSeason | null> {
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

export async function fetchSeason(d1Client: D1Database, id: number): Promise<DomainSeason | null> {
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
                        }
                    }
                },
                ticketPrices: true
            }
        })

        if (season) {
            console.info(`🌞 > SEASON > [GET] Found season ${season.shortName} (ID: ${season.id})`)
            return deserializeSeason(season)
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

export async function fetchSeasons(d1Client: D1Database): Promise<DomainSeason[]> {
    console.info(`🌞 > SEASON > [GET] Fetching all seasons`)
    const prisma = await getPrismaClientConnection(d1Client)

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
        return seasons.map(season => deserializeSeason(season))
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

export async function createSeason(d1Client: D1Database, seasonData: DomainSeason): Promise<DomainSeason> {
    console.info(`🌞 > SEASON > [CREATE] Creating season ${seasonData.shortName}`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Serialize domain object to database format
    const serialized = serializeSeason(seasonData)

    // Exclude id and read-only relation fields from create
    const {id, dinnerEvents, CookingTeams, ticketPrices, ...createData} = serialized

    try {
        const newSeason = await prisma.season.create({
            data: {
                ...createData,
                ticketPrices: ticketPrices ? { create: ticketPrices } : undefined
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

export async function updateSeason(d1Client: D1Database, seasonData: DomainSeason): Promise<DomainSeason> {
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
const {serializeCookingTeam, deserializeCookingTeam} = useCookingTeamValidation()

export async function createTeamAssignment(d1Client: D1Database, assignmentData: any): Promise<any> {
    console
        .info(`👥🔗 > ASSIGNMENT > [CREATE] Creating team assignment for inhabitant ${assignmentData.inhabitantId} in team ${assignmentData.cookingTeamId} with role ${assignmentData.role}`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Extract affinity for conditional handling
    const {affinity, ...createData} = assignmentData

    try {
        const assignment = await prisma.cookingTeamAssignment.create({
            data: {
                ...createData,
                // Use Prisma.skip to omit field entirely when affinity is null/undefined
                affinity: affinity ?? PrismaFromClient.skip
            },
            include: {
                inhabitant: true,
                cookingTeam: true
            }
        })

        console.info(`👥🔗 > ASSIGNMENT > [CREATE] Successfully created team assignment with ID ${assignment.id}`)
        return assignment
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating team assignment for inhabitant ${assignmentData.inhabitantId}`, error)
        console.error(`👥🔗 > ASSIGNMENT > [CREATE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function fetchTeamAssignment(d1Client: D1Database, id: number): Promise<Promise<CookingTeamAssignmentWithRelations | null> | null> {
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
        } else {
            console.info(`👥🔗 > ASSIGNMENT > [GET] No assignment found with ID ${id}`)
        }
        return assignment
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

export async function fetchTeams(d1Client: D1Database, seasonId?: number): Promise<any[]> {
    console.info(`👥 > TEAM > [GET] Fetching teams${seasonId ? ` for season ${seasonId}` : ''}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const teams = await prisma.cookingTeam.findMany({
            where: seasonId ? {seasonId} : undefined,
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Deserialize from database format
        const deserializedTeams = teams.map(team => deserializeCookingTeam(team))

        console.info(`👥 > TEAM > [GET] Successfully fetched ${teams.length} teams`, 'Season: ', seasonId ? ` for season ${seasonId}` : '')
        return deserializedTeams
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching teams for season ${seasonId}`, error)
        console.error(`👥 > TEAM > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

export async function fetchTeam(d1Client: D1Database, id: number): Promise<any | null> {
    console.info(`👥 > TEAM > [GET] Fetching team with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const team = await prisma.cookingTeam.findFirst({
            where: {id},
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                },
                dinners: true
            }
        })

        if (team) {
            console.info(`👥 > TEAM > [GET] Found team ${team.name} (ID: ${team.id})`)

            // Deserialize from database format
            return deserializeCookingTeam(team)
        } else {
            console.info(`👥 > TEAM > [GET] No team found with ID ${id}`)
        }
        return null
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching team with ID ${id}`, error)
        console.error(`👥 > TEAM > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

export async function createTeam(d1Client: D1Database, teamData: CookingTeamWithMembers): Promise<CookingTeamWithMembers> {
    console.info(`👥 > TEAM > [CREATE] Creating team ${teamData.name}`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Serialize domain object to database format
    const serialized = serializeCookingTeam(teamData)

    // Exclude id and read-only relation fields from create
    const {id, assignments, affinity, ...createData} = serialized

    try {
        const newTeam = await prisma.cookingTeam.create({
            data: {
                ...createData,
                // Use Prisma.skip to omit field entirely when affinity is null/undefined
                affinity: affinity ?? PrismaFromClient.skip,
                assignments: assignments?.length ? { create: assignments } : undefined
            },
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                }
            }
        })

        console.info(`👥 > TEAM > [CREATE] Successfully created team ${newTeam.name} with ID ${newTeam.id}`)

        // Deserialize before returning
        return deserializeCookingTeam(newTeam)
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating team ${teamData.name}`, error)
        console.error(`👥 > TEAM > [CREATE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function updateTeam(d1Client: D1Database, id: number, teamData: Partial<CookingTeamWithMembers>): Promise<CookingTeamWithMembers> {
    console.info(`👥 > TEAM > [UPDATE] Updating team with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    // Serialize domain object to database format
    const serialized = serializeCookingTeam(teamData)

    // Exclude id and read-only relation fields from update
    const {id: teamId, assignments, affinity, ...updateData} = serialized

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
                } : undefined
            },
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                }
            }
        })
        console.info(`👥 > TEAM > [UPDATE] Successfully updated team ${updatedTeam.name} (ID: ${updatedTeam.id})`)

        // Deserialize before returning
        return deserializeCookingTeam(updatedTeam)
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating team with ID ${id}`, error)
        console.error(`👥 > TEAM > [UPDATE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function deleteTeam(d1Client: D1Database, id: number): Promise<CookingTeam> {
    console.info(`👥 > TEAM > [DELETE] Deleting team with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        // Delete team - cascade will handle strong associations (CookingTeamAssignments) automatically, and clear weak associations
        const deletedTeam = await prisma.cookingTeam.delete({
            where: {id}
        })

        console.info(`👥 > TEAM > [DELETE] Successfully deleted team ${deletedTeam.name}`)
        return deletedTeam
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting team with ID ${id}`, error)
        console.error(`👥 > TEAM > [DELETE] ${h3e.message}`, error)
        throw h3e
    }
}

/*** SEASON > DINNER EVENTS ***/

// ADR-005: DinnerEvent relationships:
// - Strong to Season (events are part of season's dining schedule)
// - Weak to CookingTeam (event can exist without assigned team)
// - Weak to Inhabitant chef (event can exist without assigned chef)

export async function saveDinnerEvent(d1Client: D1Database, dinnerEvent: DinnerEventCreate): Promise<DinnerEvent> {
    console.info(`🍽️ > DINNER_EVENT > [SAVE] Saving dinner event ${dinnerEvent.menuTitle} on ${dinnerEvent.date}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const newDinnerEvent = await prisma.dinnerEvent.create({
            data: dinnerEvent
        })

        console.info(`🍽️ > DINNER_EVENT > [SAVE] Successfully saved dinner event ${newDinnerEvent.menuTitle} with ID ${newDinnerEvent.id}`)
        return newDinnerEvent
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving dinner event ${dinnerEvent?.menuTitle}`, error)
        console.error(`🍽️ > DINNER_EVENT > [SAVE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function fetchDinnerEvents(d1Client: D1Database, seasonId?: number): Promise<DinnerEvent[]> {
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner events${seasonId ? ` for season ${seasonId}` : ''}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const dinnerEvents = await prisma.dinnerEvent.findMany({
            where: seasonId ? {seasonId} : undefined,
            include: {
                Season: true,
                chef: true,
                cookingTeam: {
                    include: {
                        season: true
                    }
                }
            },
            orderBy: {
                date: 'asc'
            }
        })

        console.info(`🍽️ > DINNER_EVENT > [GET] Successfully fetched ${dinnerEvents.length} dinner events${seasonId ? ` for season ${seasonId}` : ''}`)
        return dinnerEvents
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching dinner events${seasonId ? ` for season ${seasonId}` : ''}`, error)
        console.error(`🍽️ > DINNER_EVENT > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

export async function fetchDinnerEvent(d1Client: D1Database, id: number): Promise<DinnerEvent | null> {
    console.info(`🍽️ > DINNER_EVENT > [GET] Fetching dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const dinnerEvent = await prisma.dinnerEvent.findFirst({
            where: {id},
            include: {
                Season: true,
                chef: true,
                cookingTeam: {
                    include: {
                        season: true
                    }
                }
            }
        })

        if (dinnerEvent) {
            console.info(`🍽️ > DINNER_EVENT > [GET] Found dinner event ${dinnerEvent.menuTitle} (ID: ${dinnerEvent.id})`)
        } else {
            console.info(`🍽️ > DINNER_EVENT > [GET] No dinner event found with ID ${id}`)
        }
        return dinnerEvent
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching dinner event with ID ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

export async function updateDinnerEvent(d1Client: D1Database, id: number, dinnerEventData: Partial<DinnerEventCreate>): Promise<DinnerEvent> {
    console.info(`🍽️ > DINNER_EVENT > [UPDATE] Updating dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const updatedDinnerEvent = await prisma.dinnerEvent.update({
            where: {id},
            data: dinnerEventData,
            include: {
                Season: true,
                chef: true,
                cookingTeam: true
            }
        })

        console.info(`🍽️ > DINNER_EVENT > [UPDATE] Successfully updated dinner event ${updatedDinnerEvent.menuTitle} (ID: ${updatedDinnerEvent.id})`)
        return updatedDinnerEvent
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating dinner event with ID ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [UPDATE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function deleteDinnerEvent(d1Client: D1Database, id: number): Promise<DinnerEvent> {
    console.info(`🍽️ > DINNER_EVENT > [DELETE] Deleting dinner event with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const deletedDinnerEvent = await prisma.dinnerEvent.delete({
            where: {id}
        })

        console.info(`🍽️ > DINNER_EVENT > [DELETE] Successfully deleted dinner event ${deletedDinnerEvent.menuTitle}`)
        return deletedDinnerEvent
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting dinner event with ID ${id}`, error)
        console.error(`🍽️ > DINNER_EVENT > [DELETE] ${h3e.message}`, error)
        throw h3e
    }
}

/*** ORDERS ***/

// ADR-005: Order relationships:
// - Strong to DinnerEvent (order cannot exist without dinner event)
// - Strong to Inhabitant (order cannot exist without inhabitant)
// - Weak to Transaction (order can exist without transaction)

export async function createOrder(d1Client: D1Database, orderData: OrderCreate): Promise<Order> {
    console.info(`🎟️ > ORDER > [CREATE] Creating order for inhabitant ${orderData.inhabitantId} on dinner event ${orderData.dinnerEventId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const ticketPrice = await prisma.ticketPrice.findUnique({
            where: { id: orderData.ticketPriceId }
        })

        if (!ticketPrice) {
            throw createError({
                statusCode: 404,
                message: `Ticket price with ID ${orderData.ticketPriceId} not found`
            })
        }

        const newOrder = await prisma.order.create({
            data: {
                ...orderData,
                priceAtBooking: ticketPrice.price
            }
        })

        console.info(`🎟️ > ORDER > [CREATE] Successfully created order with ID ${newOrder.id}`)
        return {
            ...newOrder,
            ticketType: ticketPrice.ticketType
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating order for inhabitant ${orderData.inhabitantId}`, error)
        console.error(`🎟️ > ORDER > [CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchOrder(d1Client: D1Database, id: number): Promise<Order | null> {
    console.info(`🎟️ > ORDER > [GET] Fetching order with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const order = await prisma.order.findFirst({
            where: {id},
            include: {
                ticketPrice: {
                    select: {
                        ticketType: true
                    }
                }
            }
        })

        if (order) {
            console.info(`🎟️ > ORDER > [GET] Successfully fetched order with ID ${order.id}`)
            return {
                ...order,
                ticketType: order.ticketPrice.ticketType,
                ticketPrice: undefined
            }
        } else {
            console.info(`🎟️ > ORDER > [GET] No order found with ID ${id}`)
            return null
        }
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching order with ID ${id}`, error)
        console.error(`🎟️ > ORDER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteOrder(d1Client: D1Database, id: number): Promise<Order> {
    console.info(`🎟️ > ORDER > [DELETE] Deleting order with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        // Delete order - cascade handles strong associations (Transaction) automatically
        const deletedOrder = await prisma.order.delete({
            where: {id}
        })

        console.info(`🎟️ > ORDER > [DELETE] Successfully deleted order with ID ${deletedOrder.id}`)
        return deletedOrder
    } catch (error) {
        const h3e = h3eFromCatch(`Error deleting order with ID ${id}`, error)
        console.error(`🎟️ > ORDER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchOrders(d1Client: D1Database, dinnerEventId?: number): Promise<Order[]> {
    console.info(`🎟️ > ORDER > [GET] Fetching orders${dinnerEventId ? ` for dinner event ${dinnerEventId}` : ''}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const orders = await prisma.order.findMany({
            where: dinnerEventId ? {dinnerEventId} : undefined,
            orderBy: {
                createdAt: 'asc'
            }
        })

        console.info(`🎟️ > ORDER > [GET] Successfully fetched ${orders.length} orders${dinnerEventId ? ` for dinner event ${dinnerEventId}` : ''}`)
        return orders
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching orders${dinnerEventId ? ` for dinner event ${dinnerEventId}` : ''}`, error)
        console.error(`🎟️ > ORDER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}
