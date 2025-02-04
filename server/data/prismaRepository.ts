import {PrismaD1} from "@prisma/adapter-d1"
import {User, Inhabitant, Prisma as PrismaFromClient, PrismaClient, Prisma} from "@prisma/client"
import {Prisma} from "@prisma/client/extension"
import UserCreateInput = PrismaFromClient.UserCreateInput
import InhabitantCreateInput = PrismaFromClient.InhabitantCreateInput
import UserCreateNestedOneWithoutInhabitantInput = Prisma.UserCreateNestedOneWithoutInhabitantInput;

export async function getPrismaClientConnection(d1Client: D1Database) {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter})
    await prisma.$connect()
    return prisma
}

export async function saveUser(d1Client: D1Database, user: Prisma.UserCreateNestedOneWithoutInhabitantInput): Promise<User> {
    const prisma = getPrismaClientConnection(d1Client)
    console.info(">>>👨‍💻 SAVE > user: ", user)
    const newUser = await prisma.user.upsert({
        where: {email: user.email}, // unique constraint used to check if it exists (update) or not (create)
        create: user,
        update: user
    })
    return newUser
}

export async function fetchUsers(d1Client: D1Database): Promise<User[]> {
    console.log(">>>👨‍💻 Fetching users, from d1 client: ", d1Client)
    const prisma =  await getPrismaClientConnection(d1Client)
    const users = await prisma.user.findMany()
    console.log(`<<<👨‍💻‍ Got ${users.length} users from database`)
    return users
}

export async function fetchUser( email: string, d1Client: D1Database) {
    console.log( `> 👨‍💻 Fetching user from database for email ${email}`)
    const prisma = await getPrismaClientConnection(d1Client)
    const user = await prisma.user.findUnique({
        where: {
            email: email
        },
        include: {
            Inhabitant: true
        }
    })
    console.log( `> 👨‍💻 Fetch user with id ${user?.id} from database for email ${email}`)
    return user
}


export async function saveInhabitant(d1Client: D1Database, inhabitant: InhabitantCreateInput, householdId: number): Promise<Inhabitant> {
    console.info(`>>> 👩‍🏠 SAVE > inhabitant -- ${inhabitant.name} -- to household ${householdId}`)
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

    if (inhabitant.user) {
        console.info(`>>>> 👩‍🏠 SAVE > Saving inhabitants ${inhabitant.name} user profile to household ${householdId}`)
        console.log(inhabitant.user)
        inhabitant.user.passwordHash = "caramba!"
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
        return updatedInhabitant
    } else {
        console.info(`>>>> 👩‍🏠 SAVE > inhabitants ${inhabitant.name} in household ${householdId} doesnt have a user profile`)

    }

    return newInhabitant
}

export async function fetchInhabitants(d1Client: D1Database): Promise<User[]> {
    console.log(">>>👩‍🏠 Fetching inhabitants, from d1 client: ", d1Client)
    const prisma = await getPrismaClientConnection(d1Client)
    const inhabitants = await prisma.inhabitant.findMany()
    console.log(`<<<👩‍🏠 Got ${inhabitants.length} users from database`)
    return inhabitants
}

type HouseholdCreate = Prisma.Args<typeof prisma.household, 'create'>['data']
type Household = Prisma.Args<typeof prisma.household, 'select-all'>['data']

export async function saveHousehold(d1Client: D1Database, household: HouseholdCreate): Promise<Household> {
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
            household.inhabitants.map(inhabitant => saveInhabitant(d1Client, inhabitant, newHousehold.id))
        )
        console.info(`<<<🏠 SAVE > Saved ${inhabitantIds.length} inhabitants to household: ${newHousehold.address}`)
        return newHousehold
    } catch (e) {
        console.error(`?>>>?? Error saving household: ${household?.address}`, e)
        return {}
    }

}

export async function fetchHouseholds(d1Client: D1Database): Promise<Household[]> {
    console.log(">>>🏠 Fetching households, from d1 client: ", d1Client)
    const prisma = await getPrismaClientConnection(d1Client)
    const households = await prisma.household.findMany()
    console.log(`<<<🏠 Got ${households.length} households from database`)
    return households
}
