# TheSlope Project Guide

## Critical Architecture References

### Architecture Decision Records
**ALWAYS REFERENCE BEFORE IMPLEMENTING:** @docs/adr.md

### ADR Compliance Tracking
**CRITICAL: Keep compliance documents updated as part of implementation.** The two tables are read on demand (not auto-loaded): open the one you need before the work starts.

- **`docs/adr-compliance-backend.md`** - Tracks API endpoint compliance
  - Update when implementing/modifying API endpoints
  - Mark validation, return types, repository patterns, and test coverage
  - Reference this before creating new endpoints to ensure compliance

- **`docs/adr-compliance-frontend.md`** - Tracks frontend compliance
  - Update when creating/modifying pages, components, or stores
  - Track route usage, store dependencies, composable usage, ADR compliance
  - Reference this to ensure components follow established patterns

**When to update compliance docs:**
1. After implementing API endpoints → Update backend compliance table
2. After creating components/stores → Update frontend component breakdown
3. After adding tests → Update test coverage columns
4. After fixing violations → Mark as ✅ compliant

**Compliance doc principles (DRY):**
- Documents reference ADRs, don't duplicate ADR content
- Use status markers (✅ ⚠️ ❌ ❓) for quick scanning
- Tables show relationships (routes ↔ components, endpoints ↔ tests) without duplication

### Prisma Schema
**ALWAYS READ BEFORE WORKING WITH ENTITIES:** `prisma/schema.prisma` (read on demand, not auto-loaded)

The schema defines entity relationships, onDelete behaviors (CASCADE vs SET NULL), and data model.

**Critical:** Repository deletion methods rely on Prisma's automatic cascade handling (D1 has no transactions)

## Remember Important Files
- **REFERENCE** `docs/adr.md` (auto-loaded above) for architectural patterns before implementation
- **READ** `docs/adr-compliance-backend.md` before implementing API endpoints
- **READ** `docs/adr-compliance-frontend.md` before implementing components/stores
- **READ** `prisma/schema.prisma` for entity relationships and deletion behavior
- **READ** `docs/testing.md` before writing or changing any test
- `.github/copilot-instructions.md` for project-specific guidelines and conventions

## Commands
- **Dev**: `npm run dev` - Run development server (localhost:3000)
- **Build**: `npm run build` - Build Nuxt application
- **Deploy**: `npm run deploy` - Build and deploy with Wrangler
- **Lint**: `npm run lint`, `npm run lint-fix` - Run ESLint
- **Typecheck**: `npm run ts` (root/app project), `npm run ts:server` (Nitro server project - catches bare auto-imports in composables the server imports, ADR-017), `npm run ts:node` (build-time project)
- **Pre-ship gate**: `npm run pre:all` - lint + all three typechecks; identical to the CI "Lint and typecheck" step
- **Test**: 
  - All tests: `npm run test` - Run all Vitest tests
  - E2E tests: `npm run test:e2e` - Run Playwright tests
  - Single test: `npx vitest tests/component/path/file.unit.spec.ts`
  - Single E2E test: `npx playwright test tests/e2e/path/file.e2e.spec.ts --reporter=line` - Run specific Playwright test with simplified output
  - Run test once and exit: `npx vitest run tests/component/path/file.unit.spec.ts` - Run without watch mode (won't hang)
  - Run test with verbose output: `npx vitest run tests/component/path/file.unit.spec.ts --reporter=verbose` - Detailed test output
- **Database**: the Database section in [README.md](./README.md) holds the setup and migration commands; schema and migration work follows `.claude/skills/prisma/SKILL.md`

## Code Style
- **Approach**: Test-Driven Development (TDD)
- **Architecture**: Vue 3 Composition API
- **Nuxt Auto-imports**: 
  - Don't manually import utils from `~/utils/*` - they're auto-imported
  - Don't manually import composables from `~/composables/*` - they're auto-imported
  - Don't manually import components - they're auto-imported
- **Testing**: `docs/testing.md` — read it before writing or changing any test (not auto-loaded)
  - `*.unit.spec.ts`: Pure function tests (Vitest)
  - `*.nuxt.spec.ts`: Nuxt component tests
  - `*.e2e.spec.ts`: End-to-end tests (Playwright)
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

### CRITICAL: Git Operations
- **NEVER** create git commits using `git commit` unless explicitly instructed to
- **NEVER** create pull requests using `gh pr create` unless explicitly instructed to
- **ONLY** the user creates commits and pull requests
- You may use `git status`, `git diff`, `git log` for information only
- You may use `git add` ONLY when explicitly instructed by the user

### Commit Messages (For User Reference)
- Write clear, concise commit messages
- **DO NOT** add co-author information for AI assistants
- **DO NOT** include "Generated with Claude Code" or similar AI attribution
- Focus on describing the changes and their purpose

### Pull Requests (For User Reference)
- **DO NOT** mention AI assistants as co-authors in PR descriptions
- Focus on technical changes and test results
- Include clear summary of what was updated and why

### Collaboration Approach
- **Planning and Strategy**: Discuss features, create a detailed written plan — follow `.claude/skills/plan-and-supervise/SKILL.md` (named packages, mockup signoff, per-package approval gate, coverage matrix)
- **Schema and migrations**: any change to `prisma/schema.prisma` or a D1 migration follows `.claude/skills/prisma/SKILL.md` — model signed off first, Make targets produce every migration file (`make d1-create-migration`, `make d1-flatten-migrations`, `make d1-prisma`), backfills convergent in the Prisma source, the user applies with `make d1-migrate-*`
- **Documentation**: any prose under `docs/` (runbook, guides, ADR notes, proposal text) follows `.claude/skills/documentation/SKILL.md` — compact, factual, present tense, only what we do; no negatives, alternatives, futures or loaded adjectives; placeholders for mailboxes and secrets
- **Implementation**:
  - You write the core application code
  - Claude helps with test boilerplate, debugging, and refactoring
- **Testing**: TDD approach - write tests first to guide implementation
- **Review**: Claude helps identify issues and suggest optimizations
- **Committing**: USER creates all git commits and pull requests
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
ALWAYS GENERATE WITH UTF-8 encoding for all files.
NEVER celebrate or consider a task complete until functionality is verified correct (run tests, check server, validate output). If not obvious, query user about how to verify.