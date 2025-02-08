// @vitest-environment nuxt
import { it, expect, describe } from 'vitest'
import {mountSuspended} from "@nuxt/test-utils/runtime"
import Hero from '../../components/landing/Hero.vue'

describe('Hero', () => {
    it('can mount the component', async () => {
        const hero = await mountSuspended(Hero)
        expect(hero.html()).toContain('Velkommen')
    })
})
