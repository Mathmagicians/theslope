import {describe, it, expect} from 'vitest'
import {encode} from 'uqr'
import {encodeQrPath} from '~/utils/qr'

const POSTER_URL = 'https://theslope.example/admin/allergies/pdf'
const OTHER_URL = 'https://theslope.example/admin/allergies'

// The library is the reference: the util only reshapes its module matrix into one path
const darkModuleCount = (value: string) =>
    encode(value, {ecc: 'M', border: 1}).data.flat().filter(Boolean).length

describe('encodeQrPath', () => {
    it('reports the module grid size the encoder produced', () => {
        expect(encodeQrPath(POSTER_URL).size).toBe(encode(POSTER_URL, {ecc: 'M', border: 1}).size)
    })

    it('draws one 1x1 module rect per dark module, starting at a move', () => {
        const {d} = encodeQrPath(POSTER_URL)

        expect(d.startsWith('M')).toBe(true)
        expect(d.match(/h1v1h-1z/g)).toHaveLength(darkModuleCount(POSTER_URL))
    })

    it('encodes a different value to a different path', () => {
        expect(encodeQrPath(POSTER_URL).d).not.toBe(encodeQrPath(OTHER_URL).d)
    })

    it.each([
        {option: 'border', options: {border: 4}},
        {option: 'ecc', options: {ecc: 'H' as const}}
    ])('passes $option through to the encoder', ({options}) => {
        const {size} = encodeQrPath(POSTER_URL, options)

        expect(size).toBe(encode(POSTER_URL, {ecc: 'M', border: 1, ...options}).size)
    })
})
