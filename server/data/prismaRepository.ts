import {PrismaD1} from "@prisma/adapter-d1";
import {PrismaClient} from "@prisma/client";
import {Prisma} from "@prisma/client/extension";


export async function getPrismaClientConnection(d1Client: D1Database): PrismaClient {
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({adapter})
    await prisma.$connect()
    return prisma
}

type UserCreate = Prisma.Args<typeof prisma.user, 'create'>['data']
type User = Prisma.Args<typeof prisma.user, 'select-all'>['data']

export async function saveUser(d1Client: D1Database, user: UserCreate): Promise<User> {
    const prisma = await getPrismaClientConnection(d1Client)
    console.info(">>>👩 Saving user: ", user)
    const newUser = await prisma.user.create({
        data: user
    })
    return newUser
}

export async function fetchUsers(d1Client: D1Database): Promise<User[]> {
    console.log(">>>👩‍ Fetching users, from d1 client: ", d1Client)
    const prisma = await getPrismaClientConnection(d1Client)
    const users = await prisma.user.findMany()
    console.log(`<<<👩‍ Got ${users.length} users from database`)
    return users
}

export async function createHousehold(household: Household): any {

    const newHousehold = await prisma.household.create({
        data: {
            name: household.name,
            address: household.address,
            hyenaboId: household.hyenaboId,
            pbsId: household.pbsId,
            moveInDate: household.moveInDate,
            moveOutDate: household.moveOutDate
        }
    })
    return newHousehold
}

export async function saveHouseholds(households: Household[]): any {
    const prisma = getPrismaClient()
    const newHouseholds = await prisma.household.createMany({
        data: households
    })
    return newHouseholds
}
