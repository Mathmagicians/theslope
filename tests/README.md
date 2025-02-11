# Here integration tests for the application are stored

They run against real environments, ie Heynabo demo space, test.skraaningen.dk
They use the e2e helper methods of nuxt test utils and playwright as framework

naming convention 

nuxt.spec.ts - unit tests
e2e.spec.ts - e2e integration tests

## Playwright - e2e tests
npx playwright test
Runs the end-to-end tests.

npx playwright test --ui
Starts the interactive UI mode.

npx playwright test --project=chromium
Runs the tests only on Desktop Chrome.

npx playwright test example
Runs the tests in a specific file.

npx playwright test --debug
Runs the tests in debug mode.

npx playwright codegen
Auto generate tests with Codegen.

We suggest that you begin by typing:

    npx playwright test

And check out the following files:
- ./tests/e2e/pages.e2e.spec.ts - Example end-to-end test
- ./tests-examples/demo-todo-app.spec.ts - Demo Todo App end-to-end tests
- ./playwright.config.ts - Playwright Test configuration
