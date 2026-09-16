import {describe, it, expect} from 'vitest'
import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

/**
 * Architecture test - ADR-019 [Design system owns shared UI patterns]
 *
 * Components bind a design-system token and pass only domain props. A raw Nuxt UI
 * prop on a shared component family is a per-site patch: it drifts, it is invisible
 * to the token, and it is how the mobile alert defects got in. This spec reads the
 * `.vue` sources, so it fails on the *source*, not on a rendered class.
 */

const APP_DIR = fileURLToPath(new URL('../../../app/', import.meta.url))

const vueFiles = readdirSync(APP_DIR, {recursive: true})
    .filter((entry): entry is string => typeof entry === 'string' && entry.endsWith('.vue'))
    .sort()

const readVue = (file: string) => readFileSync(`${APP_DIR}${file}`, 'utf8')

/** Opening tags of `<Tag`, from `<Tag` to the `>` that closes it (quote-aware, multi-line) */
const openingTags = (source: string, tag: string): Array<{line: number, text: string}> => {
    const needle = `<${tag}`
    const found: Array<{line: number, text: string}> = []
    let cursor = 0
    while (true) {
        const start = source.indexOf(needle, cursor)
        if (start === -1) return found
        // `<UAlertBanner` is a different component, not `<UAlert`
        const nextChar = source[start + needle.length] ?? ''
        if (/[A-Za-z0-9-]/.test(nextChar)) {
            cursor = start + needle.length
            continue
        }
        let quote: string | null = null
        let end = source.length - 1
        for (let i = start; i < source.length; i++) {
            const char = source[i]!
            if (quote) {
                if (char === quote) quote = null
                continue
            }
            if (char === '"' || char === "'") quote = char
            else if (char === '>') {
                end = i
                break
            }
        }
        found.push({line: source.slice(0, start).split('\n').length, text: source.slice(start, end + 1)})
        cursor = end + 1
    }
}

/** `ALERTS.warning`, `ALERTS[kind]` - a token reference, static or keyed */
const BINDS_ALERT_TOKEN = /\bALERTS[.[]/
/** ` color=`, ` :variant=`, ` type=` - a raw Nuxt UI prop the token should own */
const RAW_ALERT_PROP = /(?:^|\s)(?::|v-bind:)?(?:color|variant|type)=/

const report = (violations: string[]) => violations.join('\n')

describe('ADR-019: components bind design-system tokens, never raw Nuxt UI props', () => {
    it('every <UAlert> binds an ALERTS kind', () => {
        const violations = vueFiles.flatMap(file =>
            openingTags(readVue(file), 'UAlert')
                .filter(tag => !BINDS_ALERT_TOKEN.test(tag.text))
                .map(tag => `app/${file}:${tag.line} - no ALERTS token (use v-bind="ALERTS.<kind>")`)
        )
        expect(report(violations)).toBe('')
    })

    it('no <UAlert> passes a raw color, variant or type prop', () => {
        const violations = vueFiles.flatMap(file =>
            openingTags(readVue(file), 'UAlert')
                .filter(tag => RAW_ALERT_PROP.test(tag.text))
                .map(tag => `app/${file}:${tag.line} - raw color/variant/type prop (pick an ALERTS kind instead)`)
        )
        expect(report(violations)).toBe('')
    })

    it('every <UCalendar> binds COMPONENTS.calendarGrid', () => {
        const violations = vueFiles.flatMap(file =>
            openingTags(readVue(file), 'UCalendar')
                .filter(tag => !tag.text.includes('COMPONENTS.calendarGrid'))
                .map(tag => `app/${file}:${tag.line} - no calendarGrid token (use v-bind="COMPONENTS.calendarGrid")`)
        )
        expect(report(violations)).toBe('')
    })

    it('no template uses the Nuxt UI v2 slot name #empty-state', () => {
        const violations = vueFiles.flatMap(file =>
            readVue(file).split('\n').flatMap((line, index) =>
                line.includes('#empty-state') ? [`app/${file}:${index + 1} - #empty-state is dead in Nuxt UI 4 (use #empty)`] : []
            )
        )
        expect(report(violations)).toBe('')
    })
})
