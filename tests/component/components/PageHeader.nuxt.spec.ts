// @vitest-environment nuxt
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import {enableAutoUnmount, flushPromises, type BaseWrapper, type VueWrapper} from '@vue/test-utils'
import {mockNuxtImport} from '@nuxt/test-utils/runtime'
import {ref, type ComponentPublicInstance, type Ref} from 'vue'
import type {HeaderProps, NavigationMenuProps} from '@nuxt/ui'
import {en} from '@nuxt/ui/locale'
import {mountWithTooltipProvider, resetStores, registerEmptyStoreEndpoints, VIEWPORTS} from '~~/tests/component/testHelpers'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import PageHeader from '~/components/PageHeader.vue'
import {COMPONENTS, NAVIGATION} from '~/composables/useTheSlopeDesignSystem'
import {getHouseholdUrl, HOUSEHOLD_TAB} from '~/utils/household'
import {BUTTON_WORDS} from '~/config/buttonWords'

const {session, useUserSession} = await vi.hoisted(async () => (await import('~~/tests/component/hoistedMocks')).mockSession())
mockNuxtImport('useUserSession', () => useUserSession)

const sessionUser = UserFactory.defaultUserWithInhabitant('page-header')
registerEmptyStoreEndpoints()

enableAutoUnmount(afterEach)

type Menu = VueWrapper<ComponentPublicInstance<NavigationMenuProps>>

const mountHeader = async (isMd: boolean | null | Ref<boolean | null>) => {
    const wrapper = await mountWithTooltipProvider(PageHeader, {isMd})
    await flushPromises()
    return wrapper
}

// The menus inside one of UHeader's slots: the centre, the right side, the drawer's body
const menusIn = (wrapper: BaseWrapper<Node>, slot: string): Menu[] =>
    wrapper.findAllComponents<ComponentPublicInstance<NavigationMenuProps>>({name: 'UNavigationMenu'})
        .filter(menu => menu.element.closest(`[data-slot="${slot}"]`))
const routesOf = (menu: Menu) => (menu.props('items') ?? []).flat().map(item => item.to)
const headerOf = (wrapper: BaseWrapper<Node>) => wrapper.findComponent<ComponentPublicInstance<HeaderProps>>({name: 'UHeader'})

describe('PageHeader', () => {
    beforeEach(() => {
        resetStores()
        session.user.value = sessionUser
    })

    describe('signed in', () => {
        const household = sessionUser.Inhabitant?.household
        // The household link opens the person's household on its bookings tab
        const areas = ['/dinner', household && getHouseholdUrl(household.shortName, household.pbsId, HOUSEHOLD_TAB.bookings), '/chef']
        const person = ['/admin', '/login']

        // The breakpoint places the menus in CSS, so the render before the layout measures it is the measured one
        it.each([...VIEWPORTS, {viewport: 'unmeasured', isMd: null}])('$viewport: the centre holds the areas, the right side the areas\' icons for a phone and the person\'s links from md', async ({isMd}) => {
            const wrapper = await mountHeader(isMd)

            expect(menusIn(wrapper, 'center').map(routesOf)).toEqual([areas])
            expect(menusIn(wrapper, 'right').map(menu => ({routes: routesOf(menu), class: menu.props('class')}))).toEqual([
                {routes: areas, class: COMPONENTS.pageHeader.areaIcons},
                {routes: person, class: COMPONENTS.pageHeader.personLinks}
            ])
        })

        it('the burger carries the framework\'s name and face by its open state, and opens the drawer on the person\'s links', async () => {
            const wrapper = await mountHeader(false)
            const toggle = wrapper.find('[data-slot="toggle"]')
            // Mounted without UApp, the framework speaks its default locale
            expect(toggle.attributes('aria-label')).toBe(en.messages.header.open)
            expect(headerOf(wrapper).props('toggle')).toEqual(NAVIGATION.toggle(false))

            await toggle.trigger('click')
            await flushPromises()

            expect(toggle.attributes('aria-label')).toBe(en.messages.header.close)
            expect(headerOf(wrapper).props('toggle')).toEqual(NAVIGATION.toggle(true))
            expect(menusIn(wrapper, 'body').map(routesOf)).toEqual([person])
        })

        // The drawer lists its items with their names; the bar's help is its icon alone
        it('GIVEN the drawer open on a phone THEN the drawer\'s help carries its label and the bar\'s none', async () => {
            const wrapper = await mountHeader(false)
            await wrapper.find('[data-slot="toggle"]').trigger('click')
            await flushPromises()

            const helpIn = (slot: string) => wrapper.findAllComponents({name: 'HelpButton'})
                .filter(help => help.element.closest(`[data-slot="${slot}"]`))
                .map(help => help.props('label'))
            expect(helpIn('body')).toEqual([BUTTON_WORDS.help])
            // The bar's right side, and the drawer's own header row that repeats it
            expect(helpIn('right')).toEqual([undefined, undefined])
        })

        // A drawer hidden by CSS would keep the page's scroll lock and focus trap
        it('GIVEN the drawer open on a phone WHEN the window widens past md THEN the drawer closes', async () => {
            const isMd = ref<boolean | null>(false)
            const wrapper = await mountHeader(isMd)
            await wrapper.find('[data-slot="toggle"]').trigger('click')
            await flushPromises()
            expect(headerOf(wrapper).props('open')).toBe(true)

            isMd.value = true
            await flushPromises()

            expect(headerOf(wrapper).props('open')).toBe(false)
            expect(menusIn(wrapper, 'body')).toEqual([])
        })
    })

    it('signed out, the right side holds the sign-in link alone, and the centre nothing', async () => {
        session.user.value = null
        const wrapper = await mountHeader(false)
        expect(menusIn(wrapper, 'right').map(routesOf)).toEqual([['/login']])
        expect(menusIn(wrapper, 'center').map(routesOf)).toEqual([[]])
    })

    it('the title link leads home under the community\'s name', async () => {
        const title = (await mountHeader(false)).find('[data-slot="title"]')
        expect(title.attributes('aria-label')).toBe('Skråningen')
        expect(title.attributes('href')).toBe('/')
    })

    it('the header and the right side\'s menus bind the page header tokens', async () => {
        const wrapper = await mountHeader(false)
        expect(headerOf(wrapper).props('ui')).toBe(COMPONENTS.pageHeader.ui)
        expect(menusIn(wrapper, 'right').map(menu => menu.props('ui'))).toEqual([COMPONENTS.pageHeader.mainMenuUi, COMPONENTS.pageHeader.mainMenuUi])
    })
})
