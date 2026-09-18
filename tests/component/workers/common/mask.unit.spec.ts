import {describe, expect, it} from 'vitest'
import {maskEmail, maskMsisdn, maskName, maskRecipient} from '~~/workers/common/mask'

describe('mask', () => {
    it.each([
        ['anna.hansen@skraaningen.dk', 'a***@s***.dk'],
        ['test@mathmagicians.dk', 't***@m***.dk'],
        ['x@localhost', 'x***@l***'],
        ['not-an-email', '***']
    ])('masks the e-mail %s as %s', (email, masked) => expect(maskEmail(email)).toBe(masked))

    it.each([
        ['Anna Hansen', 'A*** H***'],
        ['Anna', 'A***'],
        ['  Anna   Lise  Hansen ', 'A*** L*** H***']
    ])('masks the name %s as %s', (name, masked) => expect(maskName(name)).toBe(masked))

    it.each([
        ['4512345678', '45******78'],
        ['4512', '****']
    ])('masks the msisdn %s as %s', (msisdn, masked) => expect(maskMsisdn(msisdn)).toBe(masked))

    it.each([
        ['EMAIL', 'anna.hansen@skraaningen.dk', 'a***@s***.dk'],
        ['SMS', '4512345678', '45******78']
    ] as const)('masks a %s recipient', (channel, to, masked) => expect(maskRecipient(channel, to)).toBe(masked))
})
