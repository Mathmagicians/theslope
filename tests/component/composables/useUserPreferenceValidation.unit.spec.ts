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
    DEFAULT_NOTIFICATION_CHANNELS
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
        {schema: 'PaletteSchema', values: ['default', 'tydelig', 'colorblind']},
        {schema: 'TextScaleSchema', values: ['normal', 'large', 'larger']},
        {schema: 'NotificationChannelSchema', values: ['EMAIL', 'SMS']}
    ])('GIVEN $schema THEN its options are $values', ({schema, values}) => {
        const options = {PaletteSchema, TextScaleSchema, NotificationChannelSchema}[schema]!.options
        expect(options).toEqual(values)
    })

    it.each([
        {desc: 'an unlisted palette', schema: PaletteSchema, input: 'high-contrast'},
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
        const appearance = {palette: 'tydelig' as const, textScale: 'large' as const}
        expect(AppearanceSchema.parse(JSON.parse(JSON.stringify(appearance)))).toEqual(appearance)
    })

    it('GIVEN an unlisted palette THEN the appearance is rejected', () => {
        expect(() => AppearanceSchema.parse({palette: 'neon', textScale: 'normal'})).toThrow()
    })
})

describe('useUserPreferenceValidation - PALETTES registry', () => {
    it('GIVEN the registry THEN it has one entry per palette', () => {
        expect(Object.keys(PALETTES)).toEqual([...PaletteSchema.options])
    })

    it.each([
        {palette: 'default' as const, level: null, colourSafe: false},
        {palette: 'tydelig' as const, level: 'AA' as const, colourSafe: false},
        {palette: 'colorblind' as const, level: 'AA' as const, colourSafe: true}
    ])('GIVEN $palette THEN its verified level is $level and colourSafe is $colourSafe', ({palette, level, colourSafe}) => {
        expect(PALETTES[palette]).toEqual({level, colourSafe})
    })

    it('GIVEN the registry THEN one preset carries the colour-safe mapping', () => {
        // The Color Universal Design anchors are one preset's job; two would be two answers to
        // the same question, and the colour-vision spec measures the one that claims it
        expect(Object.values(PALETTES).filter(entry => entry.colourSafe)).toHaveLength(1)
    })
})

describe('useUserPreferenceValidation - UserPreferencesUpdateSchema', () => {
    it.each([
        {desc: 'both fields', input: {notificationChannels: ['EMAIL'], appearance: {palette: 'tydelig', textScale: 'large'}}},
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
