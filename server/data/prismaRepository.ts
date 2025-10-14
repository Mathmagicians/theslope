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
    TicketPrice as PrismaTicketPrice
} from "@prisma/client"

import type {SerializedSeason} from "~/composables/useSeasonValidation"
import type {TicketPrice} from "~/composables/useTicketPriceValidation"
import type {InhabitantCreate, HouseholdCreate} from '~/composables/useHouseholdValidation'
import type {DinnerEventCreate} from '~/composables/useDinnerEventValidation'
import type {CookingTeam as CookingTeamCreate, TeamRole as TeamRoleCreate} from '~/composables/useCookingTeamValidation'
import type {UserCreate} from '~/composables/useUserValidation'

export type UserWithInhabitant = PrismaFromClient.UserGetPayload<{
    include: { Inhabitant: true }
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

// ADR-009: Lightweight type for list display (index endpoint)
export type HouseholdSummary = PrismaFromClient.HouseholdGetPayload<{
    include: {
        inhabitants: {
            select: {
                id: true
                name: true
                lastName: true
                pictureUrl: true
                birthDate: true
            }
        }
    }
}>

// ADR-009: Comprehensive type for detail operations (detail endpoint)
export type HouseholdWithInhabitants = PrismaFromClient.HouseholdGetPayload<{
    include: {
        inhabitants: true
    }
}>

const {h3eFromCatch, h3eFromPrismaError} = eventHandlerHelper

export async function getPrismaClientConnection(d1Client: D1Database) {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter})
    await prisma.$connect()
    return prisma
}

/*** USERS ***/

export async function saveUser(d1Client: D1Database, user: UserCreate): Promise<User> {
    console.info(`👨‍💻 > USER > [SAVE] Saving user ${user.email}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const newUser = await prisma.user.upsert({
            where: {email: user.email},
            create: user,
            update: user
        })
        console.info(`👨‍💻 > USER > [SAVE] Successfully saved user ${newUser.email} with ID ${newUser.id}`)
        return newUser
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving user ${user.email}`, error)
        console.error(`👨‍💻 > USER > [SAVE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchUsers(d1Client: D1Database): Promise<User[]> {
    console.info(`👨‍💻 > USER > [GET] Fetching users from database`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const users = await prisma.user.findMany()
        console.info(`👨‍💻 > USER > [GET] Successfully fetched ${users.length} users`)
        return users
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching users', error)
        console.error(`👨‍💻 > USER > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function deleteUser(d1Client: D1Database, userId: number): Promise<User> {
    console.info(`👨‍💻 > USER > [DELETE] Deleting user with ID ${userId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const deletedUser = await prisma.user.delete({
            where: {id: userId}
        })

        console.info(`👨‍💻 > USER > [DELETE] Successfully deleted user ${deletedUser.email}`)
        return deletedUser
    } catch (error) {
        const h3e = h3eFromCatch('Error deleting user', error)
        console.error(`👨‍💻 > USER > [DELETE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchUser(email: string, d1Client: D1Database): Promise<UserWithInhabitant | null> {
    console.info(`👨‍💻 > USER > [GET] Fetching user for email ${email}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const user = await prisma.user.findUnique({
            where: {email},
            include: {Inhabitant: true}
        })

        if (user) {
            console.info(`👨‍💻 > USER > [GET] Successfully fetched user with ID ${user.id} for email ${email}`)
        } else {
            console.info(`👨‍💻 > USER > [GET] No user found for email ${email}`)
        }
        return user
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching user for email ${email}`, error)
        console.error(`👨‍💻 > USER > [GET] ${h3e.statusMessage}`, error)
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

    try {
        const inhabitants = await prisma.inhabitant.findMany()
        console.info(`👩‍🏠 > INHABITANT > [GET] Successfully fetched ${inhabitants.length} inhabitants`)
        return inhabitants
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching inhabitants', error)
        console.error(`👩‍🏠 > INHABITANT > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchInhabitant(d1Client: D1Database, id: number): Promise<Inhabitant | null> {
    console.info(`👩‍🏠 > INHABITANT > [GET] Fetching inhabitant with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const inhabitant = await prisma.inhabitant.findFirst({
            where: {id}
        })
        console.info(`👩‍🏠 > INHABITANT > [GET] Successfully fetched inhabitant ${inhabitant?.name} with ID ${id}`)
        return inhabitant
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching inhabitant with ID ${id}`, error)
        console.error(`👩‍🏠 > INHABITANT > [GET] ${h3e.statusMessage}`, error)
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

        return newHousehold
    } catch (error) {
        const h3e = h3eFromCatch(`Error saving household at ${household?.address}`, error)
        console.error(`🏠 > HOUSEHOLD > [SAVE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

// ADR-009: Index endpoint returns lightweight inhabitant data
export async function fetchHouseholds(d1Client: D1Database): Promise<HouseholdSummary[]> {
    console.info(`🏠 > HOUSEHOLD > [GET] Fetching households with basic inhabitant data`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const households = await prisma.household.findMany({
            include: {
                inhabitants: {
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
        console.info(`🏠 > HOUSEHOLD > [GET] Successfully fetched ${households.length} households`)
        return households
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching households', error)
        console.error(`🏠 > HOUSEHOLD > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchHousehold(d1Client: D1Database, id: number): Promise<HouseholdWithInhabitants | null> {
    console.info(`🏠 > HOUSEHOLD > [GET] Fetching household with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const household = await prisma.household.findFirst({
            where: {id},
            include: {
                inhabitants: true
            }
        })
        console.info(`🏠 > HOUSEHOLD > [GET] Successfully fetched household ${household?.name} with ${household?.inhabitants?.length ?? 0} inhabitants`)
        return household ?? null
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
        console.info(`🏠 > HOUSEHOLD > [UPDATE] Successfully updated household ${updatedHousehold.name} with ID ${id}`)
        return updatedHousehold
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
        } else {
            console.info(`🌞 > SEASON > [GET] No season found for range ${start} to ${end}`)
        }
        return season
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
        } else {
            console.info(`🌞 > SEASON > [GET] No active season found`)
        }
        return season
    } catch (error) {
        const h3e = h3eFromCatch('Error fetching current active season', error)
        console.error(`🌞 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchSeason(d1Client: D1Database, id: number): Promise<SeasonWithRelations | null> {
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
        } else {
            console.info(`🌞 > SEASON > [GET] No season found with ID ${id}`)
        }
        return season
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching season with ID ${id}`, error)
        console.error(`🌞 > SEASON > [GET] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function fetchSeasons(d1Client: D1Database): Promise<Season[]> {
    console.info(`🌞 > SEASON > [GET] Fetching all seasons`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const seasons = await prisma.season.findMany({
            orderBy: {
                seasonDates: 'desc'
            }
        })
        console.info(`🌞 > SEASON > [GET] Successfully fetched ${seasons.length} seasons`)
        return seasons
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

export async function createSeason(d1Client: D1Database, seasonData: SerializedSeason): Promise<SeasonWithRelations> {
    console.info(`🌞 > SEASON > [CREATE] Creating season ${seasonData.shortName}`)
    const prisma = await getPrismaClientConnection(d1Client)
    // Exclude id and read-only relation fields from create
    const {id, dinnerEvents, CookingTeams, ticketPrices, ...createData} = seasonData

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
        return newSeason
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating season ${seasonData?.shortName}`, error)
        console.error(`🌞 > SEASON > [CREATE] ${h3e.statusMessage}`, error)
        throw h3e
    }
}

export async function updateSeason(d1Client: D1Database, seasonData: Season): Promise<Season> {
    console.info(`🌞 > SEASON > [UPDATE] Updating season with ID ${seasonData.id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    // Exclude id and read-only relation fields from update
    const {id, dinnerEvents, CookingTeams, ticketPrices, ...updateData} = seasonData
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
        return updatedSeason
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

export async function createTeamAssignment(d1Client: D1Database, teamId: number, inhabitantId: number, role: TeamRoleCreate): Promise<any> {
    console
        .info(`👥🔗 > ASSIGNMENT > [CREATE] Creating team assignment for inhabitant ${inhabitantId} in team ${teamId} with role ${role}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const assignment = await prisma.cookingTeamAssignment.create({
            data: {
                cookingTeamId: teamId,
                inhabitantId: inhabitantId,
                role: role
            },
            include: {
                inhabitant: true,
                cookingTeam: true
            }
        })

        console.info(`👥🔗 > ASSIGNMENT > [CREATE] Successfully created team assignment with ID ${assignment.id}`)
        return assignment
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating team assignment for inhabitant ${inhabitantId}`, error)
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

        // Transform assignments array into role-based arrays for backward compatibility
        const transformedTeams = teams.map(team => ({
            ...team,
            chefs: team.assignments.filter(a => a.role === 'CHEF'),
            cooks: team.assignments.filter(a => a.role === 'COOK'),
            juniorHelpers: team.assignments.filter(a => a.role === 'JUNIORHELPER')
        }))

        console.info(`👥 > TEAM > [GET] Successfully fetched ${teams.length} teams`, 'Season: ', seasonId ? ` for season ${seasonId}` : '')
        return transformedTeams
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
            // Transform assignments array into role-based arrays for backward compatibility
            return {
                ...team,
                chefs: team.assignments.filter(a => a.role === 'CHEF'),
                cooks: team.assignments.filter(a => a.role === 'COOK'),
                juniorHelpers: team.assignments.filter(a => a.role === 'JUNIORHELPER')
            }
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

export async function createTeam(d1Client: D1Database, teamData: CookingTeamCreate): Promise<CookingTeam> {
    console.info(`👥 > TEAM > [CREATE] Creating team ${teamData.name}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const newTeam = await prisma.cookingTeam.create({
            data: teamData,
            include: {
                season: true
            }
        })

        console.info(`👥 > TEAM > [CREATE] Successfully created team ${newTeam.name} with ID ${newTeam.id}`)
        return newTeam
    } catch (error) {
        const h3e = h3eFromCatch(`Error creating team ${teamData.name}`, error)
        console.error(`👥 > TEAM > [CREATE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function updateTeam(d1Client: D1Database, id: number, teamData: Partial<CookingTeamCreate>): Promise<CookingTeam> {
    console.info(`👥 > TEAM > [UPDATE] Updating team with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        const updatedTeam = await prisma.cookingTeam.update({
            where: {id},
            data: teamData,
            include: {
                season: true
            }
        })
        console.info(`👥 > TEAM > [UPDATE] Successfully updated team ${updatedTeam.name} (ID: ${updatedTeam.id})`)
        return updatedTeam
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
                season: true,
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
