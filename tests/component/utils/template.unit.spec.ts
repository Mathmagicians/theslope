import {describe, expect, it} from 'vitest'
import {fillTemplate} from '~/utils/template'

describe('fillTemplate', () => {
    it.each([
        ['a single placeholder', 'Hej {{name}}!', {name: 'Anna'}, 'Hej Anna!'],
        ['a placeholder used twice', '{{period}} / {{period}}', {period: '2026-08'}, '2026-08 / 2026-08'],
        ['Danish text and newlines around placeholders', 'Opgørelse for {{period}}:\n{{count}} husstande – i alt {{amount}} kr.', {period: 'august', count: '64', amount: '41.230,00'}, 'Opgørelse for august:\n64 husstande – i alt 41.230,00 kr.'],
        ['no placeholders', 'Fast tekst', {}, 'Fast tekst']
    ])('fills %s', (_name, template, values, expected) => {
        expect(fillTemplate(template, values)).toBe(expected)
    })

    it('throws on a placeholder without a value, naming it', () => {
        expect(() => fillTemplate('Hej {{name}}, {{missing}}', {name: 'Anna'})).toThrow(/missing/)
    })

    it('leaves no placeholder syntax behind', () => {
        expect(fillTemplate('{{a}} og {{b}}', {a: '1', b: '2'})).not.toContain('{{')
    })
})
