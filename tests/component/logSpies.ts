import {vi} from 'vitest'

/** The console's log levels, spied, so a case reads what the code under test logged; a unit spec imports it, testHelpers needs Nuxt */
export const spyOnLogs = () => ({
    info: vi.spyOn(console, 'info'),
    warn: vi.spyOn(console, 'warn'),
    error: vi.spyOn(console, 'error')
})
