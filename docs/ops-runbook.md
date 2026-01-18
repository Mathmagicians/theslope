# Operations Runbook

Operational procedures for TheSlope infrastructure on Cloudflare.

## Cloudflare Configuration

### Zone: skraaningen.dk

| Subdomain | Environment | Worker |
|-----------|-------------|--------|
| `dev.skraaningen.dk` | Development | `theslope-dev` |
| `www.skraaningen.dk` | Production | `theslope-prod` |
| `skraaningen.dk` | Production | `theslope-prod` |

---

## Bot Protection

### Bot Fight Mode: DISABLED

Bot Fight Mode is **globally disabled** for the zone. This is required because:

1. Bot Fight Mode runs BEFORE WAF custom rules - cannot be bypassed per-request
2. GitHub Actions IPs (Microsoft/Azure datacenter) are flagged as suspicious by Bot Fight Mode
3. Cloudflare free plan doesn't allow Configuration Rules to disable Bot Fight Mode per-request

**Alternative protections in place:**
- Login rate limiting (see below)
- WAF bypass rule for CI/CD (defense in depth)

**Location:** Security → Bots → Bot Fight Mode = Off

---

## WAF Rules

### 1. CI/CD Smoke Test Bypass

Allows automated Playwright smoke tests to bypass remaining security features.

| Field | Value |
|-------|-------|
| **Rule name** | `CI/CD Smoke Test Bypass` |
| **Expression** | `(any(http.request.headers["x-bypass-token"][*] eq "TOKEN"))` |
| **Action** | Skip |
| **Priority** | First |

**Components to skip:**
- All Super Bot Fight Mode Rules
- Browser Integrity Check
- Security Level
- All rate limiting rules

**Token management:**
- Generate: `make generate-session-secret`
- Stored in: GitHub Secrets → `CLOUDFLARE_BYPASS_TOKEN` (both `dev` and `prod` environments)
- Used by: `.github/workflows/cicd.yml` → smoke-tests job
- Sent as: `x-bypass-token` HTTP header (configured in `playwright.config.ts`)

---

### 2. Login Brute Force Protection

Rate limits login attempts to prevent credential stuffing attacks.

| Field | Value |
|-------|-------|
| **Rule name** | `Login brute force protection` |
| **Expression** | `(http.request.uri.path eq "/api/auth/login")` |
| **Characteristics** | IP |
| **Rate** | 3 requests per 10 seconds |
| **Action** | Block |
| **Duration** | 10 seconds |

**Note:** Free plan limitation - minimum intervals are 10 seconds.

---

## GitHub Secrets & Variables

### Repository Secrets (CLOUDFLARE_THESLOPE environment)

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler deployments |
| `NUXT_SESSION_PASSWORD` | Session encryption |
| `DB_D1_ID` | Database identifier |
| `HEY_NABO_USERNAME` | Admin auth for tests |
| `HEY_NABO_PASSWORD` | Admin auth for tests |
| `HEY_NABO_EJ_ADMIN_USERNAME` | Member auth for tests |

### Environment-Specific Secrets (dev / prod)

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_BYPASS_TOKEN` | WAF bypass for smoke tests |
| `HEY_NABO_USERNAME` | Environment-specific admin |
| `HEY_NABO_PASSWORD` | Environment-specific password |
| `HEY_NABO_EJ_ADMIN_USERNAME` | Environment-specific member |

### Repository Variables

| Variable | dev | prod |
|----------|-----|------|
| `BASE_URL` | `https://dev.skraaningen.dk` | `https://www.skraaningen.dk` |
| `NUXT_PUBLIC_HEY_NABO_API` | `https://demo.spaces.heynabo.com/api` | `https://skraaningeni.spaces.heynabo.com/api` |
| `DB_D1_NAME` | `theslope` | `theslope-prod` |

---

## Release & Deployment

### Version Formats

TheSlope uses semantic versioning with build metadata:

| Type | Format | Example | When |
|------|--------|---------|------|
| **Release Candidate** | `{version}-rc.{commits}+{sha}` | `0.1.5-rc.3+a1b2c3d` | Automated dev deployments |
| **Production Release** | `{version}+{sha}` | `0.1.5+a1b2c3d` | Tagged releases to prod |

**Components:**
- `{version}`: Next patch version (auto-calculated from last git tag)
- `{commits}`: Commits since last tag (RC only)
- `{sha}`: Short commit SHA (7 chars)

### Version Display Locations

Users can verify the deployed version:

1. **PageFooter** - Visible on all pages
   - RC: `Theslope v0.1.5-rc.3+a1b2c3d · 2026-01-17`
   - Release: `Theslope v0.1.5+a1b2c3d · 2026-01-17`

2. **Health Endpoint** - Machine-readable (`/api/public/health`)
   ```json
   {
     "status": "ok",
     "timestamp": "2026-01-17T12:00:00.000Z",
     "version": "0.1.5+a1b2c3d",
     "releaseDate": "2026-01-17",
     "sha": "a1b2c3d1234567890abcdef",
     "isRelease": true
   }
   ```

### Triggering Releases

**Development (Automated):**
- Every PR to `main` deploys RC to dev
- Every push to `main` deploys RC to prod
- Version auto-calculated: `make version`

**Production Release:**

Two equivalent methods - both trigger the same CI/CD pipeline:

| Method | Command |
|--------|---------|
| **Git CLI** | `git tag v0.1.5 && git push origin v0.1.5` |
| **GitHub CLI** | `gh workflow run cicd.yml -f release_version=0.1.5` |
| **GitHub UI** | Actions → CI/CD Pipeline → Run workflow → Enter version |

```bash
# Git CLI (GitOps - preferred)
git tag v0.1.5
git push origin v0.1.5

# GitHub CLI
gh workflow run cicd.yml -f release_version=0.1.5

# Watch the run
gh run watch
```

**Makefile Targets (local deploy):**

```bash
make deploy-dev    # Deploy to dev with RC version
make deploy-prod   # Deploy to prod with release version
make version       # Output: 0.1.5-rc.3+a1b2c3d
make version-info  # Output all version env vars
```

### Rollback Process

**Via GitHub CLI:**
```bash
gh workflow run cicd.yml -f rollback_to=abc1234
gh run watch
```

**Via GitHub UI:**
1. Actions → CI/CD Pipeline → Run workflow
2. Enter commit SHA in `rollback_to` field
3. Workflow deploys that commit to prod

**Via Git CLI (local, requires Wrangler auth):**
```bash
git checkout v0.1.4
make deploy-prod
```

**Verification:**
```bash
curl https://www.skraaningen.dk/api/public/health | jq '.version'
# Should return: "0.1.4+oldsha"
```

---

## Database Seeding

### Seed Structure

| Target | Files | In Git | When to Run |
|--------|-------|--------|-------------|
| `make d1-seed-prod` | `seed.sql` + `service-accounts.sql` | ✅ Yes | CI/CD, bootstrap |
| `make d1-seed-master-data-prod` | `prod-master-data-households.sql` | ❌ No (.theslope/) | Manual, after Heynabo import |

### Bootstrap New Environment

```bash
make d1-migrate-prod           # Migrations + seeds (seed.sql + service-accounts.sql)
make d1-seed-master-data-prod  # PBS ID mappings (confidential, manual)
```

### Re-run Seeds Only (no migrations)

```bash
make d1-seed-prod              # seed.sql + service-accounts.sql
make d1-seed-master-data-prod  # PBS ID mappings (confidential)
```

### Service Accounts

Service accounts (heynaboId 1, 212) have preferences set to NONE to prevent scaffolding.
File: `migrations/seed/service-accounts.sql`

---

## Routine Operations

### Rotate Cloudflare Bypass Token

1. Generate new token: `make generate-session-secret`
2. Update Cloudflare WAF rule expression with new token
3. Update GitHub Secrets: `CLOUDFLARE_BYPASS_TOKEN` in both `dev` and `prod` environments
4. Verify: Push a commit to trigger smoke tests

### Check Bot Fight Mode Status

1. Cloudflare Dashboard → skraaningen.dk → Security → Bots
2. Verify Bot Fight Mode is **disabled** (required for CI/CD)
3. Check WAF bypass rule is active

### View Rate Limiting Metrics

1. Cloudflare Dashboard → skraaningen.dk → Security → WAF → Rate limiting rules
2. Click rule to view metrics
3. Check for legitimate users being blocked (adjust rate if needed)

---

## Troubleshooting

### Smoke Tests Failing with 403

**Symptom:** `setup-ui` auth fails, page shows "Verifying you are human"

**Cause:** Cloudflare Bot Fight Mode blocking Playwright from GitHub Actions (datacenter IPs)

**Diagnosis:**
1. Check Security → Events for `source: botFight` entries
2. GitHub Actions IPs show as `MICROSOFT-CORP-MSN-AS-BLOCK` ASN

**Fix:**
1. Verify Bot Fight Mode is **disabled** (Security → Bots)
2. Verify `CLOUDFLARE_BYPASS_TOKEN` is set in GitHub environment secrets (dev AND prod)
3. Verify WAF bypass rule expression matches the token
4. Verify `playwright.config.ts` sends `x-bypass-token` header

**Key insight:** Bot Fight Mode runs BEFORE WAF custom rules, so it cannot be bypassed per-request on free plan. Must be disabled globally.

### Smoke Tests Failing with 429

**Symptom:** Rate limit exceeded

**Fix:**
1. Check WAF bypass rule skips "All rate limiting rules"
2. Or increase rate limit threshold in the rate limiting rule

### Smoke Tests Pass Locally But Fail in CI/CD

**Symptom:** Tests work from your machine but fail from GitHub Actions

**Cause:** Cloudflare treats datacenter IPs (GitHub Actions) differently from residential IPs

**Fix:** Ensure Bot Fight Mode is disabled - it specifically targets datacenter/cloud IPs.

---

*Last updated: January 2026*
