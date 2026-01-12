import type {APIRequestContext, Page} from '@playwright/test'
import {test as setup, expect} from '@playwright/test'
import {authFiles} from './config'

const adminUserName = process.env.HEY_NABO_USERNAME as string
const memberUserName = process.env.HEY_NABO_EJ_ADMIN_USERNAME as string
const password = process.env.HEY_NABO_PASSWORD as string
const headers = {'Content-Type': 'application/json'}

async function performLogin(request: APIRequestContext, userName: string) {
    const response = await request.post('/api/auth/login', {headers, data: {email: userName, password}})
    const responseBody = await response.json().catch(() => ({}))
    expect(response.status(), `Login failed for ${userName}: ${JSON.stringify(responseBody)}`).toBe(200)
    expect(responseBody).toHaveProperty('email', userName)
    return response
}

async function setupUIAuth(page: Page, userName: string, storageFile: string, landingPath: string = '/admin', expectedUrl: string | RegExp = '/admin/planning') {
    await page.goto('/login')
    await page.waitForURL('/login')
    await performLogin(page.request, userName)
    await page.goto(landingPath)
    await page.waitForURL(expectedUrl)
    await page.context().storageState({path: storageFile})
}

// Admin auth
setup('Authenticate admin for API', async ({request}) => {
    await performLogin(request, adminUserName)
    await request.storageState({path: authFiles.adminFile})
})

setup('Authenticate admin for UI', async ({page}) => {
    await setupUIAuth(page, adminUserName, authFiles.adminUIFile)
})

// Member auth (non-admin)
setup('Authenticate member for API', async ({request}) => {
    await performLogin(request, memberUserName)
    await request.storageState({path: authFiles.memberFile})
})

setup('Authenticate member for UI', async ({page}) => {
    await setupUIAuth(page, memberUserName, authFiles.memberUIFile, '/dinner', '/dinner')
})
