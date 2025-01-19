import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import {Household, User} from "~/server/data/household";
import {useDatabase} from "nitropack/runtime";
import {D1Database} from "@cloudflare/workers-types";


function getPrismaClient(d1Client:D1Database): PrismaClient {
    const adapter = new PrismaD1(db1)
    const prisma = new PrismaClient({ adapter })
    return prisma
}

export async function fetchUsers(d1Client:D1Database): User[] {
        const prisma = getPrismaClient()
        const users = await prisma.user.findMany()
//        const result = JSON.stringify(users)
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
