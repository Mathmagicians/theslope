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

/**
 * CSS Color 4 OKLCH → sRGB. `lightness` 0-1, `chroma` absolute, `hue` degrees.
 * Out-of-gamut colours clamp per channel, which is what a browser shows anyway.
 */
export const oklchToRgb = (lightness: number, chroma: number, hue: number): Rgb => {
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
    return {
        r: gammaEncode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        g: gammaEncode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        b: gammaEncode(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
    }
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

/** Every `--color-<family>-<shade>: <colour>` in a stylesheet, resolved to hex */
export const parseColourScales = (css: string): ColourScales => {
    const scales: ColourScales = {}
    for (const [, family, shade, value] of css.matchAll(/--color-([a-z]+)-(\d{2,3})\s*:\s*([^;]+);/g)) {
        const hex = cssColourToHex(value!)
        if (!hex) continue
        scales[family!] ??= {}
        scales[family!]![shade!] = hex
    }
    return scales
}

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
export const parsePaletteOverrides = (css: string): {light: ColourScales, dark: ColourScales} => {
    const layer = (target: ColourScales, source: ColourScales) => {
        for (const [family, steps] of Object.entries(source)) Object.assign(target[family] ??= {}, steps)
        return target
    }
    const light: ColourScales = {}
    const dark: ColourScales = {}
    for (const [, selector, body] of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
        layer(/\.dark\b/.test(selector!) ? dark : light, parseColourScales(body!))
    }
    return {light, dark: layer(layer({}, light), dark)}
}
