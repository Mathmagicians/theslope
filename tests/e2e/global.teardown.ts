/**
 * Global teardown - runs once after ALL tests finish (all workers complete)
 *
 * Used for cleaning up singleton test season that's shared across parallel workers
 */
import type { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test'
import { SeasonFactory } from './testDataFactories/seasonFactory'
import testHelpers from './testHelpers'

async function globalTeardown(config: FullConfig) {
    console.info('🧹 > GLOBAL TEARDOWN > Starting cleanup...')

    const browser = await chromium.launch()
    // Use webServer URL from config (where dev server is running)
    const baseURL = config.webServer?.url
    const context = await testHelpers.validatedBrowserContext(browser, baseURL)

    try {
        // Clean up singleton active season (TestSeason-E2E-Singleton)
        await SeasonFactory.cleanupActiveSeason(context)
        console.info('🧹 > GLOBAL TEARDOWN > Singleton season cleaned up')
    } catch (error) {
        console.error('🧹 > GLOBAL TEARDOWN > Error during cleanup:', error)
    } finally {
        await browser.close()
    }

    console.info('🧹 > GLOBAL TEARDOWN > Complete')
}

export default globalTeardown
