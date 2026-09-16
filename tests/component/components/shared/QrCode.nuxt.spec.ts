// @vitest-environment nuxt
import {describe, it, expect} from 'vitest'
import {mountSuspended} from '@nuxt/test-utils/runtime'
import QrCode from '~/components/shared/QrCode.vue'
import {encodeQrPath} from '~/utils/qr'

const POSTER_URL = 'https://theslope.example/admin/allergies/pdf'
const OTHER_URL = 'https://theslope.example/admin/allergies'

const mount = (props: Record<string, unknown> = {}) =>
    mountSuspended(QrCode, {props: {value: POSTER_URL, ...props}})

describe('QrCode', () => {
    it('renders an image-role svg carrying the encoded value for screen readers', async () => {
        const wrapper = await mount({label: 'Scan for online version'})
        const svg = wrapper.find('svg[role="img"]')

        expect(svg.exists()).toBe(true)
        expect(svg.attributes('aria-label')).toContain('Scan for online version')
        expect(svg.attributes('aria-label')).toContain(POSTER_URL)
    })

    it('sizes the viewBox in modules and the svg in pixels', async () => {
        const wrapper = await mount({size: 120})
        const {size} = encodeQrPath(POSTER_URL)
        const svg = wrapper.find('svg')

        expect(svg.attributes('viewBox')).toBe(`0 0 ${size} ${size}`)
        expect(svg.attributes('width')).toBe('120')
        expect(svg.attributes('height')).toBe('120')
    })

    it('redraws the path when the value changes', async () => {
        const wrapper = await mount()
        const before = wrapper.find('path').attributes('d')

        await wrapper.setProps({value: OTHER_URL})

        expect(wrapper.find('path').attributes('d')).not.toBe(before)
    })
})
