# Feature Proposal: Post-Deployment Smoke Tests

## Summary

Add a smoke test job that runs after deployment using GitHub Environments for credentials.

## Implementation Status

### Phase 1: Wrangler Config (✅ Done)

Added `DEPLOY_URL` to wrangler.toml - single source of truth:

```toml
[env.dev.vars]
DEPLOY_URL = "https://dev.skraaningen.dk"

[env.prod.vars]
DEPLOY_URL = "https://www.skraaningen.dk"
```

### Phase 2: CI/CD Workflow (✅ Done)

- Single `target` step determines environment ONCE from branch
- Single `deploy` step uses target.outputs.env to choose deploy command
- URL extracted from deploy output (reads DEPLOY_URL from wrangler output)
- smoke-tests job uses `environment: ${{ needs.CICD.outputs.deployed_env }}`

### Phase 3: Package.json Script (✅ Done)

```json
{
  "scripts": {
    "test:e2e:smoke": "npx playwright test --grep @smoke --reporter=line"
  }
}
```

### Phase 4: GitHub Environments Setup (TODO)

Create two GitHub Environments in repository settings:

**Environment: `dev`**
- Secrets: `HEY_NABO_USERNAME`, `HEY_NABO_PASSWORD`

**Environment: `prod`**
- Secrets: `HEY_NABO_USERNAME`, `HEY_NABO_PASSWORD`

### Phase 5: Tag Existing Tests with `@smoke` (TODO)

| File | Test to Tag |
|------|-------------|
| `tests/e2e/ui/pages.e2e.spec.ts` | `@smoke / has title` |
| `tests/e2e/api/auth/login.e2e.spec.ts` | `@smoke should return UserDetail...` |
| `tests/e2e/api/admin/season.e2e.spec.ts` | `@smoke PUT should create...` |
| `tests/e2e/api/admin/household.e2e.spec.ts` | `@smoke PUT should create...` |

### Phase 6: Health Endpoint (Optional)

Add `/api/health` endpoint and test tagged with `@smoke`.

## Remaining Tasks

- [ ] Create GitHub Environments (dev, prod) with credentials
- [ ] Tag existing tests with `@smoke`
- [ ] (Optional) Add health endpoint
