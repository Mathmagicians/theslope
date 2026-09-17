/**
 * Dichromatic vision simulation and perceptual distance.
 *
 * WCAG 2.1 §1.4.1 "Use of Color" asks that colour is never the only way a meaning is conveyed;
 * a palette that means to serve members with a colour vision deficiency has to go further and
 * keep its meanings apart *as those members see them*. That is what this module measures.
 *
 * The three matrices are Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model
 * for Simulation of Color Vision Deficiency", IEEE Transactions on Visualization and Computer
 * Graphics 15(6):1291-1298, table at severity 1.0 - full protanopia, deuteranopia and
 * tritanopia. They are defined on **linear** RGB, so a colour is gamma-decoded, multiplied and
 * gamma-encoded again; applying them to 8-bit sRGB values (a common shortcut) reports
 * differences the eye does not see.
 *
 * The distance is ΔE in Oklab - the Euclidean distance between the two colours' (L, a, b),
 * with a and b read off the OKLCH the contrast module already computes. Oklab is uniform enough
 * that one number answers for lightness, chroma and hue together, and it needs no second colour
 * implementation: CIEDE2000 would add one for a ranking this test never uses.
 */

import {rgbToOklch, type Rgb} from './contrast'

export type VisionType = 'protanopia' | 'deuteranopia' | 'tritanopia'

/** Machado et al. 2009, severity 1.0. Row-major, applied to linear sRGB */
const MATRICES: Record<VisionType, readonly [number, number, number][]> = {
    protanopia: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998]
    ],
    deuteranopia: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.011820, 0.042940, 0.968881]
    ],
    tritanopia: [
        [1.255528, -0.076749, -0.178779],
        [-0.078411, 0.930809, 0.147602],
        [0.004733, 0.691367, 0.303900]
    ]
}

export const VISION_TYPES = Object.keys(MATRICES) as VisionType[]

/** sRGB 0-255 → linear 0-1, the sRGB transfer function WCAG 2.1 also uses for luminance */
const decode = (channel: number): number => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const encode = (linear: number): number => {
    const clamped = Math.min(1, Math.max(0, linear))
    const value = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
    return Math.round(value * 255)
}

/** The colour as a dichromat of this type sees it, back in sRGB */
export const simulate = (vision: VisionType, {r, g, b}: Rgb): Rgb => {
    const linear = [decode(r), decode(g), decode(b)] as const
    const [red, green, blue] = MATRICES[vision].map(row =>
        encode(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2])) as [number, number, number]
    return {r: red, g: green, b: blue}
}

/** Oklab (L, a, b) of an opaque sRGB colour */
const oklab = (colour: Rgb): [number, number, number] => {
    const {lightness, chroma, hue} = rgbToOklch(colour)
    const radians = (hue * Math.PI) / 180
    return [lightness, chroma * Math.cos(radians), chroma * Math.sin(radians)]
}

/** ΔE in Oklab: 0 is the same colour, ~0.02 is the just-noticeable difference */
export const deltaEOk = (a: Rgb, b: Rgb): number => {
    const [first, second] = [oklab(a), oklab(b)]
    return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2])
}

/** How far apart two colours stay for a dichromat of this type */
export const separationUnder = (vision: VisionType, a: Rgb, b: Rgb): number =>
    deltaEOk(simulate(vision, a), simulate(vision, b))

/**
 * The Color Universal Design set (Okabe & Ito 2008, "Color Universal Design - How to make figures
 * and presentations that are friendly to colorblind people"), the anchors a colour-safe palette
 * maps its meanings onto. The palette promises what the set itself keeps, so the spec reads its
 * bar off these values rather than naming one.
 */
export const CUD_ANCHORS = {
    orange: '#E69F00',
    skyBlue: '#56B4E9',
    bluishGreen: '#009E73',
    yellow: '#F0E442',
    blue: '#0072B2',
    vermillion: '#D55E00',
    reddishPurple: '#CC79A7'
} as const
