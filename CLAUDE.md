# TheSlope Project Guide

## Remember Important Files
- Always check `.github/copilot-instructions.md` for project-specific guidelines and conventions
- This file contains detailed instructions about code style, patterns, and testing approaches

## Commands
- **Dev**: `npm run dev` - Run development server (localhost:3000)
- **Build**: `npm run build` - Build Nuxt application
- **Deploy**: `npm run deploy` - Build and deploy with Wrangler
- **Lint**: `npm run lint`, `npm run lint-fix` - Run ESLint
- **Test**: 
  - All tests: `npm run test` - Run all Vitest tests
  - E2E tests: `npm run test:e2e` - Run Playwright tests
  - Single test: `npx vitest tests/component/path/file.unit.spec.ts`
  - Single E2E test: `npx playwright test tests/e2e/path/file.e2e.spec.ts --reporter=line` - Run specific Playwright test with simplified output
  - Run test once and exit: `npx vitest run tests/component/path/file.unit.spec.ts` - Run without watch mode (won't hang)
  - Run test with verbose output: `npx vitest run tests/component/path/file.unit.spec.ts --reporter=verbose` - Detailed test output
- **Database**:
  - Local seed: `npm run db:seed:local` - Seed local database with initial data
  - Local migrate: `npm run db:migrate:local` - Apply migrations to local database
  - Remote migrate: `npm run db:migrate` - Apply migrations to production database
  - Generate client: `npm run db:generate-client` - Generate Prisma client after schema changes
  
  > 📝 **Note**: For detailed database setup and migration instructions, refer to the Database section in [README.md](./README.md).

## Code Style
- **Stack**: Nuxt 3, TypeScript, Pinia, Prisma, Cloudflare
- **Approach**: Test-Driven Development (TDD)
- **Architecture**: Vue 3 Composition API
- **Nuxt Auto-imports**: 
  - Don't manually import utils from `~/utils/*` - they're auto-imported
  - Don't manually import composables from `~/composables/*` - they're auto-imported
  - Don't manually import components - they're auto-imported
- **Testing**:
  - `*.unit.spec.ts`: Pure function tests (Vitest)
  - `*.nuxt.spec.ts`: Nuxt component tests
  - `*.e2e.spec.ts`: End-to-end tests (Playwright)
  - **Testing Guidelines**:
    - Prefer assertions over console logs (`expect()` instead of `console.log()`)
    - Use meaningful test names that describe the behavior being tested
    - Focus tests on business requirements, not implementation details
    - When testing async behavior, use proper `await` patterns
- **Best Practices**:
  - Strict TypeScript typing
  - Preserve comments and test cases when refactoring
  - Prefer arrow functions and switch statements
  - State management through Pinia stores
  - No semicolons at the end of statements
  - Use the Composition API with defineModel properly

## API Patterns
- Use file-based routing under `server/routes/api/`
- Use `getValidatedBody` with Zod schemas for validation
- Repository pattern with CRUD functions in `server/data/prismaRepository.ts`
- Distinguish between validation errors (H3Error) and server errors

## Git & Collaboration Guidelines
### Branch Management
- **NEVER work directly on main branch**
- **ALWAYS create an appropriate feature branch** for each task
- **ALWAYS create a PR** for review before merging to main
- Branch naming: Use descriptive names like `fix-e2e-tests`, `migrate-nuxt-4`, `update-dependencies`

### Commit Messages
- Write clear, concise commit messages
- **DO NOT** add co-author information for AI assistants
- **DO NOT** include "Generated with Claude Code" or similar AI attribution
- Focus on describing the changes and their purpose

### Pull Requests
- **DO NOT** mention AI assistants as co-authors in PR descriptions
- Focus on technical changes and test results
- Include clear summary of what was updated and why

### Collaboration Approach
- **Planning and Strategy**: Discuss features, create a detailed written plan
- **Implementation**: 
  - You write the core application code
  - Claude helps with test boilerplate, debugging, and refactoring
- **Testing**: TDD approach - write tests first to guide implementation
- **Review**: Claude helps identify issues and suggest optimizations