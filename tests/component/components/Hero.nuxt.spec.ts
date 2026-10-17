// @vitest-environment nuxt
import {it, expect, describe, beforeEach, afterEach} from 'vitest'
import {mountSuspended} from "@nuxt/test-utils/runtime"
import {enableAutoUnmount} from '@vue/test-utils'
import Hero from '~/components/landing/Hero.vue'
import {resetStores} from '~~/tests/component/testHelpers'

enableAutoUnmount(afterEach)

beforeEach(() => {
    resetStores()
})

describe('Hero', () => {
    it('can mount the component', async () => {
        const hero = await mountSuspended(Hero)
        expect(hero.html()).toContain('Velkommen')
    })
})
