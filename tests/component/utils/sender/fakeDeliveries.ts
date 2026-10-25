import {vi} from 'vitest'
import {fetchDeliveries, recordDeliveries} from '~~/server/data/financesRepository'
import type {Delivery} from '~/composables/useDeliveryValidation'

/**
 * The Delivery rows D1 holds, for a spec that mocks the finances repository: the read answers from the rows and a
 * write appends its rows, stamped now
 */
export const fakeDeliveries = (): {rows: Delivery[]} => {
    const store: {rows: Delivery[]} = {rows: []}
    vi.mocked(fetchDeliveries).mockImplementation(async (_, subjectType, subjectIds) =>
        store.rows.filter(row => row.subjectType === subjectType && subjectIds.includes(row.subjectId)))
    vi.mocked(recordDeliveries).mockImplementation(async (_, created) => created.map(data => {
        const row = {...data, id: store.rows.length + 1, jobRunId: data.jobRunId ?? null, deliveredAt: new Date()}
        store.rows.push(row)
        return row
    }))
    return store
}
