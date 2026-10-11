// @vitest-environment nuxt
import {describe, it, expect, beforeAll} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import {ref} from 'vue'
import VatAmount from '~/components/shared/VatAmount.vue'
import {useOrder} from '~/composables/useOrder'
import {useTicket} from '~/composables/useTicket'
import {findByTestId} from '~~/tests/component/testHelpers'

/**
 * VatAmount: one gross figure rendered in both units, the ex moms half first; a balance carries its sign and icon.
 */
const {convertVat} = useOrder()
const {formatPrice} = useTicket()

let vatPercent: number
beforeAll(() => {
    vatPercent = useAppConfig().theslope?.kitchen?.vatPercent ?? 25
})

const mount = (props: {gross: number, balance?: boolean}) => mountSuspended(VatAmount, {props, global: {provide: {isMd: ref(true)}}})

describe('VatAmount', () => {
    it('GIVEN a gross amount WHEN rendering THEN the ex moms figure comes first and the inkl. moms half after the slash', async () => {
        const wrapper = await mount({gross: 178100})
        expect(findByTestId(wrapper, 'vat-amount-ex').text()).toBe(formatPrice(convertVat(178100, vatPercent, true)))
        expect(findByTestId(wrapper, 'vat-amount-incl').text()).toBe(`/ ${formatPrice(178100)} kr`)
        expect(findByTestId(wrapper, 'vat-amount-ok').exists()).toBe(false)
        expect(findByTestId(wrapper, 'vat-amount-over').exists()).toBe(false)
    })

    it.each([
        {desc: 'at or above zero', gross: 14300, sign: '+', icon: 'vat-amount-ok', other: 'vat-amount-over'},
        {desc: 'below zero', gross: -14400, sign: '-', icon: 'vat-amount-over', other: 'vat-amount-ok'}
    ])('GIVEN a balance $desc WHEN rendering THEN both halves carry the sign and the matching icon shows', async ({gross, sign, icon, other}) => {
        const wrapper = await mount({gross, balance: true})
        expect(findByTestId(wrapper, 'vat-amount-ex').text()).toBe(`${sign}${formatPrice(Math.abs(convertVat(gross, vatPercent, true)))}`)
        expect(findByTestId(wrapper, 'vat-amount-incl').text()).toBe(`/ ${sign}${formatPrice(Math.abs(gross))} kr`)
        expect(findByTestId(wrapper, icon).exists()).toBe(true)
        expect(findByTestId(wrapper, other).exists()).toBe(false)
    })

    it('GIVEN a balance of zero WHEN rendering THEN it reads as in balance', async () => {
        const wrapper = await mount({gross: 0, balance: true})
        expect(findByTestId(wrapper, 'vat-amount-ex').text()).toBe(`+${formatPrice(0)}`)
        expect(findByTestId(wrapper, 'vat-amount-ok').exists()).toBe(true)
    })
})
