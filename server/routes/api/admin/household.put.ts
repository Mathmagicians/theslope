import {defineEventHandler} from "h3";
import {fetchUsers} from "~~/server/data/prismaRepository";

export default defineEventHandler(async (event, env: Env) => {
    const users = fetchUsers( env);
    return users
})
