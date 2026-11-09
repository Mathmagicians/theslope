import {expect, type Locator, type Page, type ViewportSize} from '@playwright/test'
import {defineParameterType} from 'playwright-bdd'
import {When, Then, fromScene, contextOfActor, teamOf, type Actor, type Scene} from '~~/tests/e2e/fixtures'
import testHelpers from '~~/tests/e2e/testHelpers'

const {gotoHydrated, PHONE_VIEWPORT} = testHelpers

const MANIFEST_PATH = '/manifest.webmanifest'

When('a visitor opens the app', async ({page}) => {
    await page.goto('/')
})

Then('the app\'s title names {string}', async ({page}, name: string) => {
    await expect(page).toHaveTitle(new RegExp(name))
})

Then('the app links its PWA manifest', async ({page}) => {
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', MANIFEST_PATH)
})

Then('the PWA manifest serves standalone with its icons', async ({request}) => {
    const response = await request.get(MANIFEST_PATH)
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.length).toBeGreaterThan(0)
    for (const icon of manifest.icons) {
        const iconResponse = await request.get(icon.src)
        expect(iconResponse.status(), `icon ${icon.src}`).toBe(200)
    }
})

/** The screens by their words in a feature: a desktop (md and up) and a phone */
const SCREENS = {desktop: {width: 1280, height: 900}, phone: PHONE_VIEWPORT} satisfies Record<string, ViewportSize>
defineParameterType({name: 'screen', regexp: Object.keys(SCREENS), transformer: (words: string) => SCREENS[words as keyof typeof SCREENS]})

/** A page's calendar open or closed */
const CALENDAR_STATES = ['open', 'closed'] as const
type CalendarState = typeof CALENDAR_STATES[number]
defineParameterType({name: 'calendarState', regexp: [...CALENDAR_STATES]})

/** The view in the URL the page opens with: none, or the calendar open or closed */
const NO_VIEW = 'none'
defineParameterType({
    name: 'urlView',
    regexp: [NO_VIEW, ...CALENDAR_STATES],
    transformer: (words: string): CalendarState | null => words === NO_VIEW ? null : CALENDAR_STATES.find(state => state === words)!
})

/**
 * The pages with a calendar by their path in a feature: the query the page opens with ('/chef' shows team 1 of the
 * scene), the query parameter that holds the calendar's view and its value for a state, and the calendar on the page
 */
type CalendarPage = {
    path: string,
    query: (scene: Scene) => Record<string, string>,
    viewKey: string,
    viewOf: (state: CalendarState) => string,
    calendar: (page: Page) => Locator
}
const CALENDAR_PAGES: CalendarPage[] = [
    {
        path: '/chef', query: scene => ({team: String(teamOf(scene, 1).id)}), viewKey: 'view', viewOf: state => `calendar:${state}`,
        calendar: page => page.getByTestId('chef-calendar-content')
    },
    {
        path: '/dinner', query: () => ({}), viewKey: 'cal', viewOf: state => state,
        calendar: page => page.locator('[data-testid^="calendar-dinner-date-"]').first()
    }
]
defineParameterType({
    name: 'calendarPage',
    regexp: CALENDAR_PAGES.map(calendarPage => calendarPage.path),
    transformer: (path: string): CalendarPage => CALENDAR_PAGES.find(calendarPage => calendarPage.path === path)!
})

When('{actor} opens {calendarPage} on a {screen} with the view {urlView}', async ({scene}, actor: Actor, calendarPage: CalendarPage, viewport: ViewportSize, view: CalendarState | null) => {
    const page = await contextOfActor(scene, actor).newPage()
    await page.setViewportSize(viewport)
    scene.page = page
    const query = new URLSearchParams(calendarPage.query(scene))
    if (view) query.set(calendarPage.viewKey, calendarPage.viewOf(view))
    await gotoHydrated(page, `${calendarPage.path}?${query}`)
})

// The view syncs to the URL once the layout has measured the screen
Then('the calendar on {calendarPage} is {calendarState}', async ({scene}, calendarPage: CalendarPage, state: CalendarState) => {
    const page = fromScene(scene, 'page')
    await expect.poll(() => new URL(page.url()).searchParams.get(calendarPage.viewKey), 'the URL has the view').toBe(calendarPage.viewOf(state))
    const calendar = calendarPage.calendar(page)
    if (state === 'open') await expect(calendar).toBeVisible()
    else await expect(calendar).toBeHidden()
})
