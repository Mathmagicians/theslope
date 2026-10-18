import {expect} from '@playwright/test'
import {When, Then, fromScene} from '~~/tests/e2e/fixtures'
import {HealthReportSchema} from '~~/workers/common/health'

When('{string} reports its health at {string}', async ({scene}, worker: string, path: string) => {
    const response = await fromScene(scene, 'context').request.get(path)
    expect(response.status(), `${worker} ${path}`).toBe(200)
    scene.health = {worker, report: HealthReportSchema.parse(await response.json())}
})

Then('the worker runs the expected version', async ({scene}) => {
    const {worker, report} = fromScene(scene, 'health')
    // The CI/CD smoke job sets EXPECTED_VERSION to the deployment under test; a local run has none
    const expectedVersion = process.env.EXPECTED_VERSION
    if (expectedVersion) expect(report.version, `${worker} version`).toBe(expectedVersion)
})
