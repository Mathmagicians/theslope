/**
 * Colour maths and palette resolution for the design-system contrast check.
 *
 * EN 301 549 (the European accessibility standard TheSlope answers to) adopts WCAG 2.1.
 * The contrast ratio here is WCAG 2.1's own definition (§1.4.3 "Contrast (Minimum)"):
 *
 *     ratio = (L1 + 0.05) / (L2 + 0.05)
 *
 * with L the relative luminance of §"relative luminance": sRGB channels linearised with
 * the 0.03928 / 12.92 piecewise curve, weighted 0.2126 R + 0.7152 G + 0.0722 B.
 *
 * Nothing here is Tailwind-specific maths: `oklchToRgb` implements the CSS Color 4
 * OKLab → linear sRGB matrix because Tailwind 4 ships its default palette in `oklch()`
 * and we refuse to add a colour dependency for four numbers.
 *
 * Exported for reuse by the palette generator that emits `app/assets/css/palettes/*.css`.
 */

export type Rgb = {r: number, g: number, b: number}

/** A colour with the alpha the utility asked for (`bg-primary/10` → alpha 0.1) */
export type Rgba = Rgb & {alpha: number}

// ---------------------------------------------------------------------------
// sRGB
// ---------------------------------------------------------------------------

/** `#abc`, `#aabbcc`, `#aabbccdd` → channels 0-255 (alpha folded into `alpha`) */
export const hexToRgb = (hex: string): Rgba => {
    const raw = hex.trim().replace(/^#/, '')
    const expand = raw.length <= 4 ? raw.split('').map(char => char + char).join('') : raw
    const channel = (index: number) => parseInt(expand.slice(index * 2, index * 2 + 2), 16)
    const alpha = expand.length === 8 ? channel(3) / 255 : 1
    return {r: channel(0), g: channel(1), b: channel(2), alpha}
}

export const rgbToHex = ({r, g, b}: Rgb): string =>
    `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`

/** sRGB gamma decode - WCAG 2.1 relative luminance, step 1 */
const linearise = (channel8Bit: number): number => {
    const channel = channel8Bit / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.1 relative luminance of an opaque sRGB colour */
export const relativeLuminance = ({r, g, b}: Rgb): number =>
    0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b)

/** WCAG 2.1 contrast ratio, 1 → 21. Order of the arguments does not matter */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
    const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number]
    return (lighter + 0.05) / (darker + 0.05)
}

/** Simple alpha compositing of `top` over the opaque `bottom` (what the eye measures) */
export const composite = (top: Rgba, bottom: Rgb): Rgb => ({
    r: top.r * top.alpha + bottom.r * (1 - top.alpha),
    g: top.g * top.alpha + bottom.g * (1 - top.alpha),
    b: top.b * top.alpha + bottom.b * (1 - top.alpha)
})

// ---------------------------------------------------------------------------
// OKLCH (Tailwind 4 ships its default palette in oklch())
// ---------------------------------------------------------------------------

const gammaEncode = (linear: number): number => {
    const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055
    return Math.min(255, Math.max(0, Math.round(encoded * 255)))
}

/** CSS Color 4 OKLab → linear sRGB, unclamped: a channel outside 0-1 is outside the gamut */
export const oklchToLinear = (lightness: number, chroma: number, hue: number): [number, number, number] => {
    const hueRad = (hue * Math.PI) / 180
    const a = chroma * Math.cos(hueRad)
    const b = chroma * Math.sin(hueRad)

    // OKLab → LMS'
    const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b
    const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b
    const sPrime = lightness - 0.0894841775 * a - 1.2914855480 * b

    // LMS' → LMS
    const l = lPrime ** 3
    const m = mPrime ** 3
    const s = sPrime ** 3

    // LMS → linear sRGB
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ]
}

/**
 * CSS Color 4 OKLCH → sRGB. `lightness` 0-1, `chroma` absolute, `hue` degrees.
 * Out-of-gamut colours clamp per channel, which is what a browser shows anyway.
 */
export const oklchToRgb = (lightness: number, chroma: number, hue: number): Rgb => {
    const [r, g, b] = oklchToLinear(lightness, chroma, hue)
    return {r: gammaEncode(r), g: gammaEncode(g), b: gammaEncode(b)}
}

/** Iterations of the chroma bisection - fixed, so two runs of the generator agree to the byte */
const GAMUT_BISECTIONS = 32

/**
 * The largest chroma up to `chroma` that sRGB can still show at this lightness and hue.
 * Per-channel clamping keeps a colour inside the cube by bending its hue; a palette built on a
 * named anchor cannot afford that, so the rung gives up chroma instead and keeps the hue.
 */
export const clampChromaToGamut = (lightness: number, chroma: number, hue: number): number => {
    const inside = (value: number) => oklchToLinear(lightness, value, hue).every(channel => channel >= 0 && channel <= 1)
    if (inside(chroma)) return chroma
    let [low, high] = [0, chroma]
    for (let step = 0; step < GAMUT_BISECTIONS; step++) {
        const middle = (low + high) / 2
        if (inside(middle)) low = middle
        else high = middle
    }
    return low
}

/** `oklch(72.3% 0.219 149.579)` → `#00c950`. Returns null for anything else */
export const oklchToHex = (value: string): string | null => {
    const match = value.trim().match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/)
    if (!match) return null
    const [, lightness, percent, chroma, hue] = match
    const l = Number(lightness) / (percent === '%' ? 100 : 1)
    return rgbToHex(oklchToRgb(l, Number(chroma), Number(hue)))
}

/** `#abc`, `#aabbcc` or `oklch(...)` → `#rrggbb`. Returns null for anything else */
export const cssColourToHex = (value: string): string | null => {
    const trimmed = value.trim()
    if (trimmed.startsWith('#')) return rgbToHex(hexToRgb(trimmed))
    return oklchToHex(trimmed)
}

// ---------------------------------------------------------------------------
// CSS parsing - palettes are read from the stylesheets, never restated here
// ---------------------------------------------------------------------------

/** family → shade → `#rrggbb`, e.g. `scales.amber[500] === '#a47864'` */
export type ColourScales = Record<string, Record<string, string>>

/**
 * Every `--color-<family>-<shade>: <colour>` in a stylesheet, resolved to hex.
 *
 * `--ui-color-<slot>-<shade>` counts as a family too: Nuxt UI's colours plugin publishes it as
 * `var(--color-<family>-<shade>)` for the family `app.config.ts` maps the slot to, and Tailwind's
 * `--color-<slot>-<shade>` reads it back, so a preset that redeclares it moves the slot's whole
 * scale without moving the brand family behind it.
 */
export const parseColourScales = (css: string): ColourScales => {
    const scales: ColourScales = {}
    for (const [, family, shade, value] of css.matchAll(/--(?:ui-)?color-([a-z]+)-(\d{2,3})\s*:\s*([^;]+);/g)) {
        const hex = cssColourToHex(value!)
        if (!hex) continue
        scales[family!] ??= {}
        scales[family!]![shade!] = hex
    }
    return scales
}

/**
 * The rung a bare `bg-<slot>` or `text-<slot>` paints. Nuxt UI's colours plugin writes
 * `--ui-<slot>: var(--ui-color-<slot>-500)` for the light block and the 400 rung for `.dark`;
 * a preset may re-point a slot at another rung, which is what this reads back.
 */
export type SlotRungs = Record<string, string>

/** Every `--ui-<slot>: var(--ui-color-<family>-<step>)` in a stylesheet → slot → step */
export const parseSlotRungs = (css: string): SlotRungs => Object.fromEntries(
    [...css.matchAll(/--ui-([a-z]+)\s*:\s*var\(--ui-color-[a-z]+-(\d{2,3})\)/g)]
        .map(([, slot, step]) => [slot!, step!])
)

/** One mode of a palette: the steps it redeclares and the slots it re-points */
export type ModeOverride = {scales: ColourScales, slots: SlotRungs}

/** The `--ui-*` semantic tokens of one Nuxt UI mode block, values left unresolved */
export type SemanticTokens = Record<string, string>

/** Every `--ui-<name>: <value>` inside the CSS block that `selector` opens */
export const parseSemanticBlock = (css: string, selector: string): SemanticTokens => {
    const start = css.indexOf(selector)
    if (start === -1) return {}
    const open = css.indexOf('{', start)
    const end = css.indexOf('}', open)
    const block = css.slice(open + 1, end)
    return Object.fromEntries(
        [...block.matchAll(/--ui-([a-z-]+)\s*:\s*([^;]+)/g)].map(([, name, value]) => [name!, value!.trim()])
    )
}

/** Linear sRGB channel 0-1 → the OKLab cube root the matrix below expects */
const srgbDecode = (channel8Bit: number): number => {
    const channel = channel8Bit / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export type Oklch = {lightness: number, chroma: number, hue: number}

/**
 * sRGB → CSS Color 4 OKLCH, the inverse of `oklchToRgb`. `lightness` 0-1, `hue` degrees.
 * The palette generator needs it to move a published hex along L with its hue and chroma held.
 */
export const rgbToOklch = ({r, g, b}: Rgb): Oklch => {
    const [red, green, blue] = [srgbDecode(r), srgbDecode(g), srgbDecode(b)]

    // linear sRGB → LMS → LMS'
    const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue)
    const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue)
    const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue)

    // LMS' → OKLab
    const lightness = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s

    return {
        lightness,
        chroma: Math.hypot(a, bAxis),
        hue: ((Math.atan2(bAxis, a) * 180) / Math.PI + 360) % 360
    }
}

/** `#a47864` with L moved to `lightness`, hue and chroma untouched → `#rrggbb` */
export const withLightness = (hex: string, lightness: number): string => {
    const {chroma, hue} = rgbToOklch(hexToRgb(hex))
    return rgbToHex(oklchToRgb(lightness, chroma, hue))
}

/**
 * A palette preset declares its light steps under `html[data-palette="…"]` and its dark ones
 * under `html.dark[data-palette="…"]`. Both selectors match a dark page and the `.dark` one
 * has the higher specificity, so the dark scale is the light one with the dark block layered
 * on top - which is what the browser paints and therefore what the measurement reads.
 */
export const parsePaletteOverrides = (css: string): {light: ModeOverride, dark: ModeOverride} => {
    const layer = (target: ModeOverride, source: ModeOverride) => {
        for (const [family, steps] of Object.entries(source.scales)) Object.assign(target.scales[family] ??= {}, steps)
        Object.assign(target.slots, source.slots)
        return target
    }
    const empty = (): ModeOverride => ({scales: {}, slots: {}})
    const [light, dark] = [empty(), empty()]
    for (const [, selector, body] of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
        layer(/\.dark\b/.test(selector!) ? dark : light, {scales: parseColourScales(body!), slots: parseSlotRungs(body!)})
    }
    return {light, dark: layer(layer(empty(), light), dark)}
}
