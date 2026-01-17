/**
 * Global teardown - runs once after ALL tests finish (all workers complete)
 *
 * Used for cleaning up singleton test season that's shared across parallel workers.
 * Skipped when SHOULD_NOT_MUTATE is set (dev/prod smoke tests use existing data).
 */
import type { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test'
import { SeasonFactory } from './testDataFactories/seasonFactory'
import testHelpers from './testHelpers'

async function globalTeardown(config: FullConfig) {
    // Skip cleanup on dev/prod - no test data was created
    if (process.env.SHOULD_NOT_MUTATE) {
        console.info('🧹 > GLOBAL TEARDOWN > Skipped (SHOULD_NOT_MUTATE, no test data to clean)')
        return
    }

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
