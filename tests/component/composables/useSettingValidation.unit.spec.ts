/**
 * Unit tests for useSettingValidation - the Setting entity's validation layer and its key
 * registry (ADR-001).
 *
 * One entity type (Display is Detail, ADR-009): a key, its value, and who last wrote it.
 * `updatedAt` and `updatedByUserId` are nullable, because a key without a row answers with
 * the registry default and has never been written.
 *
 * The registry is what the server reads: the value schema validates the body, `defaultValue`
 * answers an unwritten key, and `canWrite` decides the 403.
 */
import {describe, it, expect} from 'vitest'
import {
    SETTING_KEYS,
    SettingKeySchema,
    SettingDetailSchema,
    SETTING_REGISTRY,
    DEFAULT_ALLERGY_POSTER_NOTES,
    splitNotes,
    useSettingValidation,
    type SettingDetail
} from '~/composables/useSettingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

const {SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

const ALLERGY_NOTES_KEY = 'allergy-poster-notes'
const notesEntry = () => SETTING_REGISTRY[ALLERGY_NOTES_KEY]

const aSetting = (overrides: Partial<SettingDetail> = {}) => ({
    key: ALLERGY_NOTES_KEY,
    value: 'En bemærkning',
    updatedAt: new Date('2026-09-18T10:00:00.000Z'),
    updatedByUserId: 7,
    ...overrides
})

const userWithRoles = (systemRoles: Array<typeof SystemRole[keyof typeof SystemRole]>) =>
    UserFactory.defaultUserWithInhabitant('setting-registry', {systemRoles})

describe('useSettingValidation - keys', () => {
    it('registers the allergy poster notes key', () => {
        expect(SETTING_KEYS).toContain(ALLERGY_NOTES_KEY)
    })

    it.each([
        {key: ALLERGY_NOTES_KEY, valid: true},
        {key: 'not-a-setting', valid: false},
        {key: '', valid: false}
    ])('SettingKeySchema accepts "$key": $valid', ({key, valid}) => {
        expect(SettingKeySchema.safeParse(key).success).toBe(valid)
    })
})

describe('useSettingValidation - SettingDetailSchema', () => {
    it('parses a written row', () => {
        const parsed = SettingDetailSchema.parse(aSetting())

        expect(parsed.key).toBe(ALLERGY_NOTES_KEY)
        expect(parsed.value).toBe('En bemærkning')
        expect(parsed.updatedByUserId).toBe(7)
    })

    it('coerces the HTTP date string back to a Date (ADR-010)', () => {
        const parsed = SettingDetailSchema.parse({...aSetting(), updatedAt: '2026-09-18T10:00:00.000Z'})

        expect(parsed.updatedAt).toBeInstanceOf(Date)
    })

    it('parses an unwritten key - the registry default carries no author and no timestamp', () => {
        const parsed = SettingDetailSchema.parse(aSetting({updatedAt: null, updatedByUserId: null}))

        expect(parsed.updatedAt).toBeNull()
        expect(parsed.updatedByUserId).toBeNull()
    })

    it.each([
        {field: 'key', row: aSetting({key: 'unknown-key' as never})},
        {field: 'value', row: {...aSetting(), value: 42}},
        {field: 'updatedByUserId', row: {...aSetting(), updatedByUserId: 'seven'}}
    ])('rejects a bad $field', ({row}) => {
        expect(SettingDetailSchema.safeParse(row).success).toBe(false)
    })
})

describe('useSettingValidation - registry', () => {
    it('declares an entry for every registered key', () => {
        expect(Object.keys(SETTING_REGISTRY).sort()).toEqual([...SETTING_KEYS].sort())
    })

    it('defaults the allergy poster notes to the three registry bullets', () => {
        expect(notesEntry().defaultValue).toBe(DEFAULT_ALLERGY_POSTER_NOTES)
        expect(splitNotes(notesEntry().defaultValue)).toHaveLength(3)
    })
})

describe('useSettingValidation - allergy poster notes value schema', () => {
    it.each([
        {label: 'a single note', value: 'En bemærkning', valid: true},
        {label: 'several lines', value: 'A\nB\nC', valid: true},
        {label: 'an empty text', value: '', valid: false},
        {label: 'whitespace only', value: '   \n  ', valid: false},
        {label: 'over 2000 characters', value: 'x'.repeat(2001), valid: false}
    ])('$label is accepted: $valid', ({value, valid}) => {
        expect(notesEntry().valueSchema.safeParse(value).success).toBe(valid)
    })

    it('trims the stored text', () => {
        expect(notesEntry().valueSchema.parse('  En bemærkning  ')).toBe('En bemærkning')
    })
})

describe('useSettingValidation - who may write the allergy poster notes', () => {
    it.each([
        {label: 'ADMIN', roles: [SystemRole.ADMIN], expected: true},
        {label: 'ALLERGYMANAGER', roles: [SystemRole.ALLERGYMANAGER], expected: true},
        {label: 'both roles', roles: [SystemRole.ADMIN, SystemRole.ALLERGYMANAGER], expected: true},
        {label: 'a member', roles: [], expected: false}
    ])('$label may write: $expected', ({roles, expected}) => {
        expect(notesEntry().canWrite(userWithRoles(roles))).toBe(expected)
    })
})

describe('useSettingValidation - splitNotes', () => {
    it.each([
        {label: 'one note per line', text: 'A\nB', expected: ['A', 'B']},
        {label: 'blank lines are not notes', text: 'A\n\nB', expected: ['A', 'B']},
        {label: 'surrounding whitespace is trimmed', text: '  A  \n B ', expected: ['A', 'B']},
        {label: 'an empty text has no notes', text: '', expected: []}
    ])('$label', ({text, expected}) => {
        expect(splitNotes(text)).toEqual(expected)
    })
})

describe('useSettingValidation - composable export', () => {
    it('exposes the schemas, the registry, the default and splitNotes', () => {
        const validation = useSettingValidation()

        expect(validation.SETTING_KEYS).toBe(SETTING_KEYS)
        expect(validation.SettingKeySchema).toBe(SettingKeySchema)
        expect(validation.SettingDetailSchema).toBe(SettingDetailSchema)
        expect(validation.SETTING_REGISTRY).toBe(SETTING_REGISTRY)
        expect(validation.DEFAULT_ALLERGY_POSTER_NOTES).toBe(DEFAULT_ALLERGY_POSTER_NOTES)
        expect(validation.splitNotes).toBe(splitNotes)
    })
})
