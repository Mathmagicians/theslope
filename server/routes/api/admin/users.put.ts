import {defineEventHandler} from "h3";
import {PrismaClient} from "@prisma/client";
import {PrismaD1} from "@prisma/adapter-d1";

export default defineEventHandler(async (event) => {
    console.log("Adding user to db from event", event.context.cloudflare.env.DB.name)
    const { cloudflare } = event.context
    const d1Client = cloudflare.env.DB
    const adapter = new PrismaD1(d1Client)
    const prisma = new PrismaClient({ adapter })
    await prisma.$connect()

    const result = await prisma.$queryRaw`INSERT INTO user(email, phone, passwordHash)
VALUES('jane@test.com', '(408)-111-2222', 'karamba');`

    return {
        ok: true,
        result,
    }
})
