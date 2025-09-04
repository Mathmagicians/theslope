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
- No semicolons (;) at the end of statements
- Concise, readable code style
- Preserve existing comments in code
- State management through Pinia stores

## API Route Patterns
- Server routes use file-based routing under `server/routes/api/`
- **Always** validate input data:
  - Use H3's validation methods with Zod schemas when working with raw inputs:
    - `readValidatedBody` for validating request bodies
    - `getValidatedRouterParams` for validating route parameters
    - `getValidatedQuery` for validating query parameters
  - These methods are automatically imported by Nuxt
  - For serialized data (especially with nested Dates), use appropriate deserialization methods before validation
  - The same schemas should be used for both client-side and server-side validation
- Distinguish between validation errors (H3Error) and server errors
- Repository pattern with CRUD functions in `server/data/prismaRepository.ts`
- Always use `prisma.entity.upsert()` for saving data, with the appropriate unique identifier field in the `where` clause

# Testing Structure
## Unit Tests (*.unit.spec.ts)
- Location: tests/component/
- Purpose: Testing pure functions
- Framework: Vitest

## Component Tests (*.nuxt.spec.ts)
- Location: tests/component/
- Purpose: Testing with Nuxt context
- Framework: Nuxt Test Utils + Vitest

### Testing Vue 3 Components with defineModel
When testing components that use the `defineModel` API:
1. Use a reactive reference (`ref`) to track model changes
2. Provide event handlers via `attrs` not `props`:
   ```typescript
   const modelValue = ref(initialValue);
   const wrapper = await mountSuspended(Component, {
     props: { modelValue: modelValue.value },
     attrs: {
       'onUpdate:modelValue': (val) => { modelValue.value = val; }
     }
   });
   ```
3. After triggering events, wait for reactivity with `nextTick()`
4. Test the state directly with `expect(modelValue.value)`
5. Don't test for emitted events when using `defineModel`

## E2E Tests (*.e2e.spec.ts)
- Location: tests/e2e/
- Framework: Playwright

# Git & Collaboration Guidelines
## Branch Management
- **NEVER work directly on main branch**
- **ALWAYS create an appropriate feature branch** for each task
- **ALWAYS create a PR** for review before merging to main
- Branch naming: Use descriptive names like `fix-e2e-tests`, `migrate-nuxt-4`, `update-dependencies`

## Commit Messages
- Write clear, concise commit messages
- **DO NOT** add co-author information for AI assistants
- **DO NOT** include "Generated with Claude Code" or similar AI attribution
- Focus on describing the changes and their purpose

## Pull Requests
- **DO NOT** mention AI assistants as co-authors in PR descriptions
- Focus on technical changes and test results
- Include clear summary of what was updated and why

# Important Notes
- Project is pre-configured with the tech stack
- No need to suggest installation steps
- Always maintain type safety
- Follow existing project patterns
- DONT REMOVE TEST CASES when refactoring
- DONT REMOVE COMMENTS when refactoring
- NEVER "FIX" TESTS BY ACCEPTING ERRORS or ignoring failing cases
- ALWAYS fix the underlying issue when tests are failing
- Tests should be reliable and consistent, not accommodating broken code
