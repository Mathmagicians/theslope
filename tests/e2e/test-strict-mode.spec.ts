import { test, expect } from '@playwright/test'

test('verify strict mode is active', async ({ page }) => {
  await page.setContent(`
    <html>
      <body>
        <div>TestText</div>
        <div>TestText</div>
      </body>
    </html>
  `)

  // This should throw a strict mode violation since we have 2 elements
  await expect(async () => {
    await page.locator('text=TestText').click()
  }).rejects.toThrow(/strict mode violation/)
})