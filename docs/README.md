# TheSlope Documentation

Welcome to TheSlope documentation. This directory contains all technical and feature documentation for the community dining management platform.

## Table of Contents

### =� Core Documentation

- [**Architecture Decision Records (ADRs)**](./adr.md)
  - ADR-001: Core Framework and Technology Stack
  - ADR-002: Event Handler Error Handling and Validation Patterns
  - ADR-003: BDD-Driven Testing Strategy with Factory Pattern
  - Documenting important architectural decisions and their rationale

- [**Features Overview**](./features.md)
  - User roles (Chef, Admin, Skr�ner)
  - Data model overview
  - Complete functionality breakdown by role

- [**Quick Reference**](./prompt.md)
  - Technology stack summary
  - Testing approach
  - Development patterns

### =' Development Resources

- [**Project TODO**](../TODO.md)
  - Current development priorities
  - Framework migration plans
  - Test fixes and improvements

- [**Development Guide**](../CLAUDE.md)
  - Commands reference
  - Code style guidelines
  - Testing patterns
  - Git workflow

- [**Main README**](../README.md)
  - Project setup instructions
  - Database configuration
  - Deployment guide
  - Environment variables

### =� Additional Resources

- [**API Samples**](./heynabo_api_samples/)
  - Heynabo API integration examples
  - Request/response samples

- [**Screenshots**](./screenshots/)
  - UI/UX reference images
  - Feature demonstrations

## Quick Links

### Common Development Tasks

| Task | Command | Description |
|------|---------|-------------|
| Development | `npm run dev` | Start local development server on port 3000 |
| Testing | `npm run test` | Run all Vitest and Playwright tests |
| Build | `npm run build` | Build production-ready application |
| Deploy | `npm run deploy` | Deploy to Cloudflare Workers/Pages |
| Database | `npm run db:migrate:local` | Apply database migrations locally |

### Key Technologies

- **Framework**: Nuxt 3.15 with Vue 3 Composition API
- **Language**: TypeScript 5.7 with strict mode
- **Validation**: Zod for runtime validation and type inference
- **Database**: Prisma with Cloudflare D1 (SQLite)
- **State Management**: Pinia 3.0
- **UI Framework**: Nuxt UI 3 with Tailwind CSS 4
- **Deployment**: Cloudflare Workers/Pages

### Testing Strategy

| Test Type | File Pattern | Framework | Purpose |
|-----------|-------------|-----------|---------|
| Unit | `*.unit.spec.ts` | Vitest | Pure function testing |
| Nuxt | `*.nuxt.spec.ts` | Vitest | Nuxt component testing |
| E2E | `*.e2e.spec.ts` | Playwright | End-to-end testing |

## Navigation Guide

### For New Developers
1. Start with [Main README](../README.md) for setup
2. Review [Architecture Decision Records](./adr.md) to understand technology choices
3. Check [Development Guide](../CLAUDE.md) for coding standards
4. Explore [Features Overview](./features.md) to understand the domain

### For Contributing
1. Review [TODO](../TODO.md) for current priorities
2. Follow guidelines in [Development Guide](../CLAUDE.md)
3. Understand validation patterns in [ADR-001](./adr.md#zod-integration-examples)
4. Run tests before submitting PRs

### For Architecture Decisions
- All major technology decisions are documented in [ADRs](./adr.md)
- Framework choices, patterns, and rationale are explained
- Code examples demonstrate implementation patterns

## Documentation Standards

- **Language**: Technical documentation in English, user-facing content in Danish
- **Format**: Markdown with GitHub-flavored extensions
- **Code Examples**: Include real examples from the codebase
- **Updates**: Keep documentation in sync with code changes
- **ADRs**: Document all significant architectural decisions

## Need Help?

- Check the [Quick Reference](./prompt.md) for common patterns
- Review [ADRs](./adr.md) for architectural guidance
- See [Main README](../README.md) for setup issues
- Explore code examples in the documentation

---

*Last Updated: January 2025*