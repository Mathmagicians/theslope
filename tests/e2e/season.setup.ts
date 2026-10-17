import {test as setup} from '@playwright/test'
import {SeasonFactory} from '~~/tests/e2e/testDataFactories/seasonFactory'
import testHelpers from '~~/tests/e2e/testHelpers'

const {validatedBrowserContext} = testHelpers

// The singleton active season, created and activated once before the spec workers start;
// the specs' own createActiveSeason calls find it active (global teardown deletes it after the run)
setup('Activate the singleton season', async ({browser}) => {
    await SeasonFactory.createActiveSeason(await validatedBrowserContext(browser))
})
