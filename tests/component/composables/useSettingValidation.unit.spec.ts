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
    splitNotes
} from '~/composables/useSettingValidation'
import {useCoreValidation} from '~/composables/useCoreValidation'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'

const {SystemRoleSchema} = useCoreValidation()
const SystemRole = SystemRoleSchema.enum

const ALLERGY_NOTES_KEY = SettingKeySchema.enum['allergy-poster-notes']
const notesEntry = () => SETTING_REGISTRY[ALLERGY_NOTES_KEY]

const userWithRoles = (systemRoles: Array<typeof SystemRole[keyof typeof SystemRole]>) =>
    UserFactory.defaultUserWithInhabitant('setting-registry', {systemRoles})

describe('useSettingValidation - SettingDetailSchema', () => {
    it('parses a written row off the wire, the HTTP date string back to a Date (ADR-010)', () => {
        const parsed = SettingDetailSchema.parse({
            key: ALLERGY_NOTES_KEY,
            value: 'En bemærkning',
            updatedAt: '2026-09-18T10:00:00.000Z',
            updatedByUserId: 7
        })

        expect(parsed.key).toBe(ALLERGY_NOTES_KEY)
        expect(parsed.value).toBe('En bemærkning')
        expect(parsed.updatedByUserId).toBe(7)
        expect(parsed.updatedAt).toBeInstanceOf(Date)
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
        {label: 'a note', value: 'En bemærkning', valid: true},
        {label: 'whitespace only', value: '   \n  ', valid: false}
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
        {label: 'a member', roles: [], expected: false}
    ])('$label may write: $expected', ({roles, expected}) => {
        expect(notesEntry().canWrite(userWithRoles(roles))).toBe(expected)
    })
})

describe('useSettingValidation - splitNotes', () => {
    it.each([
        {label: 'blank lines are not notes', text: 'A\n\nB', expected: ['A', 'B']},
        {label: 'surrounding whitespace is trimmed', text: '  A  \n B ', expected: ['A', 'B']}
    ])('$label', ({text, expected}) => {
        expect(splitNotes(text)).toEqual(expected)
    })
})
