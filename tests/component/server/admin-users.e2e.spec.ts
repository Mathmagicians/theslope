import {describe, expect, test, it} from "vitest"

describe('test PUT /admin/users endpoint', async () => {
    const heyNaboUserName = process.env.HEY_NABO_USERNAME as string; //will give runtime error if env variable is undefined - this is intentional
    const heyNaboPassword = process.env.HEY_NABO_PASSWORD as string;
    const res = await loginUserIntoHeynabo(heyNaboUserName, heyNaboPassword)


    it.todo("PUT with query params should add a user to the database", async () => {

    })

    it.todo( 'PUT without email query param should return a validation error', () => {
    })

    it.todo( 'GET should return a list of users from the database', () => {
    })

})
