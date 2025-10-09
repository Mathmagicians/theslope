import {describe, it, expect} from 'vitest'
import {toFormMode} from '../../../app/utils/form'
import {FORM_MODES} from '../../../app/types/form'

describe('toFormMode', () => {
    it.each([
        ['create', FORM_MODES.CREATE],
        ['edit', FORM_MODES.EDIT],
        ['view', FORM_MODES.VIEW]
    ])('should return correct FormMode for valid mode %s', (mode, expected) => {
        expect(toFormMode(mode)).toBe(expected)
    })

    it('should return undefined for invalid mode', () => {
        expect(toFormMode('invalid')).toBeUndefined()
    })

    it('should return undefined for undefined mode', () => {
        expect(toFormMode(undefined)).toBeUndefined()
    })
})
