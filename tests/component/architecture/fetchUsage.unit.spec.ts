import {describe, it, expect} from 'vitest'
import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

/**
 * Architecture test - ADR-007 [SSR-friendly store pattern]
 *
 * Every request under app/ goes through useApiHandler: `storeAsyncData` for a store slice,
 * `apiRequest` for a write or a one-shot read. Both report a failure through handleApiError,
 * so a bare `$fetch(` or `useRequestFetch(` anywhere else is a request whose failure no one reports.
 */

const APP_DIR = fileURLToPath(new URL('../../../app/', import.meta.url))

/** The one file that owns the request fetch */
const SANCTIONED = 'composables/useApiHandler.ts'

/** `$fetch(`, `$fetch<T>(`, `useRequestFetch(` */
const BARE_FETCH = /\$fetch\s*(?:<.*?>)?\s*\(|\buseRequestFetch\s*\(/

const sourceFiles = readdirSync(APP_DIR, {recursive: true})
    .filter((entry): entry is string => typeof entry === 'string' && /\.(vue|ts)$/.test(entry))
    .filter(file => file !== SANCTIONED)
    .sort()

const bareFetchSites = (files: string[], read: (file: string) => string): string[] =>
    files.flatMap(file => read(file).split('\n')
        .map((text, index) => ({text, line: index + 1}))
        .filter(({text}) => BARE_FETCH.test(text))
        .map(({text, line}) => `${file}:${line}: ${text.trim()}`))

describe('Requests go through useApiHandler (ADR-007)', () => {
    it('reads the app sources', () => {
        expect(sourceFiles.length).toBeGreaterThan(0)
    })

    it('no file under app/ calls $fetch or useRequestFetch outside useApiHandler', () => {
        expect(bareFetchSites(sourceFiles, file => readFileSync(`${APP_DIR}${file}`, 'utf8'))).toEqual([])
    })
})
