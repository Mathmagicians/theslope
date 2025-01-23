import {defineEventHandler} from "h3";
import {fetchUsers} from "~/server/data/prismaRepository";
import {PrismaD1} from "@prisma/adapter-d1";
import {PrismaClient} from "@prisma/client";

export default defineEventHandler(async (event) => {
   console.log("Fetching users, db from event", event.context.cloudflare.env.DB.name)
    const { cloudflare } = event.context
    const d1Client = cloudflare.env.DB
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({ adapter })
    await prisma.$connect()

    const result = await prisma.$queryRaw`SELECT id, email from USER;`

    return {
        ok: true,
        result,
    }
})
