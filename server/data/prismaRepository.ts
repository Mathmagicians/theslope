import {PrismaD1} from "@prisma/adapter-d1"
import {Season, User, Inhabitant, Household, Prisma as PrismaFromClient, PrismaClient} from "@prisma/client"
import {Prisma} from "@prisma/client/extension"
import HouseholdCreateInput = PrismaFromClient.HouseholdCreateInput
import InhabitantCreateInput = PrismaFromClient.InhabitantCreateInput
import UserCreateNestedOneWithoutInhabitantInput = PrismaFromClient.UserCreateNestedOneWithoutInhabitantInput;

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

export async function fetchUser( email: string, d1Client: D1Database) {
    console.log( `>>> 👨‍💻 > FETCH > user from database for email ${email}`)
    const prisma = await getPrismaClientConnection(d1Client)
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
        user: Prisma.skip,
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
        createError( errStr)
    }

}

export async function fetchHouseholds(d1Client: D1Database): Promise<Household[]> {
    console.log(">>>🏠 Fetching households")
    const prisma = await getPrismaClientConnection(d1Client)
    const households = await prisma.household.findMany()
    console.log(`<<<🏠 Got ${households.length} households from database`)
    return households
}

export async function fetchSeason(d1Client: D1Database, start: string, end: string): Promise<Season|null> {
    console.log(">>>🌞 Fetching specific season")
    const prisma = await getPrismaClientConnection(d1Client)
    const season = await prisma.season.findFirst({
        where: {
            startDate: new Date(start),
            endDate: new Date(end)
        }
    })
    console.log(`<<<🌞 Got season from database`)
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

export async function fetchSeasons(d1Client: D1Database): Promise<Season[]> {
    console.log(">>>🌞 Fetching specific season")
    const prisma = await getPrismaClientConnection(d1Client)
    const seasons = await prisma.season.findMany({
        orderBy: {
            startDate: 'desc'
        }
    })
    console.log(`<<<🌞 Got ${seasons?.length} seasons from database`)
    return seasons
}
