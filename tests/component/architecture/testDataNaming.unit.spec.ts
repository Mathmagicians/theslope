import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import testHelpers from '~~/tests/e2e/testHelpers'
import {HouseholdFactory} from '~~/tests/e2e/testDataFactories/householdFactory'
import {UserFactory} from '~~/tests/e2e/testDataFactories/userFactory'
import {AllergyFactory} from '~~/tests/e2e/testDataFactories/allergyFactory'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'

/**
 * Architecture test - e2e test data naming (docs/testing.md Rule 3)
 *
 * The d1-nuke-* targets of the Makefile remove the rows an e2e run leaves behind by SQL LIKE patterns on an entity's
 * columns. Every factory default matches a pattern of its entity, so `make d1-nuke-all` removes what a failed cleanup leaves.
 */

const MAKEFILE = readFileSync(fileURLToPath(new URL('../../../Makefile', import.meta.url)), 'utf8')

/** The recipe lines of every d1-nuke-* target */
const NUKE_SQL = [...MAKEFILE.matchAll(/^d1-nuke-[\w-]+:.*$((?:\n\t.*)*)/gm)].map(([, recipe]) => recipe).join('\n')

type NukePattern = {column: string, like: string}

/** The `<column> LIKE '<pattern>'` conditions of the WHERE clauses that select the entity's rows */
const nukePatterns = (entity: string): NukePattern[] => {
    const clauses = [...NUKE_SQL.matchAll(new RegExp(String.raw`FROM ${entity} WHERE (\w+ LIKE '[^']*'(?: OR \w+ LIKE '[^']*')*)`, 'g'))]
    const conditions = clauses.flatMap(([, clause]) => [...clause!.matchAll(/(\w+) LIKE '([^']*)'/g)].map(([, column, like]) => `${column}\t${like}`))
    return [...new Set(conditions)].map(condition => {
        const [column, like] = condition.split('\t') as [string, string]
        return {column, like}
    })
}

/** SQLite LIKE as a RegExp: `%` any run, `_` one character, the whole value, ASCII case-insensitive */
const likeToRegExp = (like: string): RegExp => {
    const source = like.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('%', '.*').replaceAll('_', '.')
    return new RegExp(`^${source}$`, 'i')
}

/** The row when none of its entity's patterns selects it */
const unmatched = (entity: string, row: Record<string, string>): string[] => {
    const patterns = nukePatterns(entity)
    const selected = patterns.some(({column, like}) => column in row && likeToRegExp(like).test(row[column]!))
    return selected ? [] : [`${entity} ${JSON.stringify(row)} matches none of ${patterns.map(({column, like}) => `${column} LIKE '${like}'`).join(' OR ')}`]
}

const testSalt = testHelpers.temporaryAndRandom()
const household = HouseholdFactory.defaultHouseholdData(testSalt)

/** Each factory default as the row it writes, with the columns a nuke pattern reads */
const FACTORY_DEFAULTS: {factory: string, entity: string, row: Record<string, string>}[] = [
    {factory: 'HouseholdFactory.defaultHouseholdData', entity: 'Household', row: {name: household.name, address: household.address}},
    {factory: 'HouseholdFactory.defaultInhabitantData', entity: 'Inhabitant', row: {name: HouseholdFactory.defaultInhabitantData(testSalt).name}},
    {factory: 'HouseholdFactory.createInhabitantForHousehold', entity: 'Inhabitant', row: {name: HouseholdFactory.defaultInhabitantName()}},
    {factory: 'UserFactory.defaultUser', entity: 'User', row: {email: UserFactory.defaultUser(testSalt).email}},
    {factory: 'AllergyFactory.defaultAllergyTypeData', entity: 'AllergyType', row: {name: AllergyFactory.defaultAllergyTypeData(testSalt).name}},
    {factory: 'SeasonFactory.defaultSeason', entity: 'Season', row: {shortName: SeasonFactory.defaultSeason(testSalt).shortName}},
    {factory: 'SeasonFactory.E2E_SINGLETON_NAME', entity: 'Season', row: {shortName: SeasonFactory.E2E_SINGLETON_NAME}}
]

describe('E2E test data follows the d1-nuke patterns of the Makefile', () => {
    it('reads a LIKE pattern for every entity the factories create', () => {
        const entities = [...new Set(FACTORY_DEFAULTS.map(({entity}) => entity))]
        expect(entities.filter(entity => nukePatterns(entity).length === 0)).toEqual([])
    })

    it.each(FACTORY_DEFAULTS)('$factory matches a $entity nuke pattern', ({entity, row}) => {
        expect(unmatched(entity, row)).toEqual([])
    })
})
