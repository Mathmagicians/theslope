import {describe, it, expect} from 'vitest'
import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

/**
 * Architecture test - ADR-018 [Design system owns shared UI patterns]
 *
 * Components bind a design-system token and pass only domain props. A raw Nuxt UI
 * prop on a shared component family is a per-site patch: it drifts, it is invisible
 * to the token, and it is how the mobile alert defects got in. This spec reads the
 * `.vue` sources, so it fails on the *source*, not on a rendered class.
 */

const APP_DIR = fileURLToPath(new URL('../../../app/', import.meta.url))

/** The brand SVG paints itself in hex - it is the one file that owns its colours */
const COLOUR_EXEMPT = ['components/icons/Logo.vue']

const vueFiles = readdirSync(APP_DIR, {recursive: true})
    .filter((entry): entry is string => typeof entry === 'string' && entry.endsWith('.vue'))
    .sort()

const colourFiles = vueFiles.filter(file => !COLOUR_EXEMPT.includes(file))

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

/**
 * A UTable binds a table token: `COMPONENTS.table.<ui|denseUi|gridUi>` in the tag, or a local `:ui` object built from one
 * (`const tableUi = {...COMPONENTS.table.ui, …}`). The token owns cell padding and wrapping on a phone.
 */
const bindsTableToken = (source: string, tagText: string): boolean => {
    if (/COMPONENTS\.table\./.test(tagText)) return true
    const local = tagText.match(/:ui="([A-Za-z_$][\w$]*)"/)?.[1]
    return local !== undefined && new RegExp(`const ${local}\\s*=[\\s\\S]{0,200}?COMPONENTS\\.table\\.`).test(source)
}

// The grid token reaches a UCalendar directly, or through a picker preset built from it
// (calendarPickerProps merges COMPONENTS.calendarGrid with a CALENDAR.picker selection)
const BINDS_CALENDAR_GRID = /v-bind="(COMPONENTS\.calendarGrid|calendarProps)"/

/** Every palette family a Tailwind colour utility can name here: defaults plus our custom ones */
const COLOUR_FAMILIES = [
    'amber', 'blue', 'pink', 'orange', 'sky', 'red', 'violet', 'winery', 'party', 'peach',
    'caramel', 'ocean', 'yellow', 'green', 'gray', 'neutral', 'slate', 'zinc', 'stone',
    'emerald', 'indigo', 'purple', 'rose', 'teal', 'cyan', 'lime', 'fuchsia', 'mocha', 'bonbon'
].join('|')

/** Utilities that take a palette shade. Variant prefixes (`dark:`, `hover:`, `md:`) fall out of the scan */
const COLOUR_UTILITIES = [
    'bg', 'text', 'border', 'ring', 'outline', 'from', 'to', 'via',
    'fill', 'stroke', 'divide', 'placeholder', 'decoration', 'accent'
].join('|')

/** `bg-peach-200`, `dark:text-gray-400`, `md:ring-amber-500` - a colour decided in the file */
const RAW_COLOUR_CLASS = new RegExp(`\\b(?:${COLOUR_UTILITIES})-(?:${COLOUR_FAMILIES})-[0-9]{2,3}\\b`, 'g')

/** The colour names a Nuxt UI prop accepts: semantic aliases, our Pantone palettes, Tailwind families */
const COLOUR_NAMES = ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'neutral', 'yellow',
    'mocha', 'peach', 'pink', 'orange', 'party', 'ocean', 'winery', 'caramel', 'bonbon', COLOUR_FAMILIES].join('|')

/** `color="error"` and `:color="'error'"`. `:color="COLOR.error"`, `:color="cfg.color"` and `v-bind` pass */
const LITERAL_COLOUR_PROP = new RegExp(`\\bcolor="'?(?:${COLOUR_NAMES})'?"`, 'g')

/** `file:line - <match>` for every hit of `pattern`, so the failure names the site */
const scan = (files: string[], pattern: RegExp, hint: string) =>
    files.flatMap(file =>
        readVue(file).split('\n').flatMap((line, index) =>
            [...line.matchAll(pattern)].map(match => `app/${file}:${index + 1} - ${match[0]} (${hint})`)
        )
    )

const report = (violations: string[]) => violations.join('\n')

describe('ADR-018: components bind design-system tokens, never raw Nuxt UI props', () => {
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

    it('every <UCalendar> binds the shared calendar grid', () => {
        const violations = vueFiles.flatMap(file =>
            openingTags(readVue(file), 'UCalendar')
                .filter(tag => !BINDS_CALENDAR_GRID.test(tag.text))
                .map(tag => `app/${file}:${tag.line} - no calendarGrid token (use v-bind="COMPONENTS.calendarGrid" or a calendarPickerProps preset)`)
        )
        expect(report(violations)).toBe('')
    })

    it('every <UTable> binds a COMPONENTS.table token', () => {
        const violations = vueFiles.flatMap(file => {
            const source = readVue(file)
            return openingTags(source, 'UTable')
                .filter(tag => !bindsTableToken(source, tag.text))
                .map(tag => `app/${file}:${tag.line} - no table token (use :ui="COMPONENTS.table.ui", or spread a COMPONENTS.table token)`)
        })
        expect(report(violations)).toBe('')
    })

    it('no .vue names a Tailwind palette shade', () => {
        const violations = scan(colourFiles, RAW_COLOUR_CLASS, 'raw palette shade - use a BG/TEXT/BORDER/TYPOGRAPHY token')
        expect(report(violations)).toBe('')
    })

    it('no .vue passes a literal colour to a component', () => {
        const violations = scan(colourFiles, LITERAL_COLOUR_PROP, 'literal colour - use :color="COLOR.<name>" or a domain token')
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
