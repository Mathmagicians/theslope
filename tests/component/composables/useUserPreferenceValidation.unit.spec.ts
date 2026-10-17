/**
 * Unit tests for useUserPreferenceValidation (ADR-001 validation layer, ADR-017 isomorphic)
 *
 * The registry behind the "Mine indstillinger" card: notification channels (re-exported from the
 * generated layer), the appearance value stored in User.appearance, and the palette registry whose
 * verified level earns a preset its EN 301 549 badge.
 */
import {describe, it, expect} from 'vitest'
import {
    useUserPreferenceValidation,
    PALETTES,
    DEFAULT_APPEARANCE,
    DEFAULT_NOTIFICATION_CHANNELS,
    readAppearance
} from '~/composables/useUserPreferenceValidation'

const {
    PaletteSchema,
    TextScaleSchema,
    NotificationChannelSchema,
    UserPreferencesUpdateSchema
} = useUserPreferenceValidation()
const Palette = PaletteSchema.enum
const TextScale = TextScaleSchema.enum
const {EMAIL} = NotificationChannelSchema.enum

describe('useUserPreferenceValidation - column defaults', () => {
    it('GIVEN the default appearance THEN it is the column default', () => {
        expect(DEFAULT_APPEARANCE).toEqual({palette: Palette.default, textScale: TextScale.normal})
    })

    it('GIVEN the default channels THEN they match the column default', () => {
        expect(DEFAULT_NOTIFICATION_CHANNELS).toEqual([EMAIL])
    })
})

describe('useUserPreferenceValidation - readAppearance', () => {
    it.each([
        {desc: 'a valid appearance', stored: {palette: Palette.colorblind, textScale: TextScale.larger}, expected: {palette: Palette.colorblind, textScale: TextScale.larger}},
        // Tydelig became the default palette; appearances saved while it was an option keep their text scale
        {desc: 'the retired palette tydelig', stored: {palette: 'tydelig', textScale: TextScale.large}, expected: {palette: Palette.default, textScale: TextScale.large}},
        {desc: 'an unlisted palette', stored: {palette: 'neon', textScale: TextScale.large}, expected: {palette: Palette.default, textScale: TextScale.large}},
        {desc: 'an unlisted text scale', stored: {palette: Palette['high-contrast'], textScale: 'huge'}, expected: {palette: Palette['high-contrast'], textScale: TextScale.normal}},
        {desc: 'a value that is no object', stored: Palette['high-contrast'], expected: DEFAULT_APPEARANCE}
    ])('GIVEN $desc THEN each field reads as stored or falls back to its default', ({stored, expected}) => {
        expect(readAppearance(stored)).toEqual(expected)
    })
})

describe('useUserPreferenceValidation - PALETTES registry', () => {
    it('GIVEN the registry THEN it has one entry per palette', () => {
        expect(Object.keys(PALETTES)).toEqual([...PaletteSchema.options])
    })

    it.each([
        {palette: Palette.default, level: 'AA' as const, colourSafe: false},
        {palette: Palette['high-contrast'], level: 'AAA' as const, colourSafe: false},
        {palette: Palette.colorblind, level: 'AA' as const, colourSafe: true}
    ])('GIVEN $palette THEN its verified level is $level and colourSafe is $colourSafe', ({palette, level, colourSafe}) => {
        expect(PALETTES[palette]).toEqual({level, colourSafe})
    })

    it('GIVEN the registry THEN one preset carries the enhanced level', () => {
        // 1.4.6 AAA is one preset's promise: a member who needs it picks it by name, and the
        // contrast spec measures every pair of that one at 7:1
        expect(Object.entries(PALETTES).filter(([, entry]) => entry.level === 'AAA').map(([key]) => key))
            .toEqual([Palette['high-contrast']])
    })

    it('GIVEN the registry THEN one preset carries the colour-safe mapping', () => {
        // The Color Universal Design anchors are one preset's job; two would be two answers to
        // the same question, and the colour-vision spec measures the one that claims it
        expect(Object.values(PALETTES).filter(entry => entry.colourSafe)).toHaveLength(1)
    })
})

describe('useUserPreferenceValidation - UserPreferencesUpdateSchema', () => {
    it('GIVEN both fields THEN the update parses', () => {
        const update = {notificationChannels: [EMAIL], appearance: {palette: Palette['high-contrast'], textScale: TextScale.large}}
        expect(UserPreferencesUpdateSchema.parse(update)).toEqual(update)
    })
})
