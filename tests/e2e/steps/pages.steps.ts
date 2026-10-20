import {expect} from '@playwright/test'
import {When, Then} from '~~/tests/e2e/fixtures'

const MANIFEST_PATH = '/manifest.webmanifest'

When('a visitor opens the app', async ({page}) => {
    await page.goto('/')
})

Then('the app\'s title names {string}', async ({page}, name: string) => {
    await expect(page).toHaveTitle(new RegExp(name))
})

Then('the app links its PWA manifest', async ({page}) => {
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', MANIFEST_PATH)
})

Then('the PWA manifest serves standalone with its icons', async ({request}) => {
    const response = await request.get(MANIFEST_PATH)
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.length).toBeGreaterThan(0)
    for (const icon of manifest.icons) {
        const iconResponse = await request.get(icon.src)
        expect(iconResponse.status(), `icon ${icon.src}`).toBe(200)
    }
})
