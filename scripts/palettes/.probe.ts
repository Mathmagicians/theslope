import {buildPairs, repoFile, round, type Pair} from '../../tests/component/architecture/designSystemPairs'
import {parsePaletteOverrides, hexToRgb, rgbToOklch, withLightness} from '../../tests/component/architecture/contrast'

const override = parsePaletteOverrides(repoFile('app/assets/css/palettes/high-contrast.css'))
const base = buildPairs(override, 'AAA')
const basePass = base.filter(p => round(p.ratio) >= p.threshold).length
const failingKeys = base.filter(p => round(p.ratio) < p.threshold).map(p => p.key)
console.log(`base ${basePass}/${base.length}`)

const TARGETS: {family: string, step: string, mode: 'light' | 'dark', keys: string[]}[] = [
    {family: 'orange', step: '500', mode: 'light', keys: ['light|BORDER.orange.500|border|page', 'light|BORDER.orange.500|border|BG.panel']},
    {family: 'orange', step: '400', mode: 'dark', keys: ['dark|COMPONENTS.powerMode.iconClass|BG.panelNested']},
    {family: 'violet', step: '600', mode: 'dark', keys: ['dark|COMPONENTS.guestRow.iconClass|page', 'dark|COMPONENTS.guestRow.iconClass|BG.panelNested']},
    {family: 'peach', step: '400', mode: 'dark', keys: ['dark|COMPONENTS.economyTable.level2.icon|BG.panelNested']}
]

const clone = () => JSON.parse(JSON.stringify(override))

for (const {family, step, mode, keys} of TARGETS) {
    const current = override[mode].scales[family]![step]!
    const L0 = rgbToOklch(hexToRgb(current)).lightness
    const rows: string[] = []
    let best = {L: L0, pass: basePass, hex: current, targets: 0}
    for (let L = 0.02; L <= 0.995; L += 0.01) {
        const probe = clone()
        probe[mode].scales[family][step] = withLightness(current, L)
        const pairs = buildPairs(probe, 'AAA')
        const pass = pairs.filter(p => round(p.ratio) >= p.threshold).length
        const hit = keys.filter(k => {const p = pairs.find(q => q.key === k)!; return round(p.ratio) >= p.threshold}).length
        const broke = pairs.filter(p => round(p.ratio) < p.threshold && !failingKeys.includes(p.key)).map(p => p.key)
        if (hit === keys.length && (pass > best.pass || (pass === best.pass && best.targets < keys.length))) best = {L, pass, hex: withLightness(current, L), targets: hit}
        if (hit === keys.length) rows.push(`   L=${L.toFixed(2)} ${withLightness(current, L)} pass=${pass} broke=[${broke.join(', ')}]`)
    }
    console.log(`${family}-${step} ${mode} published ${current} (L=${L0.toFixed(3)}), base pass ${basePass}`)
    console.log(rows.slice(0, 4).join('\n') || '   never clears')
    console.log(`   best: L=${best.L.toFixed(2)} ${best.hex} pass=${best.pass}`)
}
