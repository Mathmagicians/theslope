import {expect, test} from '@nuxt/test-utils/playwright'
import {loginUserIntoHeynabo} from "~/server/integration/heynabo";


test("loginUserIntoHeynabo should return a session cookie containing an ontheslope user with a token upon successful login", () => {

})

test("loginUserIntoHeynabo should return a 400 error when username or email are not defined", () => {

})

test("loginUserIntoHeynabo should return a 404 error when username or email are not valid heynabo credentials", async() => {
    await expect(loginUserIntoHeynabo("a@a", "volapyk"))
        .rejects.toThrow( {code: 404 } )
})
