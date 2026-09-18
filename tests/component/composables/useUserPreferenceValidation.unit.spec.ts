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
    AppearanceSchema,
    NotificationChannelSchema,
    UserPreferencesUpdateSchema
} = useUserPreferenceValidation()

describe('useUserPreferenceValidation - enums', () => {
    it.each([
        {schema: 'PaletteSchema', values: ['default', 'high-contrast', 'colorblind']},
        {schema: 'TextScaleSchema', values: ['normal', 'large', 'larger']},
        {schema: 'NotificationChannelSchema', values: ['EMAIL', 'SMS']}
    ])('GIVEN $schema THEN its options are $values', ({schema, values}) => {
        const options = {PaletteSchema, TextScaleSchema, NotificationChannelSchema}[schema]!.options
        expect(options).toEqual(values)
    })

    it.each([
        {desc: 'an unlisted palette', schema: PaletteSchema, input: 'neon'},
        {desc: 'the retired palette key', schema: PaletteSchema, input: 'tydelig'},
        {desc: 'an unlisted text scale', schema: TextScaleSchema, input: 'huge'},
        {desc: 'an unlisted channel', schema: NotificationChannelSchema, input: 'PIGEON'}
    ])('GIVEN $desc THEN it is rejected', ({schema, input}) => {
        expect(() => schema.parse(input)).toThrow()
    })
})

describe('useUserPreferenceValidation - AppearanceSchema', () => {
    it('GIVEN an empty object THEN it parses to the default appearance', () => {
        expect(AppearanceSchema.parse({})).toEqual(DEFAULT_APPEARANCE)
    })

    it('GIVEN the default appearance THEN it is the column default', () => {
        expect(DEFAULT_APPEARANCE).toEqual({palette: 'default', textScale: 'normal'})
    })

    it('GIVEN a full appearance THEN it round-trips through JSON', () => {
        const appearance = {palette: 'high-contrast' as const, textScale: 'large' as const}
        expect(AppearanceSchema.parse(JSON.parse(JSON.stringify(appearance)))).toEqual(appearance)
    })

    it('GIVEN an appearance stored with the retired palette tydelig THEN it reads as the default palette', () => {
        // Tydelig became the default palette; appearances saved while it was an option keep their text scale
        expect(AppearanceSchema.parse({palette: 'tydelig', textScale: 'large'})).toEqual({palette: 'default', textScale: 'large'})
    })

    it('GIVEN an unlisted palette THEN the appearance is rejected', () => {
        expect(() => AppearanceSchema.parse({palette: 'neon', textScale: 'normal'})).toThrow()
    })
})

describe('useUserPreferenceValidation - readAppearance', () => {
    it.each([
        {desc: 'nothing stored', stored: undefined, expected: DEFAULT_APPEARANCE},
        {desc: 'a valid appearance', stored: {palette: 'colorblind', textScale: 'larger'}, expected: {palette: 'colorblind', textScale: 'larger'}},
        {desc: 'the retired palette tydelig', stored: {palette: 'tydelig', textScale: 'large'}, expected: {palette: 'default', textScale: 'large'}},
        {desc: 'an unlisted palette', stored: {palette: 'neon', textScale: 'large'}, expected: {palette: 'default', textScale: 'large'}},
        {desc: 'an unlisted text scale', stored: {palette: 'high-contrast', textScale: 'huge'}, expected: {palette: 'high-contrast', textScale: 'normal'}},
        {desc: 'a value that is no object', stored: 'high-contrast', expected: DEFAULT_APPEARANCE}
    ])('GIVEN $desc THEN each field reads as stored or falls back to its default', ({stored, expected}) => {
        expect(readAppearance(stored)).toEqual(expected)
    })
})

describe('useUserPreferenceValidation - PALETTES registry', () => {
    it('GIVEN the registry THEN it has one entry per palette', () => {
        expect(Object.keys(PALETTES)).toEqual([...PaletteSchema.options])
    })

    it.each([
        {palette: 'default' as const, level: 'AA' as const, colourSafe: false},
        {palette: 'high-contrast' as const, level: 'AAA' as const, colourSafe: false},
        {palette: 'colorblind' as const, level: 'AA' as const, colourSafe: true}
    ])('GIVEN $palette THEN its verified level is $level and colourSafe is $colourSafe', ({palette, level, colourSafe}) => {
        expect(PALETTES[palette]).toEqual({level, colourSafe})
    })

    it('GIVEN the registry THEN one preset carries the enhanced level', () => {
        // 1.4.6 AAA is one preset's promise: a member who needs it picks it by name, and the
        // contrast spec measures every pair of that one at 7:1
        expect(Object.entries(PALETTES).filter(([, entry]) => entry.level === 'AAA').map(([key]) => key))
            .toEqual(['high-contrast'])
    })

    it('GIVEN the registry THEN one preset carries the colour-safe mapping', () => {
        // The Color Universal Design anchors are one preset's job; two would be two answers to
        // the same question, and the colour-vision spec measures the one that claims it
        expect(Object.values(PALETTES).filter(entry => entry.colourSafe)).toHaveLength(1)
    })
})

describe('useUserPreferenceValidation - UserPreferencesUpdateSchema', () => {
    it.each([
        {desc: 'both fields', input: {notificationChannels: ['EMAIL'], appearance: {palette: 'high-contrast', textScale: 'large'}}},
        {desc: 'channels only', input: {notificationChannels: ['EMAIL', 'SMS']}},
        {desc: 'appearance only', input: {appearance: {palette: 'default', textScale: 'larger'}}},
        {desc: 'no channels at all', input: {notificationChannels: []}},
        {desc: 'nothing', input: {}}
    ])('GIVEN $desc THEN the update parses', ({input}) => {
        expect(() => UserPreferencesUpdateSchema.parse(input)).not.toThrow()
    })

    it.each([
        {desc: 'an unlisted channel', input: {notificationChannels: ['PIGEON']}},
        {desc: 'an unlisted palette', input: {appearance: {palette: 'neon', textScale: 'normal'}}},
        {desc: 'channels that are not an array', input: {notificationChannels: 'EMAIL'}}
    ])('GIVEN $desc THEN the update is rejected', ({input}) => {
        expect(() => UserPreferencesUpdateSchema.parse(input)).toThrow()
    })

    it('GIVEN the default channels THEN they match the column default', () => {
        expect(DEFAULT_NOTIFICATION_CHANNELS).toEqual(['EMAIL'])
    })
})
