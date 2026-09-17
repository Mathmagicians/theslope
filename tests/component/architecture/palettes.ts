/**
 * The palettes the architecture specs measure, derived from the registry the appearance card reads.
 *
 * `PALETTES` in `app/composables/useUserPreferenceValidation.ts` is the single source: the level it
 * carries is the badge "Mine indstillinger" shows, the level `designSystemContrast.unit.spec.ts`
 * asserts every pair at, and the level `scripts/palettes/presets.ts` solves for. A preset whose
 * entry claims a level has to publish a stylesheet and meet that level on every pair; a registry
 * entry with no level is the theme a member gets without choosing, measured at AA as the baseline
 * the dated findings are kept against.
 */

import {PALETTES, DEFAULT_APPEARANCE, type Palette} from '~/composables/useUserPreferenceValidation'
import {paletteFile} from '../../../scripts/palettes/presets'
import type {Level} from './designSystemPairs'

/**
 * What a failing case is read by. The Danish wording belongs to the card (ADR-017), so this is the
 * spec's own copy of the name - typed by `Palette`, so a new registry entry needs one here too.
 */
const LABEL: Record<Palette, string> = {
    default: 'Farveglad (the default theme)',
    tydelig: 'Tydelig',
    colorblind: 'Farveblind'
}

/** The level the contrast spec measures a palette at when its registry entry promises none */
const BASELINE_LEVEL: Level = 'AA'

export type PaletteUnderTest = {
    id: Palette
    label: string
    /** The level the registry badges, and the preset's promise; `null` for the default theme */
    promised: Level | null
    /** The level the pairs are asserted at */
    level: Level
    /** The stylesheet the preset publishes, `null` for the default theme */
    file: string | null
    colourSafe: boolean
}

export const PALETTES_UNDER_TEST: PaletteUnderTest[] = Object.entries(PALETTES)
    .map(([key, {level, colourSafe}]) => {
        const id = key as Palette
        return {
            id,
            label: LABEL[id],
            promised: level,
            level: level ?? BASELINE_LEVEL,
            file: level === null ? null : paletteFile(id),
            colourSafe
        }
    })

/** The theme a member gets without choosing - the baseline a preset is read against */
export const BASELINE = PALETTES_UNDER_TEST
    .find(palette => palette.id === DEFAULT_APPEARANCE.palette)!

/** The presets whose registry entry claims the meanings stay apart for a dichromat */
export const COLOUR_SAFE = PALETTES_UNDER_TEST.filter(palette => palette.colourSafe)
