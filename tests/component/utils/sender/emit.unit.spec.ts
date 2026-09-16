import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {emit} from '~~/server/utils/sender/emit'
import {buildTestEmail} from '~~/server/utils/sender/events/test'
import {NotificationFactory} from '~~/tests/e2e/testDataFactories/notificationFactory'

const message = () => buildTestEmail(NotificationFactory.config())

const fakeQueue = (send = vi.fn().mockResolvedValue(undefined)) => ({send} as unknown as Queue)

describe('emit', () => {
    const logs = {warn: vi.spyOn(console, 'warn'), error: vi.spyOn(console, 'error'), info: vi.spyOn(console, 'info')}
    beforeEach(() => Object.values(logs).forEach(spy => spy.mockImplementation(() => {})))
    afterEach(() => Object.values(logs).forEach(spy => spy.mockClear()))

    it('sends a contract-valid message through the binding and reports it queued', async () => {
        const queue = fakeQueue()
        const msg = message()

        const result = await emit(queue, msg)

        expect(queue.send).toHaveBeenCalledWith(msg)
        expect(result).toEqual({queued: true, dedupeKey: msg.meta.dedupeKey, degraded: false})
    })

    it('reports degraded without throwing when the binding is missing', async () => {
        const msg = message()

        const result = await emit(undefined, msg)

        expect(result).toEqual({queued: false, dedupeKey: msg.meta.dedupeKey, degraded: true})
        expect(logs.warn).toHaveBeenCalledOnce()
    })

    it('reports not queued without throwing when the binding rejects', async () => {
        const queue = fakeQueue(vi.fn().mockRejectedValue(new Error('queue unavailable')))
        const msg = message()

        const result = await emit(queue, msg)

        expect(result).toEqual({queued: false, dedupeKey: msg.meta.dedupeKey, degraded: false})
        expect(logs.error).toHaveBeenCalledOnce()
    })

    it('rejects a message that fails the contract before touching the binding', async () => {
        const queue = fakeQueue()
        const invalid = {...message(), to: 'not-an-email'}

        const result = await emit(queue, invalid)

        expect(queue.send).not.toHaveBeenCalled()
        expect(result.queued).toBe(false)
        expect(logs.error).toHaveBeenCalledOnce()
    })
})
