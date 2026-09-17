import {describe, it, expect} from 'vitest'
import {existsSync} from 'node:fs'
import {
    CHANNELS, LEAVES, MODES, NO_OVERRIDE, buildPairs, createResolver, meetsThreshold, referencesFor,
    repoFile, repoPath, round, type Mode, type Pair
} from './designSystemPairs'
import {contrastRatio, composite, hexToRgb, oklchToHex, parsePaletteOverrides, rgbToOklch, withLightness} from './contrast'
import {PALETTES_UNDER_TEST} from './palettes'
import {PRESETS} from '../../../scripts/palettes/presets'
import {renderPreset} from '../../../scripts/palettes/render'

/**
 * Architecture test - EN 301 549 / WCAG 2.1 contrast across the design-system tokens.
 *
 * This asserts a *property* of the palette, never a token value (docs/testing.md forbids
 * `expect(token).toContain('text-lg')`): it resolves every colour the design system names
 * through the same stylesheets the browser reads, composites the alpha surfaces, and
 * measures the contrast ratio WCAG 2.1 defines. The pairs are derived by walking the design
 * system, so a token added tomorrow is measured tomorrow - nothing is typed out twice.
 *
 * The inventory, the resolution order and the scoping rules live in `designSystemPairs.ts`,
 * because `scripts/palettes/render.ts` solves the same pairs it is measured by. Which palettes are
 * measured, and at which level, comes from the registry the appearance card badges (`palettes.ts`),
 * so the promise a member reads and the assertion here are one value.
 *
 * Levels (WCAG 2.1, adopted by EN 301 549 clause 9.1.4):
 *   1.4.3  Contrast (Minimum), AA   - 4.5:1 body text, 3:1 large-scale text   → every palette today
 *   1.4.6  Contrast (Enhanced), AAA - 7:1 body text, 4.5:1 large-scale text   → a preset the registry badges AAA
 *   1.4.11 Non-text Contrast, AA    - 3:1 borders, rings, UI boundaries (no AAA level exists)
 *
 * When a case fails, fix the token - never the threshold. Pairs that fail today are listed
 * in KNOWN_FINDINGS with the ratio measured on 2026-09-17 and run as `it.fails`, so both a
 * regression in a green pair and a fix of a listed one break the build.
 */

// ---------------------------------------------------------------------------
// The default theme's baseline, measured 2026-09-17
// ---------------------------------------------------------------------------

/**
 * Pairs the default theme does not meet today, with the ratio measured on 2026-09-17.
 * They run as `it.fails`, so fixing one (a palette tune, a token swap) breaks the build and
 * asks for this entry to be removed - and a pair that is not listed may never start failing.
 *
 * finding 2026-09-17, awaiting the user's decision: TheSlope's Pantone palette is a warm
 * pastel set whose 500/400 rungs sit around 2-4:1 on white, so nearly every semantic slot,
 * every hero pairing and the Tailwind-default borders miss their level. The "Colors in My
 * preferences" decision (docs/features/bug-fix-admin-ux.md) is what resolves it: the presets
 * are generated against these thresholds, and the default theme's own rungs are tuned or the
 * misses are accepted per token.
 */
const KNOWN_FINDINGS = new Map<string, number>([
    ['light|TEXT.muted|BG.panelNested', 4.06],
    ['light|TEXT.dimmed|BG.panelNested', 4.06],
    ['light|TEXT.timestamp|BG.panelNested', 4.06],
    ['light|TEXT.menuBody|BG.panelNested', 4.47],
    ['light|TYPOGRAPHY.bodyTextPlaceholder|BG.panelNested', 4.06],
    ['light|COMPONENTS.powerMode.iconClass|page', 4.3],
    ['light|COMPONENTS.powerMode.iconClass|BG.panel', 4.05],
    ['light|COMPONENTS.powerMode.iconClass|BG.panelNested', 3.61],
    ['light|COMPONENTS.powerMode.iconClass|BG.inset', 4.11],
    ['light|COMPONENTS.guestRow.iconClass|BG.panelNested', 4.05],
    ['light|COMPONENTS.economyTable.level1.icon|page', 4.26],
    ['light|COMPONENTS.economyTable.level1.icon|BG.panel', 4.01],
    ['light|COMPONENTS.economyTable.level1.icon|BG.panelNested', 3.58],
    ['light|COMPONENTS.economyTable.level1.icon|BG.inset', 4.07],
    ['light|COMPONENTS.economyTable.level2.icon|page', 3.49],
    ['light|COMPONENTS.economyTable.level2.icon|BG.panel', 3.29],
    ['light|COMPONENTS.economyTable.level2.icon|BG.panelNested', 2.93],
    ['light|COMPONENTS.economyTable.level2.icon|BG.inset', 3.34],
    ['light|COMPONENTS.economyTable.level3.icon|BG.panelNested', 4.47],
    ['light|BACKGROUNDS.landing.ticker|self', 3.55],
    ['light|BACKGROUNDS.hero.mocha|self', 3.55],
    ['light|CHEF_CALENDAR.day.next|self', 2.24],
    ['light|DINNER_CALENDAR.day.next|self', 2.08],
    ['light|TYPOGRAPHY.footerText|BACKGROUNDS.appShell', 3.85],
    ['light|TYPOGRAPHY.sectionSubheadingLight|BACKGROUNDS.hero.mocha', 3.55],
    ['light|BORDER.gray.200|border|page', 1.24],
    ['light|BORDER.gray.200|border|BG.panel', 1.17],
    ['light|BORDER.gray.300|border|page', 1.47],
    ['light|BORDER.gray.300|border|BG.panel', 1.39],
    ['light|BORDER.peach.400|border|page', 2.08],
    ['light|BORDER.peach.400|border|BG.panel', 1.96],
    ['light|BORDER.ocean.400|border|page', 2.24],
    ['light|BORDER.ocean.400|border|BG.panel', 2.11],
    ['light|BORDER.orange.500|border|BG.panel', 2.96],
    ['light|RING.green.500|ring|page', 2.22],
    ['light|RING.green.500|ring|BG.panel', 2.09],
    ['light|RING.orange.200|ring|page', 1.45],
    ['light|RING.orange.200|ring|BG.panel', 1.37],
    ['light|COMPONENTS.segmentedActive|ring|page', 1.45],
    ['light|COMPONENTS.segmentedActive|ring|BG.panel', 1.37],
    ['light|CALENDAR.holiday|ring|page', 2.22],
    ['light|CALENDAR.holiday|ring|BG.panel', 2.09],
    ['light|CALENDAR.picker.holiday|ring|page', 2.22],
    ['light|CALENDAR.picker.holiday|ring|BG.panel', 2.09],
    ['light|PLANNING_CALENDAR.day.potential|border|page', 1.74],
    ['light|PLANNING_CALENDAR.day.potential|border|BG.panel', 1.64],
    ['light|CHEF_CALENDAR.countdown.border|border|page', 2.24],
    ['light|CHEF_CALENDAR.countdown.border|border|BG.panel', 2.11],
    ['light|DINNER_CALENDAR.countdown.border|border|page', 2.08],
    ['light|DINNER_CALENDAR.countdown.border|border|BG.panel', 1.96],
    ['light|slot.primary|page', 3.85],
    ['light|slot.primary|soft', 3.45],
    ['light|slot.primary|solid', 3.85],
    ['light|slot.neutral|page', 3.86],
    ['light|slot.neutral|soft', 3.45],
    ['light|slot.neutral|solid', 3.86],
    ['light|slot.secondary|page', 2.52],
    ['light|slot.secondary|soft', 2.31],
    ['light|slot.secondary|solid', 2.52],
    ['light|slot.info|page', 3.57],
    ['light|slot.info|soft', 3.18],
    ['light|slot.info|solid', 3.57],
    ['light|slot.success|page', 2.22],
    ['light|slot.success|soft', 2.03],
    ['light|slot.success|solid', 2.22],
    ['light|slot.warning|page', 3.14],
    ['light|slot.warning|soft', 2.82],
    ['light|slot.warning|solid', 3.14],
    ['light|slot.error|page', 3.46],
    ['light|slot.error|soft', 3.11],
    ['light|slot.error|solid', 3.46],
    ['light|slot.winery|page', 3.73],
    ['light|slot.winery|soft', 3.32],
    ['light|slot.winery|solid', 3.73],
    ['light|slot.party|page', 3.67],
    ['light|slot.party|soft', 3.24],
    ['light|slot.party|solid', 3.67],
    ['light|slot.peach|page', 2.73],
    ['light|slot.peach|soft', 2.47],
    ['light|slot.peach|solid', 2.73],
    ['light|slot.caramel|page', 4.06],
    ['light|slot.caramel|soft', 3.61],
    ['light|slot.caramel|solid', 4.06],
    ['light|slot.ocean|page', 2.92],
    ['light|slot.ocean|soft', 2.64],
    ['light|slot.ocean|solid', 2.92],
    ['light|slot.yellow|page', 1.92],
    ['light|slot.yellow|soft', 1.8],
    ['light|slot.yellow|solid', 1.92],
    ['dark|TEXT.toned|page', 3.96],
    ['dark|TEXT.toned|BG.panelNested', 3.38],
    ['dark|TEXT.muted|page', 3.96],
    ['dark|TEXT.muted|BG.panelNested', 3.38],
    ['dark|TEXT.dimmed|page', 3.96],
    ['dark|TEXT.dimmed|BG.panelNested', 3.38],
    ['dark|TEXT.timestamp|page', 2.13],
    ['dark|TEXT.timestamp|BG.panelNested', 1.82],
    ['dark|TEXT.timestamp|BG.inset', 3.03],
    ['dark|TEXT.timestamp|BG.ticket', 2.56],
    ['dark|TEXT.timestamp|BG.invoiceGround', 3.03],
    ['dark|TEXT.menuBody|page', 3.64],
    ['dark|TEXT.menuBody|BG.panelNested', 3.1],
    ['dark|TEXT.menuBody|BG.ticket', 4.37],
    ['dark|TYPOGRAPHY.bodyTextMuted|page', 3.96],
    ['dark|TYPOGRAPHY.bodyTextMuted|BG.panelNested', 3.38],
    ['dark|TYPOGRAPHY.bodyTextPlaceholder|page', 2.13],
    ['dark|TYPOGRAPHY.bodyTextPlaceholder|BG.panelNested', 1.82],
    ['dark|TYPOGRAPHY.bodyTextPlaceholder|BG.inset', 3.03],
    ['dark|TYPOGRAPHY.bodyTextPlaceholder|BG.ticket', 2.56],
    ['dark|TYPOGRAPHY.bodyTextPlaceholder|BG.invoiceGround', 3.03],
    ['dark|COMPONENTS.powerMode.iconClass|page', 3.8],
    ['dark|COMPONENTS.powerMode.iconClass|BG.panelNested', 3.24],
    ['dark|COMPONENTS.guestRow.iconClass|page', 2.14],
    ['dark|COMPONENTS.guestRow.iconClass|BG.panelNested', 1.82],
    ['dark|COMPONENTS.guestRow.iconClass|BG.inset', 3.04],
    ['dark|COMPONENTS.guestRow.iconClass|BG.ticket', 2.57],
    ['dark|COMPONENTS.guestRow.iconClass|BG.invoiceGround', 3.04],
    ['dark|COMPONENTS.economyTable.level1.icon|BG.panelNested', 3.93],
    ['dark|COMPONENTS.economyTable.level2.icon|BG.panelNested', 4.23],
    ['dark|COMPONENTS.economyTable.level3.icon|page', 3.64],
    ['dark|COMPONENTS.economyTable.level3.icon|BG.panelNested', 3.1],
    ['dark|COMPONENTS.economyTable.level3.icon|BG.ticket', 4.37],
    ['dark|COMPONENTS.dangerZone.heading|page', 4.44],
    ['dark|COMPONENTS.dangerZone.heading|BG.panelNested', 3.79],
    ['dark|BACKGROUNDS.landing.ticker|self', 3.55],
    ['dark|BACKGROUNDS.hero.mocha|self', 3.55],
    ['dark|TYPOGRAPHY.sectionSubheadingLight|BACKGROUNDS.hero.mocha', 3.01],
    ['dark|BORDER.gray.500|border|page', 2.13],
    ['dark|BORDER.gray.600|border|page', 1.36],
    ['dark|BORDER.gray.700|border|page', 1],
    ['dark|BORDER.gray.800|border|page', 1.36],
    ['dark|BORDER.ocean.600|border|page', 2.42],
    ['dark|BORDER.ocean.700|border|page', 1.74],
    ['dark|BORDER.pink.600|border|page', 2.72],
    ['dark|BORDER.orange.600|border|page', 2.4],
    ['dark|BORDER.red.500|border|page', 2.98],
    ['dark|BORDER.amber.600|border|page', 1.91],
    ['dark|RING.red.500|ring|page', 2.98],
    ['dark|RING.red.700|ring|page', 1.47],
    ['dark|CALENDAR.deadline.critical|ring|page', 2.98],
    ['dark|CHEF_CALENDAR.selection|outline|page', 1.74],
    ['dark|DINNER_CALENDAR.selection|outline|page', 2.02],
    ['dark|slot.primary|page', 3.27],
    ['dark|slot.primary|soft', 2.91],
    ['dark|slot.primary|solid', 3.27],
    ['dark|slot.neutral|page', 3.64],
    ['dark|slot.neutral|soft', 3.17],
    ['dark|slot.neutral|solid', 3.64],
    ['dark|slot.secondary|page', 4.12],
    ['dark|slot.secondary|soft', 3.63],
    ['dark|slot.secondary|solid', 4.12],
    ['dark|slot.info|page', 3.95],
    ['dark|slot.info|soft', 3.48],
    ['dark|slot.info|solid', 3.95],
    ['dark|slot.warning|page', 3.8],
    ['dark|slot.warning|soft', 3.39],
    ['dark|slot.warning|solid', 3.8],
    ['dark|slot.error|page', 4.44],
    ['dark|slot.error|soft', 3.81],
    ['dark|slot.error|solid', 4.44],
    ['dark|slot.winery|page', 3.97],
    ['dark|slot.winery|soft', 3.49],
    ['dark|slot.winery|solid', 3.97],
    ['dark|slot.party|page', 3.89],
    ['dark|slot.party|soft', 3.45],
    ['dark|slot.party|solid', 3.89],
    ['dark|slot.peach|soft', 4.24],
    ['dark|slot.caramel|page', 3.34],
    ['dark|slot.caramel|soft', 2.98],
    ['dark|slot.caramel|solid', 3.34],
    ['dark|slot.ocean|soft', 3.89],
])

// ---------------------------------------------------------------------------
// The palettes: the default theme plus the presets the appearance preference offers
// ---------------------------------------------------------------------------

/**
 * The palettes and their levels come from `PALETTES_UNDER_TEST`, which derives them from the
 * registry the appearance card badges - so the level a member is promised is the level asserted
 * here, and flipping the registry moves the assertion with it. A preset's stylesheet is generated
 * by `scripts/palettes/generate.ts`; a registry entry with no file is a badge nobody measured, so
 * its case fails rather than skips.
 */
const PALETTES = PALETTES_UNDER_TEST

/**
 * Pairs a preset cannot answer, keyed `<preset>|<pair>`, with the ratio it reaches. Same
 * contract as KNOWN_FINDINGS: `it.fails`, so a regeneration that fixes one breaks the build.
 *
 * Empty since 2026-09-17, and still empty with Farveblind added on 2026-09-18: both presets meet
 * AA on all 418 pairs, in light and dark. The nine tokens
 * that used to hold it back drew one rung as a fill and as ink at once; each now carries its own
 * `dark:` face (`*_CALENDAR.day.next`, `PLANNING_CALENDAR.day.potential`, `BORDER.amber[500]`,
 * `RING.amber[500]`, `BORDER.gray[800]`, `TEXT.dimmed`, `COMPONENTS.powerMode.iconClass`), and the
 * two countdown accents moved to the 200 rung, which only they draw.
 */
const PRESET_FINDINGS = new Map<string, number>([])

describe('EN 301 549 / WCAG 2.1: the design system meets its contrast level', () => {
    it('the OKLCH conversion agrees with the sRGB hex Tailwind 4 publishes', () => {
        // Tailwind ships its default palette in oklch(); these are its documented hex values,
        // so a drift in the OKLab matrix or the gamma curve shows up here before anywhere else
        expect({
            green500: oklchToHex('oklch(72.3% 0.219 149.579)'),
            gray500: oklchToHex('oklch(55.1% 0.027 264.364)'),
            red500: oklchToHex('oklch(63.7% 0.237 25.331)'),
            gray50: oklchToHex('oklch(98.5% 0.002 247.839)')
        }).toEqual({green500: '#00c950', gray500: '#6a7282', red500: '#fb2c36', gray50: '#f9fafb'})
    })

    it('the OKLCH inverse returns the lightness, chroma and hue the forward conversion took', () => {
        // The generator moves a published hex along L with its hue and chroma held, so the
        // round trip is the guarantee that "darker Mocha Mousse" is still Mocha Mousse
        const mocha = rgbToOklch(hexToRgb('#a47864'))
        expect({
            lightness: Math.round(mocha.lightness * 1000) / 1000,
            chroma: Math.round(mocha.chroma * 1000) / 1000,
            hue: Math.round(mocha.hue * 10) / 10
        }).toEqual({lightness: 0.611, chroma: 0.063, hue: 45.5})
        // The generator reads a hex, moves L and writes a hex, so the round trip has to land
        // on the byte it started from for every family the palette publishes
        expect(['#a47864', '#fa7b95', '#3c8c9e', '#6a7282'].map(hex => withLightness(hex, rgbToOklch(hexToRgb(hex)).lightness)))
            .toEqual(['#a47864', '#fa7b95', '#3c8c9e', '#6a7282'])
    })

    it('the contrast ratio matches the WCAG 2.1 reference values', () => {
        const white = hexToRgb('#ffffff')
        expect(round(contrastRatio(hexToRgb('#000000'), white))).toBe(21)
        expect(round(contrastRatio(white, white))).toBe(1)
        // #767676 on white is the canonical "just passes AA" grey of the WCAG techniques
        expect(round(contrastRatio(hexToRgb('#767676'), white))).toBe(4.54)
        // 50% black over white composites to the mid grey, and measures as that grey
        expect(contrastRatio(composite({...hexToRgb('#000000'), alpha: 0.5}, white), white))
            .toBeCloseTo(contrastRatio(hexToRgb('#808080'), white), 1)
    })

    it('every palette shade the design system names resolves to a value', () => {
        const resolve = createResolver(NO_OVERRIDE.light)
        // `bg-<family>-<shade>` is the shape that can name a family no stylesheet declares -
        // `bg-mocha-500` would paint nothing, because `--color-mocha-500` is never emitted
        const isShade = (reference: string) => /^[a-z]+-\d{2,3}(\/\d+)?$/.test(reference)
        const unresolved = LEAVES.flatMap(leaf =>
            MODES.flatMap((mode: Mode) => {
                const references = referencesFor(leaf.classes, mode)
                return CHANNELS.flatMap(channel => (references[channel] ?? [])
                    .filter(reference => isShade(reference) && !resolve(reference, channel, mode))
                    .map(reference => `${leaf.path} (${mode}) - ${channel}-${reference}`))
            })
        )
        expect([...new Set(unresolved)].join('\n')).toBe('')
    })

    it('every listed finding still names a pair of the default inventory', () => {
        // A finding whose pair left the inventory - a token renamed, a scoping rule that put it
        // outside 1.4.3 or 1.4.11 - is a line nothing measures any more, and it goes
        const measured = new Set(buildPairs(NO_OVERRIDE, 'AA').map(pair => pair.key))
        const stale = [...KNOWN_FINDINGS.keys(), ...[...PRESET_FINDINGS.keys()].map(key => key.split('|').slice(1).join('|'))]
        expect(stale.filter(key => !measured.has(key)).join('\n')).toBe('')
    })

    it('the generator solves the presets the registry badges, at the level it badges them', () => {
        // Three copies of a level would let the badge promise AAA while the spec measures AA.
        // The registry is the source; this is what keeps the producer on it
        const solved = PRESETS.map(({name, level}) => `${name} ${level}`).sort()
        const badged = PALETTES.filter(palette => palette.promised)
            .map(palette => `${palette.id} ${palette.promised}`).sort()
        expect(solved).toEqual(badged)
    })

    describe.each(PALETTES)('$label', palette => {
        const {id, file, level, promised} = palette
        const published = file !== null && existsSync(repoPath(file))
        const override = published ? parsePaletteOverrides(repoFile(file!)) : null

        if (file !== null) {
            it('publishes the stylesheet its badge claims', () => {
                // A registry entry with no generated file badges a level nobody measured
                expect(published, `${file} is missing - run npx jiti scripts/palettes/generate.ts`).toBe(true)
            })

            it('is generated from the preset the generator holds today', () => {
                const preset = PRESETS.find(candidate => candidate.name === id)
                expect(preset, `no preset named ${id} in scripts/palettes/presets.ts`).toBeDefined()
                expect(published ? repoFile(file) : '',
                    `${file} is stale - run make palettes (npx jiti scripts/palettes/generate.ts) and commit the result`)
                    .toBe(renderPreset(preset!))
            })
        }

        // A preset with no stylesheet has already failed above; its pairs would measure the
        // published palette and say nothing about the preset, so they do not run
        const pairs = file !== null && !published ? [] : buildPairs(override ?? NO_OVERRIDE, level)
        const groups = [...new Set(pairs.map(pair => pair.group))]

        describe.each(groups)('%s', group => {
            const cases = pairs.filter(pair => pair.group === group)
            const finding = (pair: Pair) =>
                promised === null ? KNOWN_FINDINGS.get(pair.key) : PRESET_FINDINGS.get(`${id}|${pair.key}`)

            const green = cases.filter(pair => finding(pair) === undefined)
                .map(pair => ({pair, name: `${pair.mode}: ${pair.name} ≥ ${pair.threshold} (${level})`}))

            const findings = cases.filter(pair => finding(pair) !== undefined)
                .map(pair => ({
                    pair,
                    name: `${pair.mode}: ${pair.name} — ${finding(pair)} (finding 2026-09-17, awaiting the user's decision)`
                }))

            it.each(green)('$name', ({pair}) => {
                expect(meetsThreshold(pair), `${pair.name} measures ${round(pair.ratio)}:1`).toBe(true)
            })

            it.fails.each(findings)('$name', ({pair}) => {
                expect(meetsThreshold(pair), `${pair.name} measures ${round(pair.ratio)}:1`).toBe(true)
            })
        })
    })
})
