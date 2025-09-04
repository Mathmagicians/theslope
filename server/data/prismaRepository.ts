import {PrismaD1} from "@prisma/adapter-d1"
import {Season, User, Inhabitant, Household, Prisma as PrismaFromClient, PrismaClient} from "@prisma/client"
import HouseholdCreateInput = PrismaFromClient.HouseholdCreateInput
import InhabitantCreateInput = PrismaFromClient.InhabitantCreateInput
import SeasonCreateInput = PrismaFromClient.SeasonCreateInput

export async function getPrismaClientConnection(d1Client: D1Database) {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter})
    await prisma.$connect()
    return prisma
}

export async function saveUser(d1Client: D1Database, user: PrismaFromClient.UserCreateInput): Promise<User> {
    const prisma = await getPrismaClientConnection(d1Client)
    const newUser = await prisma.user.upsert({
        where: {email: user.email}, // unique constraint used to check if it exists (update) or not (create)
        create: user,
        update: user
    })
    console.info(">>>👨‍💻 SAVED > user: ", user.email)
    return newUser
}

export async function fetchUsers(d1Client: D1Database): Promise<User[]> {
    const prisma =  await getPrismaClientConnection(d1Client)
    const users = await prisma.user.findMany()
    console.log(`<<<👨‍💻‍ > FETCH > got ${users.length} users from database`)
    return users
}

export async function deleteUser(d1Client: D1Database, userId: number): Promise<User> {
    console.log(`>>>👨‍💻 DELETE > Deleting user with ID ${userId}`)
    const prisma = await getPrismaClientConnection(d1Client)
    
    try {
        // Get the user with associated Inhabitant
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { Inhabitant: true }
        })
        
        if (!user) {
            throw new Error('Record to delete does not exist')
        }
        
        // If user has an Inhabitant, delete the Inhabitant first
        if (user.Inhabitant) {
            // Delete the Inhabitant
            await prisma.inhabitant.delete({
                where: { id: user.Inhabitant.id }
            })
        }
        
        // Now delete the user
        const deletedUser = await prisma.user.delete({
            where: { id: userId }
        })
        
        console.log(`<<<👨‍💻 DELETE > Successfully deleted user ${deletedUser.email}`)
        return deletedUser
    } catch (e) {
        const errStr = `>>>👨‍💻 DELETE > Error deleting user with ID ${userId}`
        console.error(errStr, e)
        
        // Re-throw the error with the message intact so we can check for specific messages
        if (e.message?.includes('Record to delete does not exist')) {
            throw new Error('Record to delete does not exist')
        }
        
        // Re-throw with more details
        throw new Error(`${errStr}: ${e.message}`)
    }
}

export async function fetchUser( email: string, d1Client: D1Database) {
    console.log( `>>> 👨‍💻 > FETCH > user from database for email ${email}`)
    const prisma = await getPrismaClientConnection(d1Client)
    
    // Go back to original implementation - using findUnique
    const user = await prisma.user.findUnique({
        where: {
            email: email
        },
        include: {
            Inhabitant: true
        }
    })
    console.log( `<<< 👨‍💻 > FETCHED > user with id ${user?.id} from database for email ${email}`)
    return user
}


export async function saveInhabitant(d1Client: D1Database, inhabitant: InhabitantCreateInput, householdId: number): Promise<Inhabitant> {
    const prisma = await getPrismaClientConnection(d1Client)
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
        where: {heynaboId: inhabitant.heynaboId}, // unique constraint used to check if it exists (update) or not (create)
        create: data,
        update: data
    })
    console.info(`>>> 👩‍🏠 SAVED > inhabitant -- ${inhabitant.name} -- to household ${householdId}`)


    if (inhabitant.user) {
        const newUser = await saveUser(d1Client, inhabitant.user)
      //  update inhabitant with user
        const updatedInhabitant = await prisma.inhabitant.update({
            where: {id: newInhabitant.id},
            data: {
                user: {
                    connect: {id: newUser.id}
                }
            }
        })
        console.info(`>>>> 👩‍🏠 UPDATED > Updated inhabitants ${inhabitant.name} user profile in household ${householdId}`)

        return updatedInhabitant
    } else {
        console.info(`>>>> 👩‍🏠 SAVE > inhabitant ${inhabitant.name} in household ${householdId} doesnt have a user profile`)
    }

    return newInhabitant
}

export async function fetchInhabitants(d1Client: D1Database): Promise<Inhabitant[]> {
    console.log(">>>👩‍🏠 Fetching inhabitants, from d1 client: ", d1Client)
    const prisma = await getPrismaClientConnection(d1Client)
    const inhabitants = await prisma.inhabitant.findMany()
    console.log(`<<<👩‍🏠 Got ${inhabitants.length} users from database`)
    return inhabitants
}


export async function saveHousehold(d1Client: D1Database, household: HouseholdCreateInput): Promise<Household> {
    console.info(`>>>🏠 SAVE > household: heynabo id ${household.heynaboId}, address ${household.address}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const data = {
        heynaboId: household.heynaboId,
        pbsId: household.pbsId,
        movedInDate: household.movedInDate,
        moveOutDate: household.moveOutDate,
        name: household.name,
        address: household.address,
    }
    try {
        const newHousehold = await prisma.household.upsert({
            where: {heynaboId: household.heynaboId}, // unique constraint used to check if it exists (update) or not (create)
            create: data,
            update: data
        })
        console.info(`<<<🏠 SAVE > Saved household: ${newHousehold.address} with id ${newHousehold.id}`)
        const inhabitantIds = await Promise.all(
            household.inhabitants?.map(inhabitant => saveInhabitant(d1Client, inhabitant, newHousehold.id))
        )
        console.info(`<<<🏠 SAVE > Saved ${inhabitantIds.length} inhabitants to household: ${newHousehold.address}`)
        return newHousehold
    } catch (e) {
        const errStr = `>>> 🏠> SAVE > Error saving household: ${household?.address}`
        console.error( errStr, e)
        throw createError( errStr)
    }

}

export async function fetchHouseholds(d1Client: D1Database): Promise<Household[]> {
    console.log(">>>🏠 Fetching households")
    const prisma = await getPrismaClientConnection(d1Client)
    const households = await prisma.household.findMany()
    console.log(`<<<🏠 Got ${households.length} households from database`)
    return households
}

export async function fetchSeasonForRange(d1Client: D1Database, start: string, end: string): Promise<Season|null> {
    console.log(">>>🌞 Fetching specific season for range", start, end)
    const prisma = await getPrismaClientConnection(d1Client)
    
    // Create a seasonDates string directly from the parameters
    const seasonDatesStr = JSON.stringify({
        start: start,
        end: end
    })
    
    // Find a season with the matching seasonDates string
    const season = await prisma.season.findFirst({
        where: {
            seasonDates: seasonDatesStr
        }
    })
    
    console.log(`<<<🌞 Got season: ${season?.id}`)
    return season
}

export async function fetchCurrentSeason(d1Client: D1Database): Promise<Season|null> {
    console.log(">>>🌞 Fetching specific season")
    const prisma = await getPrismaClientConnection(d1Client)
    const season = await prisma.season.findFirst({
        where: {
            isActive: true
        }
    })
    console.log(`<<<🌞 Got season from database`)
    return season
}

export async function fetchSeason(d1Client: D1Database, id:number): Promise<Season|null> {
    console.log(">>>🌞 Fetching specific season")
    const prisma = await getPrismaClientConnection(d1Client)
    const season = await prisma.season.findFirst({
        where: {
            id: id
        }
    })
    console.log(`<<<🌞 Got season ${season?.shortName} from database`)
    return season
}

export async function fetchSeasons(d1Client: D1Database): Promise<Season[]> {
    console.log(">>>🌞 Fetching seasons")
    const prisma = await getPrismaClientConnection(d1Client)
    const seasons = await prisma.season.findMany({
        orderBy: {
            seasonDates: 'desc' // Order by seasonDates which contains date strings
        }
    })
    console.log(`<<<🌞 Got ${seasons?.length} seasons from database`)
    return seasons ? seasons : []
}

export async function deleteSeason(d1Client: D1Database, id: number): Promise<Season> {
    console.log(`>>>🌞 DELETE > Deleting season with id ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)
    
    try {
        const deletedSeason = await prisma.season.delete({
            where: { id }
        })
        console.log(`<<<🌞 DELETE > Successfully deleted season ${deletedSeason.shortName}`)
        return deletedSeason
    } catch (e) {
        const errStr = `>>>🌞 DELETE > Error deleting season with id ${id}`
        console.error(errStr, e)
        throw createError(errStr)
    }
}

export async function createSeason(d1Client: D1Database, seasonData: any): Promise<Season> {
    console.info(`>>>🌞 CREATE > season: ${seasonData.shortName}`)
    
    const prisma = await getPrismaClientConnection(d1Client)
    
    try {
        // Create PrismaDB-compatible season object with just the fields we need
        const season =  seasonData as SeasonCreateInput
        
        // Create a new season with properly typed data
        const newSeason = await prisma.season.create({
            data: season
        })
        
        console.info(`<<<🌞 CREATE > Created season: ${newSeason.shortName} with id ${newSeason.id}`)
        return newSeason
    } catch (e) {
        const errStr = `>>>🌞 CREATE > Error creating season: ${seasonData?.shortName}:`
        console.error(errStr, e)
        throw createError({
            statusCode: 500,
            message: errStr,
            cause: e
        })
    }
}

export async function updateSeason(d1Client: D1Database, seasonData: any): Promise<Season> {
    if (!seasonData.id) {
        throw createError(`>>>🌞 UPDATE > Cannot update season without ID`)
    }
    
    console.info(`>>>🌞 UPDATE > season: ${seasonData.shortName} (ID: ${seasonData.id})`)
    
    const prisma = await getPrismaClientConnection(d1Client)
    
    try {
        // Create PrismaDB-compatible season object with just the fields we need
        const season = {
            shortName: seasonData.shortName,
            seasonDates: seasonData.seasonDates,
            isActive: seasonData.isActive,
            cookingDays: seasonData.cookingDays,
            holidays: seasonData.holidays,
            ticketIsCancellableDaysBefore: seasonData.ticketIsCancellableDaysBefore,
            diningModeIsEditableMinutesBefore: seasonData.diningModeIsEditableMinutesBefore
        }
        
        // Update the season by ID with properly typed data
        const updatedSeason = await prisma.season.update({
            where: { id: seasonData.id },
            data: season
        })
        
        console.info(`<<<🌞 UPDATE > Updated season: ${updatedSeason.shortName} with id ${updatedSeason.id}`)
        return updatedSeason
    } catch (e) {
        const errStr = `>>>🌞 UPDATE > Error updating season: ${seasonData?.shortName} (ID: ${seasonData.id})`
        console.error(errStr, e)
        throw createError(errStr)
    }
}

// saveSeason function removed in favor of separate createSeason and updateSeason functions
