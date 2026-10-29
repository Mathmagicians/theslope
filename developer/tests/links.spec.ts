import {test, expect, type Page} from '@playwright/test'

/**
 * The developer companion as GitHub Pages serves it: BASE_URL is the site's address (`make developer-test url=`).
 * Each link of a page's body opens a page or a file of the site, or an address outside it; the header carries the link
 * to the repository. GitHub Pages serves a page as a folder, so the browser resolves a link on the page's address with
 * a trailing slash: the spec clicks a link, as a reader does, rather than read its href
 */

const SECTIONS = ['docs', 'environments'] as const
const REPOSITORY = 'https://github.com/Mathmagicians/theslope'
// The title of Nuxt's error page
const MISSING_PAGE = /not found/i
// A link's share of the test's time: a click between two page loads
const LINK_TIMEOUT_MS = 10_000

/** A link of a page's body: its position among the body's links and its href as the browser resolves it */
type BodyLink = {page: string, index: number, text: string, href: string, newTab: boolean}

/** Opens the address once Nuxt has hydrated it and the manifests the environment pages fetch in the browser have rendered */
const gotoSettled = async (page: Page, address: string) => {
    await page.goto(address)
    await page.waitForFunction(() => (window as unknown as {useNuxtApp?: () => {isHydrating?: boolean}}).useNuxtApp?.().isHydrating === false)
    await page.waitForLoadState('networkidle')
}

/** The page's address without its trailing slash and fragment */
const pageAddressOf = (address: string) => address.replace(/\/?(#.*)?$/, '')

/** The links of the page's body, one per href, an anchor on the page itself left out */
const bodyLinksOf = async (page: Page): Promise<BodyLink[]> => {
    const links = await page.locator('main a[href]').evaluateAll(anchors => anchors.map((anchor, index) => ({
        index,
        text: anchor.textContent?.trim() ?? '',
        href: (anchor as HTMLAnchorElement).href,
        newTab: (anchor as HTMLAnchorElement).target === '_blank'
    })))
    const here = pageAddressOf(page.url())
    const others = links.filter(link => pageAddressOf(link.href) !== here)
    return [...new Map(others.map(link => [link.href, {...link, page: page.url()}])).values()]
}

/** Where the link ends: a new tab opens its href, a link on the page goes where the page's router sends it */
const landingOf = async (page: Page, link: BodyLink): Promise<string> => {
    if (link.newTab) return link.href
    await gotoSettled(page, link.page)
    await page.locator('main a[href]').nth(link.index).click()
    await page.waitForURL(url => url.href !== link.page)
    return page.url()
}

/** Why the address shows a missing page, null when it opens: a page of the site by the title it renders, a file or another site by its status */
const missingOf = async (page: Page, siteRoot: string, address: string): Promise<string | null> => {
    const isSitePage = address.startsWith(siteRoot) && !/\.[a-z0-9]+$/i.test(new URL(address).pathname)
    if (!isSitePage) {
        const response = await page.request.get(address)
        return response.ok() ? null : `status ${response.status()}`
    }
    await gotoSettled(page, address)
    const title = await page.title()
    return MISSING_PAGE.test(title) ? `title "${title}"` : null
}

test.describe('Developer companion links', () => {
    for (const section of SECTIONS) {
        test(`GIVEN the ${section} pages WHEN each link of a page body is followed THEN it opens a page or a file`, async ({page, baseURL}) => {
            // The site root as the browser lands on it, after the redirects of the repository's github.io address
            await gotoSettled(page, baseURL!)
            const siteRoot = page.url()
            const sectionRoot = new URL(section, siteRoot).href
            await gotoSettled(page, sectionRoot)
            const pages = (await bodyLinksOf(page)).map(link => link.href).filter(href => href.startsWith(sectionRoot))
            expect(pages.length, `the ${section} index lists its pages`).toBeGreaterThan(0)
            const links: BodyLink[] = []
            for (const address of pages) {
                await gotoSettled(page, address)
                links.push(...await bodyLinksOf(page))
            }
            test.setTimeout(links.length * LINK_TIMEOUT_MS)

            const checked = new Map<string, string | null>()
            const missing: string[] = []
            for (const link of links) {
                const landing = await landingOf(page, link)
                if (!checked.has(landing)) checked.set(landing, await missingOf(page, siteRoot, landing))
                const reason = checked.get(landing)
                if (reason) missing.push(`${link.page} "${link.text}" → ${landing} (${reason})`)
            }

            expect(missing, 'the links that end on a missing page').toEqual([])
        })
    }

    test('GIVEN the site WHEN its header is read THEN it links to the repository with the GitHub logo', async ({page, baseURL}) => {
        await gotoSettled(page, baseURL!)
        const repositoryLink = page.locator('header').getByRole('link', {name: 'GitHub'})
        await expect(repositoryLink).toHaveAttribute('href', REPOSITORY)
        await expect(repositoryLink.locator('.iconify')).toBeVisible()
    })
})
