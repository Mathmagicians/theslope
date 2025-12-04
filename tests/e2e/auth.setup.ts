import type { APIRequestContext} from '@playwright/test';
import {test as setup, expect} from '@playwright/test'
import {authFiles} from './config'

const userName = process.env.HEY_NABO_USERNAME as string
const password = process.env.HEY_NABO_PASSWORD as string
const headers = {'Content-Type': 'application/json'}

async function performLogin(request: APIRequestContext) {
    const response = await request.post('/api/auth/login', {
        headers: headers,
        data: { email: userName, password: password }
    })
    expect(response.status()).toBe(200)
    const responseBody = await response.json()
    expect(responseBody).toHaveProperty('email', userName)

    const responseHeaders = response.headers()
    const responseCookies = new Map(responseHeaders['set-cookie']
        .split('\n')
        .map((c: string) => c.split(';', 2)[0].split('=') as [string, string]))

    expect(responseCookies.size).toBeGreaterThan(0)
    const nuxtCookie = responseCookies.get('nuxt-session')
    expect(nuxtCookie).toBeDefined()
    expect(nuxtCookie!.length).toBeGreaterThan(0)

    return response
}
setup('Authenticate admin for API', async ({request}) => {
   await performLogin(request)
    await request.storageState({path: authFiles.adminFile})

})

setup('Authenticate admin for UI', async ({page}) => {
    //Authenticate as admin for  browser tests
    // Visit admin page to ensure all client-side auth is set
    await page.goto('/login')
    await page.waitForURL('/login')
    await performLogin(page.request)
    await page.goto('/admin')
    await page.waitForURL('/admin/planning')

    // Save browser state
    await page.context().storageState({ path: authFiles.adminUIFile })
})
