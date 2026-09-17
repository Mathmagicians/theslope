/**
 * Palette preset generator - writes `app/assets/css/palettes/*.css`.
 *
 *     npx jiti scripts/palettes/generate.ts     # or: make palettes
 *
 * One run rewrites every preset in `scripts/palettes/presets.ts`, each into its own file, and
 * prints what the solve reached. The stylesheet text comes from `renderPreset` in
 * `scripts/palettes/render.ts`, which is pure - this file owns the disk and the console.
 *
 * Rerun after a change to the `@theme static` scales in `app/assets/css/main.css`, to `ui.colors`
 * in `app/app.config.ts`, or to a design-system token that adds a fill or an ink, and commit the
 * result: `designSystemContrast.unit.spec.ts` fails while a committed file is stale.
 */

import {mkdirSync, writeFileSync} from 'node:fs'
import {repoPath} from '../../tests/component/architecture/designSystemPairs'
import {PRESETS, paletteFile} from './presets'
import {solvePreset} from './render'

mkdirSync(repoPath('app/assets/css/palettes'), {recursive: true})

for (const preset of PRESETS) {
    const {css, report, warnings} = solvePreset(preset)
    writeFileSync(repoPath(paletteFile(preset.name)), css, 'utf8')
    report.forEach(line => console.info(line))
    warnings.forEach(line => console.warn(line))
}
