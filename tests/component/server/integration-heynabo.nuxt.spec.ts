// @vitest-environment nuxt
import {loginUserIntoHeynabo} from "~~/server/integration/heynabo"
import {describe, expect, test, it} from "vitest"

describe('Heynabo-Integation-e2e-tests', async () => {
    const heyNaboUserName = process.env.HEY_NABO_USERNAME as string; //will give runtime error if env variable is undefined - this is intentional
    const heyNaboPassword = process.env.HEY_NABO_PASSWORD as string;

    it("loginUserIntoHeynabo should return a an ontheslope user with a token upon successful login", async () => {
        const res = await loginUserIntoHeynabo(heyNaboUserName, heyNaboPassword)
        expect(res).toHaveProperty('token')
        expect(res.token).not.toBeNull()
        expect(res.token.length).toBeGreaterThan(1)
    })


    test("loginUserIntoHeynabo should return an error when username or email are not valid heynabo credentials", async () => {
        await expect(loginUserIntoHeynabo("a@a", "volapyk"))
            .rejects.toThrow( 'Invalid Heynabo credentials - cant login')
    })

})
