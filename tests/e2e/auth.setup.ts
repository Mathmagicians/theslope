import {test as setup, expect} from '@playwright/test'

const userName = process.env.HEY_NABO_USERNAME as string
const password = process.env.HEY_NABO_PASSWORD as string
const headers = {'Content-Type': 'application/json'}
export const adminFile = 'playwright/.auth/admin.json'

setup('Authenticate as admin', async ({request}) => {
   const response = await request.post('/api/auth/login',
        {
            headers: headers,
            data: {email: userName, password: password}
        })
    expect(response.status()).toBe(200)
    const responseBody = await response.json()
    expect(responseBody).toHaveProperty('email', userName)

    const responseHeaders = response.headers()

    //check cookies
    const responseCookies = new Map(responseHeaders['set-cookie']
        .split('\n')
        .map(c => c.split(';', 2)[0].split('=')))

    expect(responseCookies.size).toBeGreaterThan(0)
    const nuxtCookie = responseCookies.get('nuxt-session')
    expect(nuxtCookie.length).toBeGreaterThan(0)
    await request.storageState({path: adminFile})
})
