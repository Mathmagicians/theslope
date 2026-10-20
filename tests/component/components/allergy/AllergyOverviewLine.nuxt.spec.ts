// @vitest-environment nuxt
/**
 * AllergyOverviewLine - the allergic diners' kuverter, then each allergen with its kuverter, a pipe between the parts.
 * Real component, real design system (testing.md Rule 6).
 */
import {describe, it, expect, afterEach} from 'vitest'
import {enableAutoUnmount} from '@vue/test-utils'
import AllergyOverviewLine from '~/components/allergy/AllergyOverviewLine.vue'
import {mountWithTooltipProvider} from '~~/tests/component/testHelpers'
import {formatPortions} from '~/utils/utils'

enableAutoUnmount(afterEach)

const MILK = {id: 2, name: 'Mælk', description: 'Laktoseintolerans', icon: '🥛', portions: 2}
const NUTS = {id: 3, name: 'Nødder', description: 'Nøddeallergi', icon: '🥜', portions: 0.5}

// The line's parts as their spans read: the total, each allergen, and each pipe between them as its own span
const spansOf = (wrapper: Awaited<ReturnType<typeof mountWithTooltipProvider>>) =>
    wrapper.findAll(':scope > span').map(span => span.text())

describe('AllergyOverviewLine', () => {
    it.each([
        {desc: 'two allergens', allergens: [MILK, NUTS], spans: [`${formatPortions(2.5)} kuv.`, '|', `${MILK.icon}${MILK.name} · ${formatPortions(2)}`, '|', `${NUTS.icon}${NUTS.name} · ${formatPortions(0.5)}`]},
        {desc: 'no allergen', allergens: [], spans: [`${formatPortions(2.5)} kuv.`]}
    ])('GIVEN $desc THEN the line reads the total, then each allergen with a pipe before it', async ({allergens, spans}) => {
        const wrapper = await mountWithTooltipProvider(AllergyOverviewLine, {props: {totalPortions: 2.5, allergens}})
        expect(spansOf(wrapper)).toEqual(spans)
    })
})
