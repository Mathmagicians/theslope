# Technology Stack
- Nuxt 3
- Nuxt UI + Tailwind CSS
- Pinia (state management)
- TypeScript
- D1 database
- Prisma ORM
- Cloudflare as cloud provider

# Code Style & Conventions
- Test-Driven Development (TDD) approach
- TypeScript with strict type safety
- Vue 3 Composition API
- Prefer arrow functions
- Prefer switch statements over long if-else chains
- Concise, readable code style
- Preserve existing comments in code
- State management through Pinia stores

# Testing Structure
## Unit Tests (*.unit.spec.ts)
- Location: tests/component/
- Purpose: Testing pure functions
- Framework: Vitest

## Component Tests (*.nuxt.spec.ts)
- Location: tests/component/
- Purpose: Testing with Nuxt context
- Framework: Nuxt Test Utils + Vitest

## E2E Tests (*.e2e.spec.ts)
- Location: tests/e2e/
- Framework: Playwright

# Important Notes
- Project is pre-configured with the tech stack
- No need to suggest installation steps
- Always maintain type safety
- Follow existing project patterns
- DONT REMOVE TEST CASES when refactoring
- DONT REMOVE COMMENTS when refactoring
