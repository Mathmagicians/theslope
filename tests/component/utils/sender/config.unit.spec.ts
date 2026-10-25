import {afterEach, describe, expect, it, vi} from 'vitest'
import {emailChannel, shouldSendBookingEmails} from '~~/server/utils/sender/config'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'

const queue = {send: vi.fn()} as unknown as Queue

describe('emailChannel', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
    })

    it.each([
        {setting: 'DEPLOY_URL', deployUrl: '', env: {SENDER: queue}},
        {setting: 'SENDER', deployUrl: 'https://dev.skraaningen.dk', env: {}}
    ])('is off and names $setting when it is not set', ({setting, deployUrl, env}) => {
        vi.stubEnv('DEPLOY_URL', deployUrl)

        expect(emailChannel(env)).toEqual({on: false, missing: setting})
    })

    it('is on with the queue and the settings of the deployment when both are set', () => {
        const {signature, templates, accountantEmail, adminEmail} = NotificationFactory.config()
        vi.stubEnv('DEPLOY_URL', 'https://dev.skraaningen.dk')
        vi.stubGlobal('useRuntimeConfig', () => ({notifications: {accountantEmail, adminEmail}}))
        vi.stubGlobal('useAppConfig', () => ({theslope: {notifications: {signature, templates}}}))

        const channel = emailChannel({SENDER: queue})

        expect(channel).toMatchObject({on: true, queue, config: {environment: 'dev', site: 'dev.skraaningen.dk'}})
    })
})

// The booking emails flag, the Cloudflare variable SHOULD_SEND_BOOKING_EMAILS_FLAG: on only when set to true
describe('shouldSendBookingEmails', () => {
    afterEach(() => vi.unstubAllEnvs())

    it.each([
        {flag: 'true', on: true},
        {flag: 'false', on: false},
        {flag: '', on: false}
    ])('GIVEN the flag "$flag" THEN the booking emails are on: $on', ({flag, on}) => {
        vi.stubEnv('SHOULD_SEND_BOOKING_EMAILS_FLAG', flag)

        expect(shouldSendBookingEmails()).toBe(on)
    })
})
