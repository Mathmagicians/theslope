import {describe, expect, it} from 'vitest'
import {decideBillingSideEffects} from '~~/server/utils/billingSideEffects'

describe('decideBillingSideEffects', () => {
    it.each([
        ['a period on its first run', {version: 1, archivedVersion: 0, notifiedVersion: 0}, {archive: true, notify: true}],
        ['a period fully done at its version', {version: 1, archivedVersion: 1, notifiedVersion: 1}, {archive: false, notify: false}],
        ['a period whose content changed since (catch-up)', {version: 2, archivedVersion: 1, notifiedVersion: 1}, {archive: true, notify: true}],
        ['a period with its archive done and its mail pending (queue was down)', {version: 1, archivedVersion: 1, notifiedVersion: 0}, {archive: false, notify: true}],
        ['a period with its mail done and its archive pending (R2 put failed)', {version: 1, archivedVersion: 0, notifiedVersion: 1}, {archive: true, notify: false}],
        ['a migrated period: mailed at v1 by definition, CSV pending', {version: 1, archivedVersion: 0, notifiedVersion: 1}, {archive: true, notify: false}]
    ])('redoes only what is missing or stale for %s', (_name, stamps, plan) => {
        expect(decideBillingSideEffects(stamps)).toEqual(plan)
    })
})
