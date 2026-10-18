// Step reuse across the features: every step line of every scenario against the definition playwright-bdd's
// generator matches it with, the matching bddgen itself uses, so the figures need no test run.
// playwright-bdd's generator is internal API (dist/); package.json pins the minor version.
import {createRequire} from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
// The package exports its public API only; the generator modules load by file path
const dist = path.join(path.dirname(require.resolve('playwright-bdd/package.json')), 'dist')
const {loadConfig} = require(path.join(dist, 'playwright/loadConfig.js'))
const {getEnvConfigs} = require(path.join(dist, 'config/env.js'))
const {TestFilesGenerator} = require(path.join(dist, 'generate/index.js'))
const {stepDefinitions} = require(path.join(dist, 'steps/stepRegistry.js'))

const summaryOnly = process.argv.includes('--summary')
const relative = (uri) => path.relative(process.cwd(), uri)
const pattern = (definition) => typeof definition.pattern === 'string' ? definition.pattern : definition.pattern.source
const cell = (text) => text.replaceAll('|', '\\|')

await loadConfig()
const lines = []
for (const config of Object.values(getEnvConfigs())) {
  const generator = new TestFilesGenerator(config)
  await Promise.all([generator.loadFeatures(), generator.loadSteps()])
  generator.buildFiles()
  for (const file of generator.files) {
    for (const test of file.tests) {
      for (const step of test.stepsData.values()) {
        lines.push({
          text: step.pickleStep.text,
          keyword: step.gherkinStep.keyword.trim(),
          location: step.location,
          definition: step.matchedDefinition?.definition ?? null
        })
      }
    }
  }
}

// One entry per definition, whichever configs loaded it
const definitions = [...new Map(stepDefinitions.map((definition) => [`${definition.uri}:${definition.line}`, definition])).values()]
const uses = new Map()
for (const line of lines) {
  if (!line.definition) continue
  const key = `${line.definition.uri}:${line.definition.line}`
  const use = uses.get(key) ?? {count: 0, example: line.text}
  use.count += 1
  uses.set(key, use)
}
const rows = definitions
  .map((definition) => ({definition, ...(uses.get(`${definition.uri}:${definition.line}`) ?? {count: 0, example: ''})}))
  .sort((a, b) => b.count - a.count || a.definition.uri.localeCompare(b.definition.uri) || a.definition.line - b.definition.line)
const once = rows.filter((row) => row.count === 1)
const unused = rows.filter((row) => row.count === 0)
const undefinedLines = lines.filter((line) => !line.definition)
const matched = lines.length - undefinedLines.length
const perDefinition = definitions.length ? (matched / definitions.length).toFixed(1) : '0.0'

console.log(`Steps: ${lines.length} lines · ${definitions.length} definitions · ${perDefinition} uses per definition · ${once.length} used once · ${unused.length} unused · ${undefinedLines.length} undefined`)
if (summaryOnly) process.exit(0)

const describe = ({definition}) => `${definition.keyword} ${cell(pattern(definition))} \`${relative(definition.uri)}:${definition.line}\``
if (rows.length > 0) {
  console.log('\n| Uses | Definition | Example |\n|---:|---|---|')
  for (const row of rows.slice(0, 10)) console.log(`| ${row.count} | ${describe(row)} | ${cell(row.example)} |`)
}
const section = (title, items, render) => {
  if (items.length === 0) return
  console.log(`\n**${title}**\n`)
  for (const item of items) console.log(`- ${render(item)}`)
}
section('Used once', once, describe)
section('Unused', unused, describe)
section('Undefined', undefinedLines, (line) => `\`${relative(line.location)}\` ${line.keyword} ${line.text}`)
