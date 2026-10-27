import {defineConfig, devices} from '@playwright/test'

// The published companion: BASE_URL is the site's address (make developer-test url=); the results go under
// .output/developer with the rest of the companion's output
export default defineConfig({
    testDir: './tests',
    outputDir: '../.output/developer/test-results',
    forbidOnly: !!process.env.CI,
    reporter: 'line',
    use: {...devices['Desktop Chrome'], baseURL: process.env.BASE_URL}
})
