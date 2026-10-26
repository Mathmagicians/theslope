#!/usr/bin/env make
# Environment: .env.* locally, CI/CD provides env vars directly
SHELL := /bin/bash

# ============================================================================
# ENVIRONMENT CONFIGS
# ============================================================================
ENV_local := .env
ENV_dev   := .env.dev
ENV_prod  := .env.prod

# BASE_URL (the app's URL) and the credentials come from these files — or from the environment in CI

# Comma variable for use in $(call ...) where literal commas are separators
COMMA := ,

# ============================================================================
# MACROS
# ============================================================================
# Source env file (if exists) then run command - works with CI/CD provided vars
define with_env
	@if [ -f "$(1)" ]; then set -a; source "$(1)"; set +a; fi; $(2)
endef

# Source the env file when present (CI provides the variables directly) and require BASE_URL
define require_base_url
	if [ -f "$(1)" ]; then set -a; source "$(1)"; set +a; fi; : "$${BASE_URL:?BASE_URL missing — set it in $(1)}"
endef

# $(1)=env file, $(2)=curl args. Logs in with HEY_NABO_* and calls $$BASE_URL
define theslope_call
	@$(call require_base_url,$(1)) && curl -s -c .cookies.txt "$$BASE_URL/api/auth/login" -H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq -e '.email' > /dev/null && \
	curl -s -b .cookies.txt -H "Content-Type: application/json" $(2) | jq
endef

# $(1)=argument name, $(2)=its value → stops with the target's usage unless the value names a file
define require_file
	@test -f "$(2)" || { echo "usage: make $@ $(1)=<file> ('$(2)' is not a file)"; exit 1; }
endef

define heynabo_call
	@source $(1) && HEY_TOKEN=$$(curl -s -X POST "$$NUXT_PUBLIC_HEY_NABO_API/login" -H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq -r '.token') && \
	curl -s -H "Accept: application/json" -H "Authorization: Bearer $$HEY_TOKEN" $(2) | jq
endef

# D1 execute wrapper
define d1_exec
	@npx wrangler d1 execute $(1) --command="$(2)" $(3)
endef

# ============================================================================
# HELP
# ============================================================================
.DEFAULT_GOAL := help
.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2}'

# ============================================================================
# D1 — SCHEMA, MIGRATIONS, SEEDS, QUERIES
# ============================================================================
# --- Design system → palette presets (app/assets/css/palettes/*.css, generated, committed)
.PHONY: palettes

palettes: ## Regenerate the palette presets from the design system (rerun after a change to main.css scales, app.config ui.colors or a fill/ink token)
	@JITI_ALIAS='{"~~":"$(CURDIR)","~":"$(CURDIR)/app"}' npx jiti scripts/palettes/generate.ts

# --- Wrangler configs → C4 diagrams (docs/architecture: the container .mmd generated, every .svg rendered, committed)
.PHONY: c4 c4-check

C4_CONTAINER := docs/architecture/c4-container.mmd
# wrangler loads through Node: jiti's CommonJS interop breaks the miniflare bundle it requires
C4_GENERATE = JITI_NATIVE_MODULES='["wrangler"]' npx jiti scripts/c4/generate.ts

c4: ## Generate the C4 container diagram from the wrangler configs and render docs/architecture/*.mmd to SVG through kroki.io
	@$(C4_GENERATE) $(C4_CONTAINER)
	@for mmd in docs/architecture/*.mmd; do \
		curl -sSf -X POST https://kroki.io/mermaid/svg -H 'Content-Type: text/plain' --data-binary @$$mmd -o $${mmd%.mmd}.svg || exit 1; \
	done

c4-check: ## Fail when the C4 container diagram differs from the wrangler configs
	@$(C4_GENERATE) | diff -u $(C4_CONTAINER) - || { echo "$(C4_CONTAINER) is stale - run make c4"; exit 1; }

# --- GitHub Actions workflows → CodeQL's Actions queries (.output/codeql-actions); pre:all runs the scan when the branch or
# the working tree changes .github, CI's CodeQL pipeline scans the pushed workflows
.PHONY: lint-gh-actions lint-gh-actions-changed

lint-gh-actions-changed: ## Run lint-gh-actions when the branch or the working tree changes .github (skipped in CI)
	@[ -n "$$CI" ] || { git diff --quiet $$(git merge-base origin/main HEAD) -- .github && [ -z "$$(git ls-files --others --exclude-standard .github)" ]; } || $(MAKE) --no-print-directory lint-gh-actions

lint-gh-actions: ## Run CodeQL's Actions queries (latest) on the workflows; prints the findings and fails on one
	@mkdir -p .output
	@gh codeql set-version latest
	@gh codeql pack download codeql/actions-queries
	@gh codeql database create .output/codeql-actions --language=actions --source-root=. --overwrite --quiet
	@gh codeql database analyze .output/codeql-actions codeql/actions-queries --format=csv --output=.output/codeql-actions.csv --quiet
	@! grep . .output/codeql-actions.csv

# --- Schema → migration files → Prisma client + zod (prisma/generated, committed)
.PHONY: d1-prisma-zod d1-prisma d1-prisma-check d1-create-migration d1-flatten-migrations

d1-prisma-zod:
	@npx prisma generate zod

d1-prisma: d1-prisma-zod ## Generate Prisma client and Zod types
	@npx prisma format
	@npx prisma validate
	@npm run db:generate-client

d1-prisma-check: d1-prisma ## Fail when the committed generated layer differs from the schema
	@git diff --exit-code --stat prisma/generated prisma/schema.prisma

d1-create-migration: ## Create migration (name=xxx)
	@echo "📝 Creating new Prisma migration..."
	@npx prisma migrate dev --name $(name) --create-only
	@echo "✅ Migration created in prisma/migrations/"
	@$(MAKE) d1-flatten-migrations

d1-flatten-migrations:
	@echo "🔄 Flattening Prisma migrations for Wrangler..."
	@mkdir -p migrations
	@counter=1; \
	for dir in $$(ls -d prisma/migrations/[0-9]*_*/ 2>/dev/null | sort); do \
		if [ -f "$${dir}migration.sql" ]; then \
			dirname=$${dir%/}; \
			desc_name=$${dirname##*_}; \
			padded_num=$$(printf "%04d" $$counter); \
			target="migrations/$${padded_num}_$${desc_name}.sql"; \
			if [ ! -f "$$target" ]; then \
				cp "$${dir}migration.sql" "$$target"; \
				echo "  ✅ Created $${padded_num}_$${desc_name}.sql"; \
			fi; \
			counter=$$((counter + 1)); \
		fi \
	done
	@echo "✅ Migrations flattened!"

# --- Apply migrations (+ seeds) per environment
.PHONY: d1-migrate-local d1-migrate-dev d1-migrate-prod d1-migrate-all d1-verify-local d1-verify-dev d1-verify-prod

# --- Parent-link check: the counts of child rows without a parent on every ON DELETE SET NULL link. A migration is done when
#     the counts are the same before and after the apply (children without a parent are legitimate: inhabitants without a login,
#     orders of deleted users) — a rebuilt parent table shows up as every count jumping to the row count
# $(1)=database, $(2)=location flags (--local | --remote --env dev|prod) → one line of counts
define d1_link_counts
	npx wrangler d1 execute $(1) $(2) --json --command "SELECT (SELECT COUNT(*) FROM Inhabitant WHERE userId IS NULL) AS inhabitantsWithoutUser, (SELECT COUNT(*) FROM \"Order\" WHERE bookedByUserId IS NULL) AS ordersWithoutUser, (SELECT COUNT(*) FROM OrderHistory WHERE performedByUserId IS NULL) AS historyWithoutUser, (SELECT COUNT(*) FROM Invoice WHERE billingPeriodSummaryId IS NULL) AS invoicesWithoutPeriod" | jq -c '.[0].results[0]'
endef

# $(1)=database, $(2)=location flags, $(3)=npm migrate script, $(4)=npm seed script — apply + seed, fail when a parent link count changed
define d1_migrate
	@before=$$($(call d1_link_counts,$(1),$(2))) && echo "links without parent before: $$before" && \
	npm run $(3) && npm run $(4) && \
	after=$$($(call d1_link_counts,$(1),$(2))) && echo "links without parent after:  $$after" && \
	if [ "$$before" != "$$after" ]; then echo "❌ the migration changed parent links — see docs/ops-runbook.md Schema Changes"; exit 1; fi
endef

d1-verify-local: ## Child rows without a parent on the SET NULL links (local)
	@$(call d1_link_counts,theslope,--local)

d1-verify-dev: ## Child rows without a parent on the SET NULL links (dev)
	@$(call d1_link_counts,theslope,--remote --env dev)

d1-verify-prod: ## Child rows without a parent on the SET NULL links (prod)
	@$(call d1_link_counts,theslope-prod,--remote --env prod)

d1-migrate-local: ## Migrate + seed the local database; fails when a parent link count changed
	@echo "🏗️ Applying migrations to local database"
	$(call d1_migrate,theslope,--local,db:migrate:local,db:seed:all:local)

d1-migrate-dev: ## Migrate + seed the dev database; fails when a parent link count changed
	@echo "🏗️ Applying migrations to dev database"
	$(call d1_migrate,theslope,--remote --env dev,db:migrate:dev,db:seed:all:dev)

d1-migrate-prod: ## Migrate + seed the production database; fails when a parent link count changed
	@echo "🏗️ Applying migrations to production database"
	$(call d1_migrate,theslope-prod,--remote --env prod,db:migrate:prod,db:seed:all:prod)

d1-migrate-all: d1-migrate-local d1-migrate-dev d1-migrate-prod
	@echo "✅ Applied migrations to all databases"

# --- Seeds
.PHONY: d1-seed-local d1-seed-dev d1-seed-prod d1-seed-testdata d1-seed-master-data-local d1-seed-master-data-dev d1-seed-master-data-prod

d1-seed-local: ## Run all seeds (local)
	@npm run db:seed:all:local

d1-seed-dev: ## Run all seeds (dev)
	@npm run db:seed:all:dev

d1-seed-prod: ## Run all seeds (prod)
	@npm run db:seed:all:prod

d1-seed-testdata: ## Seed local with test data
	@npx wrangler d1 execute theslope --file migrations/seed/test-data.sql --local
	@echo "✅ Test data loaded!"

# Master data: PBS ID mappings - CONFIDENTIAL, not in git (.theslope/)
# Run manually after d1-migrate-* or Heynabo import. Not part of CI/CD.
d1-seed-master-data-local: ## Load master data to local (confidential, manual)
	@npx wrangler d1 execute theslope --file .theslope/dev-master-data-households.sql --local
	@echo "✅ Master data loaded (local)!"

d1-seed-master-data-dev: ## Load master data to dev (confidential, manual)
	@npx wrangler d1 execute theslope --file .theslope/dev-master-data-households.sql --env dev --remote
	@echo "✅ Master data loaded (dev)!"

d1-seed-master-data-prod: ## Load master data to prod (confidential, manual)
	@npx wrangler d1 execute theslope-prod --file .theslope/prod-master-data-households.sql --env prod --remote
	@echo "✅ Master data loaded (prod)!"

# --- Queries and test-data cleanup (local)
.PHONY: d1-list-users-local d1-list-tables d1-list-tables-local d1-nuke-seasons d1-nuke-households d1-nuke-users d1-nuke-allergytypes d1-nuke-allergy-notes d1-nuke-all

d1-list-users-local:
	$(call d1_exec,theslope,SELECT * FROM User,--local)

d1-list-tables:
	$(call d1_exec,theslope,PRAGMA table_list,--env dev --remote)

d1-list-tables-local:
	$(call d1_exec,theslope,PRAGMA table_list,--local)

d1-nuke-seasons: ## Delete test seasons (local) - any season with 'Test' in name
	@echo "🔍 Seasons to delete:"
	$(call d1_exec,theslope,SELECT COUNT(id) as count FROM Season WHERE shortName LIKE '%Test%',--local)
	$(call d1_exec,theslope,DELETE FROM Season WHERE shortName LIKE '%Test%',--local)
	@echo "✅ Remaining test seasons:"
	$(call d1_exec,theslope,SELECT COUNT(id) as count FROM Season WHERE shortName LIKE '%Test%',--local)

d1-nuke-households: ## Delete test households (local)
	@echo "🧹 Cleaning up test households..."
	$(call d1_exec,theslope,DELETE FROM 'Order' WHERE inhabitantId IN (SELECT id FROM Inhabitant WHERE householdId IN (SELECT id FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%')),--local)
	$(call d1_exec,theslope,DELETE FROM CookingTeamAssignment WHERE inhabitantId IN (SELECT id FROM Inhabitant WHERE householdId IN (SELECT id FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%')),--local)
	$(call d1_exec,theslope,DELETE FROM Allergy WHERE inhabitantId IN (SELECT id FROM Inhabitant WHERE householdId IN (SELECT id FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%')),--local)
	$(call d1_exec,theslope,DELETE FROM Inhabitant WHERE householdId IN (SELECT id FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%'),--local)
	$(call d1_exec,theslope,DELETE FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%',--local)
	@echo "🧹 Cleaning up fake inhabitants (Anders-uuid pattern)..."
	$(call d1_exec,theslope,DELETE FROM Inhabitant WHERE name LIKE 'Anders-%-%-%-%-%',--local)
	@echo "✅ Cleanup complete!"

d1-nuke-users: ## Delete test users (local) - emails ending in @andeby.dk
	@echo "🧹 Cleaning up test users..."
	$(call d1_exec,theslope,DELETE FROM User WHERE email LIKE '%@andeby.dk',--local)
	@echo "✅ Test users cleaned up!"

d1-nuke-allergytypes: ## Delete test allergy types (local) - Peanuts-* pattern
	@echo "🧹 Cleaning up test allergy types..."
	$(call d1_exec,theslope,DELETE FROM AllergyType WHERE name LIKE 'Peanuts-%' OR name LIKE 'Test %' OR name LIKE 'Updated %',--local)
	@echo "✅ Test allergy types cleaned up!"

# The e2e specs salt every line they add to the allergy poster notes with a UUID; a member's text carries none
NOTES_TEST_LINE := '%________-____-____-____-____________%'
NOTES_LINES := WITH RECURSIVE src(txt) AS (SELECT json_extract(value, '$$') FROM Setting WHERE key = 'allergy-poster-notes'), split(line, rest, n) AS (SELECT '', txt || char(10), 0 FROM src UNION ALL SELECT substr(rest, 1, instr(rest, char(10)) - 1), substr(rest, instr(rest, char(10)) + 1), n + 1 FROM split WHERE rest <> '')
NOTES_TEST_LINE_COUNT := $(NOTES_LINES) SELECT count(*) AS test_lines FROM split WHERE n > 0 AND line LIKE $(NOTES_TEST_LINE)
NOTES_TEST_LINE_DELETE := $(NOTES_LINES) UPDATE Setting SET value = json_quote(coalesce((SELECT group_concat(line, char(10)) FROM (SELECT line FROM split WHERE n > 0 AND line NOT LIKE $(NOTES_TEST_LINE) ORDER BY n)), '')) WHERE key = 'allergy-poster-notes'; DELETE FROM Setting WHERE key = 'allergy-poster-notes' AND json_extract(value, '$$') = ''

d1-nuke-allergy-notes: ## Remove the e2e lines (a UUID in the line) from the allergy poster notes (local)
	@echo "🔍 Test lines in the allergy notes:"
	$(call d1_exec,theslope,$(NOTES_TEST_LINE_COUNT),--local)
	$(call d1_exec,theslope,$(NOTES_TEST_LINE_DELETE),--local)
	@echo "✅ Remaining test lines:"
	$(call d1_exec,theslope,$(NOTES_TEST_LINE_COUNT),--local)

d1-nuke-all: d1-nuke-seasons d1-nuke-households d1-nuke-users d1-nuke-allergytypes d1-nuke-allergy-notes ## Nuke all test data from local database
	@echo "✅ Nuked all test data!"

# --- Time Travel (remote D1, last 30 days) and the dev → local copy. Local has no Time Travel: it is replaced by a copy of dev
.PHONY: d1-time-travel-info-dev d1-time-travel-info-prod d1-time-travel-dev d1-time-travel-prod d1-copy-dev-to-local

# $(1)=database, $(2)=env — the last migration the database has applied (d1_migrations)
define d1_last_migration
	@npx wrangler d1 execute $(1) --remote --env $(2) --json --command "SELECT name, applied_at FROM d1_migrations ORDER BY id DESC LIMIT 1" \
		| jq -r '.[0].results[0] | "last migration applied: \(.name) at \(.applied_at) UTC"'
endef

# $(1)=database, $(2)=env; ts=<RFC3339 or unix seconds> optional — the bookmark for that point (default: now) and the migration state of the database
define d1_time_travel_info
	@npx wrangler d1 time-travel info $(1) --env $(2) $(if $(ts),--timestamp=$(ts),)
	$(call d1_last_migration,$(1),$(2))
endef

d1-time-travel-info-dev: ## Bookmark of the dev D1 (ts=<RFC3339> for a past point) + its last applied migration
	$(call d1_time_travel_info,theslope,dev)

d1-time-travel-info-prod: ## Bookmark of the prod D1 (ts=<RFC3339> for a past point) + its last applied migration
	$(call d1_time_travel_info,theslope-prod,prod)

# $(1)=database, $(2)=env; ts=<RFC3339 or unix seconds, within the last 30 days>. Prints the last migration before and after the restore
define d1_time_travel
	@test -n "$(ts)" || { echo "usage: make $@ ts=2026-09-17T14:05:00Z"; exit 1; }
	@echo "before restore:"
	$(call d1_last_migration,$(1),$(2))
	@npx wrangler d1 time-travel restore $(1) --env $(2) --timestamp=$(ts)
	@echo "after restore:"
	$(call d1_last_migration,$(1),$(2))
endef

d1-time-travel-dev: ## Restore the dev D1 to ts=<RFC3339>; prints the last applied migration before and after (d1_migrations travels with the data)
	$(call d1_time_travel,theslope,dev)

d1-time-travel-prod: ## Restore the prod D1 to ts=<RFC3339>; prints the last applied migration before and after
	$(call d1_time_travel,theslope-prod,prod)

# Stop nuxt dev / run-sender-local first: they hold the local D1 open. The dump is loaded with sqlite3 straight into the
# miniflare database file (wrangler d1 execute --file fails on a dump this size); the export stays in .theslope/d1/ (gitignored)
d1-copy-dev-to-local: ## Replace the local D1 with a copy of dev (schema, data, applied migrations) — stop the local app first
	@mkdir -p .theslope/d1 && \
	npx wrangler d1 export theslope --remote --env dev --output .theslope/d1/dev.sql && \
	rm -rf .wrangler/state/v3/d1 && \
	npx wrangler d1 execute theslope --local --command "SELECT 1" > /dev/null && \
	sqlite3 "$$(ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/[0-9a-f]*.sqlite)" < .theslope/d1/dev.sql && \
	npx wrangler d1 execute theslope --local --command "SELECT name AS lastMigrationApplied, applied_at FROM d1_migrations ORDER BY id DESC LIMIT 1"

# ============================================================================
# TESTING
# ============================================================================
.PHONY: unit-test unit-test-single e2e-team e2e-season smoke-dev smoke-prod test-report bdd-report bdd-steps developer-resolve developer-assemble developer-build developer-publish

# The summary tables are jq programs under scripts/ (test-report.jq, bdd-report.jq); the step reuse is
# scripts/bdd-steps.mjs, which matches the feature lines through playwright-bdd's generator
TEST_REPORT_USAGE := usage: make test-report report=<playwright json> title=<text> [note=<warning shown when failed > 0>]

test-report: ## Markdown summary of a Playwright suite - report=<json> title=<text> [note=<text>]
	@test -n "$(report)" -a -n "$(title)" || { echo "$(TEST_REPORT_USAGE)"; exit 1; }
	@if [ -f "$(report)" ]; then \
		jq -r -f scripts/test-report.jq --arg title "$(title)" --arg note "$(note)" "$(report)" \
			|| echo "## ⚠️ $(title) — could not parse $(report)"; \
	else \
		echo "## ⚠️ $(title) — no results file at $(report)"; \
	fi

# The suite's Cucumber JSON, as npm run test:e2e:<suite> writes it
suite ?= api
bdd_report = .output/bdd/reports/e2e-$(suite)-bdd.json

bdd-report: ## BDD summary of a suite - [suite=api|ui|ui-serial|smoke] [report=<cucumber json>] [title=<text>] [note=<text>]
	@report="$(or $(report),$(bdd_report))"; title="$(or $(title),BDD $(suite) tests)"; \
	if [ -f "$$report" ]; then \
		jq -r -f scripts/bdd-report.jq --arg title "$$title" --arg note "$(note)" "$$report" \
			|| echo "## ⚠️ $$title — could not parse $$report"; \
	else \
		echo "## ⚠️ $$title — no results file at $$report (npm run test:e2e:$(suite) writes it)"; \
	fi

bdd-steps: ## Step reuse across the features, each line against the definition bddgen matches - [summary=1 for the one line alone]
	@node scripts/bdd-steps.mjs $(if $(summary),--summary,)

# Developer companion (docs/features/feature-proposal-developer-companion.md): everything generated lives under
# .output/developer — the downloaded artifacts, the Nuxt build (.nuxt, nitro, public; developer/nuxt.config.ts), the gh-pages checkout
DEVELOPER_OUT := .output/developer
DEVELOPER_PUBLIC := $(DEVELOPER_OUT)/public
site ?= $(DEVELOPER_OUT)/site
artifacts ?= $(DEVELOPER_OUT)/artifacts
DEVELOPER_SUITES := api ui ui-serial smoke
DEVELOPER_ASSEMBLE_USAGE := usage: make developer-assemble env=<dev|prod> run=<pipeline run id> version=<version> sha=<commit> [url=<app url>] [site=] [artifacts=]
# A pipeline run that deploys uploads the artifact `deployment`: RELEASE_VERSION, COMMIT_SHA, ENV and URL from its step outputs
developer-resolve: ## What a pipeline run published, from its deployment artifact, as env lines - run=<pipeline run id> [artifacts=]
	@test -n "$(run)" || { echo "usage: make developer-resolve run=<pipeline run id> [artifacts=artifacts]"; exit 1; }
	@rm -rf "$(artifacts)/deployment"; \
	if gh run download "$(run)" -n deployment -D "$(artifacts)/deployment" > /dev/null 2>&1 && [ -f "$(artifacts)/deployment/deployment.env" ]; then \
		echo "PUBLISH=true"; echo "RUN_ID=$(run)"; cat "$(artifacts)/deployment/deployment.env"; \
	else \
		echo "PUBLISH=false"; \
	fi

developer-assemble: ## Lay a run's results and manifest under site/environments - env= run= version= sha= [url=] [site=] [artifacts=]
	@test -n "$(env)" -a -n "$(run)" -a -n "$(version)" -a -n "$(sha)" || { echo "$(DEVELOPER_ASSEMBLE_USAGE)"; exit 1; }
	@rm -rf "$(site)/environments/$(env)" && mkdir -p "$(site)/environments/$(env)"
	@suites='{}'; for suite in $(DEVELOPER_SUITES); do \
		dest="$(site)/environments/$(env)/$$suite"; \
		bdd="$(artifacts)/bdd-$$suite"; cucumber="$$bdd/e2e-$$suite-bdd.json"; \
		if [ -f "$$cucumber" ]; then \
			mkdir -p "$$dest" && cp "$$cucumber" "$$dest/" && cp -R "$$bdd/e2e-$$suite-bdd/." "$$dest/"; \
			result=$$(jq -c -f scripts/bdd-report.jq --arg title "" --arg note "" --arg counts 1 "$$cucumber" \
				| jq -c '{passed, failed: (.failed + .undefined), flaky: 0, skipped: .other, report: "index.html"}'); \
		else \
			echo "developer-assemble: no $$cucumber"; continue; \
		fi; \
		suites=$$(jq -c --arg suite "$$suite" --argjson result "$$result" '. + {($$suite): $$result}' <<< "$$suites"); \
	done; \
	jq -n --arg environment "$(env)" --arg version "$(version)" --arg sha "$(sha)" --arg url "$(url)" --arg run "$(run)" --arg deployedAt "$$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson suites "$$suites" \
		'{environment: $$environment, version: $$version, sha: $$sha, deployedAt: $$deployedAt, run: ($$run | tonumber? // $$run), suites: $$suites} + (if ($$url | length) > 0 then {url: $$url} else {} end)' > "$(site)/environments/$(env).json"
	@for manifest in "$(site)"/environments/*.json; do name=$$(basename "$$manifest" .json); [ "$$name" = index ] || echo "$$name"; done | sort | jq -R . | jq -s . > "$(site)/environments/index.json"
	@[ ! -f "$(artifacts)/openapi/_openapi.json" ] || cp "$(artifacts)/openapi/_openapi.json" "$(site)/environments/$(env)/openapi.json"
	@cat "$(site)/environments/$(env).json"

# The hashed chunks live under _nuxt; the previous build's go before the copy so they do not pile up on gh-pages.
# base is the path the site is served under (NUXT_APP_BASE_URL); domain, when set, is the custom domain in CNAME
developer-build: ## Generate the site into the gh-pages checkout - nuxi generate, CNAME and .nojekyll [base=/] [domain=] [site=]
	@NUXT_APP_BASE_URL="$(or $(base),/)" npx nuxi generate developer
	@mkdir -p "$(site)" && rm -rf "$(site)/_nuxt" && cp -R "$(DEVELOPER_PUBLIC)/." "$(site)/" && \
	{ if [ -n "$(domain)" ]; then echo "$(domain)" > "$(site)/CNAME"; else rm -f "$(site)/CNAME"; fi; } && touch "$(site)/.nojekyll"

developer-publish: ## Force-push site/ as the single commit of gh-pages - [env=<env>] [site=]
	@test -d "$(site)" || { echo "usage: make developer-publish [env=<env>] [site=site] (run developer-build first)"; exit 1; }
	@cd "$(site)" && \
	{ [ -d .git ] || git init -q; } && \
	{ git remote get-url origin > /dev/null 2>&1 || git remote add origin "https://github.com/$${GITHUB_REPOSITORY:?GITHUB_REPOSITORY missing and $(site) has no origin}.git"; } && \
	git config credential.https://github.com.helper '!gh auth git-credential' && \
	git add -A && \
	commit=$$(git -c user.name="$$(git config user.name || echo 'github-actions[bot]')" -c user.email="$$(git config user.email || echo 'github-actions[bot]@users.noreply.github.com')" \
		commit-tree "$$(git write-tree)" -m "Developer companion $$(date -u +%Y-%m-%dT%H:%MZ) $(env)") && \
	git update-ref refs/heads/gh-pages "$$commit" && \
	git push -q --force origin refs/heads/gh-pages:refs/heads/gh-pages

unit-test: ## Run all unit tests
	@npx vitest --run

unit-test-single: ## Run single test (name=pattern)
	@npx vitest --run --testNamePattern=$(name)

e2e-team: ## Run team E2E tests
	@npx playwright test tests/e2e/api/admin/team.e2e.spec.ts --reporter=line

e2e-season: ## Run season E2E tests
	@npx playwright test tests/e2e/api/admin/season.e2e.spec.ts --reporter=line

# Smoke macro: $(1)=env file — BASE_URL from the env file, SHOULD_NOT_MUTATE, runs the smoke suite
define run_smoke
	@$(call require_base_url,$(1)) && SHOULD_NOT_MUTATE=true npm run test:e2e:smoke
endef

smoke-dev: ## Run smoke tests against dev (BASE_URL from .env.dev)
	$(call run_smoke,$(ENV_dev))

smoke-prod: ## Run smoke tests against prod (BASE_URL from .env.prod)
	$(call run_smoke,$(ENV_prod))

# ============================================================================
# VERSION MANAGEMENT
# ============================================================================
.PHONY: version version-info

# Get commit SHA (CI provides GITHUB_SHA, local uses git)
GIT_SHA := $(or $(GITHUB_SHA),$(shell git rev-parse HEAD 2>/dev/null || echo "unknown"))
GIT_SHA_SHORT := $(shell echo $(GIT_SHA) | cut -c1-7)

# Get last version tag
LAST_TAG := $(shell git describe --tags --abbrev=0 --match "v*" 2>/dev/null || echo "v0.0.0")
LAST_VERSION := $(shell echo $(LAST_TAG) | sed 's/^v//')

# Count commits since last tag
COMMITS_SINCE_TAG := $(shell git rev-list $(LAST_TAG)..HEAD --count 2>/dev/null || echo "0")

# Calculate next patch version
NEXT_PATCH := $(shell echo $(LAST_VERSION) | awk -F. '{printf "%d.%d.%d", $$1, $$2, $$3+1}')

# Build timestamp (ISO 8601 date only)
BUILD_DATE := $(shell date -u +%Y-%m-%d)

# Version logic: RELEASE_VERSION env var takes precedence, else RC
VERSION := $(if $(RELEASE_VERSION),$(RELEASE_VERSION),$(NEXT_PATCH)-rc.$(COMMITS_SINCE_TAG))
FULL_VERSION := $(VERSION)+$(GIT_SHA_SHORT)

version: ## Output version string
	@echo "$(FULL_VERSION)"

version-info: ## Output all version components as env vars
	@echo "RELEASE_VERSION=$(FULL_VERSION)"
	@echo "RELEASE_DATE=$(BUILD_DATE)"
	@echo "COMMIT_SHA=$(GIT_SHA)"
	@echo "IS_RELEASE=$(if $(RELEASE_VERSION),true,false)"
	@echo "SHORT_VERSION=$(VERSION)"

# ============================================================================
# RELEASE NOTES — every docs/releases/<name>.md as a one-page A4 PDF beside it (docs/releases/<name>.pdf, gitignored)
# ============================================================================
.PHONY: release-notes

# Per notes file: GitHub renders the markdown (gh api /markdown, gfm; -F reads the file, -f would send the literal
# "@path"), docs/releases/poster.head.html carries the stylesheet, the print scaling and the BASE_HREF placeholder,
# replaced with the file URL of docs/releases/ so the pictures in docs/releases/<name>/ resolve, and Playwright prints
# the page from .output (gitignored); --wait-for-timeout gives the stylesheet and the icons on cdnjs/iconify time to load
RELEASE_NOTES_HEAD := docs/releases/poster.head.html
RELEASE_NOTES_OUT := .output/release-notes
RELEASE_NOTES := $(wildcard docs/releases/*.md)

release-notes: ## Render every docs/releases/<name>.md to docs/releases/<name>.pdf (A4, one page)
	@test -f "$(RELEASE_NOTES_HEAD)" || { echo "make $@: no poster head at $(RELEASE_NOTES_HEAD)"; exit 1; }
	@mkdir -p "$(RELEASE_NOTES_OUT)"; for md in $(RELEASE_NOTES); do \
		name=$$(basename "$$md" .md); html="$(RELEASE_NOTES_OUT)/$$name.html"; \
		{ sed 's|BASE_HREF|file://$(CURDIR)/docs/releases/|' "$(RELEASE_NOTES_HEAD)" && \
		  gh api /markdown -X POST -f mode=gfm -F text=@"$$md" && \
		  printf '\n</article>\n</body>\n</html>\n'; } > "$$html" && \
		npx playwright pdf --paper-format A4 --wait-for-timeout 3000 "file://$(CURDIR)/$$html" "docs/releases/$$name.pdf" || exit 1; \
	done
	@if [ -n "$(RELEASE_NOTES)" ]; then ls -l $(RELEASE_NOTES:.md=.pdf); else echo "no release notes in docs/releases/"; fi

# ============================================================================
# DEPLOYMENT & LOGS
# ============================================================================
# Workers: "theslope" = the Nuxt app (root wrangler.toml); every other worker is a Nitro app in workers/<name>/
WORKERS := sender
worker_cfg = workers/$(1)/wrangler.toml

.PHONY: deploy-dev deploy-prod logs-dev logs-prod deploy-theslope-dev deploy-theslope-prod \
        run-sender-local deploy-sender-dev deploy-sender-prod logs-sender-dev logs-sender-prod typegen

# Deploy macro: $(1)=npm script, $(2)=environment name
# Uses env vars if set (CI), otherwise calculates via version-info (local)
# Version env for a deploy (baked into every worker's health report): CI-provided vars, else version-info. $(1)=command
define with_version
	@if [ -z "$$NUXT_PUBLIC_RELEASE_VERSION" ]; then eval $$(make version-info); fi && \
	GITHUB_SHA=$${GITHUB_SHA:-$$COMMIT_SHA} \
	NUXT_PUBLIC_RELEASE_VERSION=$${NUXT_PUBLIC_RELEASE_VERSION:-$$RELEASE_VERSION} \
	NUXT_PUBLIC_RELEASE_DATE=$${NUXT_PUBLIC_RELEASE_DATE:-$$RELEASE_DATE} \
	$(1)
endef

define deploy_to
	$(call with_version,npm run $(1) && echo "Deployed version $${NUXT_PUBLIC_RELEASE_VERSION:-$$RELEASE_VERSION} to $(2).")
endef

# Nitro worker macros: $(1)=worker, $(2)=env — same artefact shape as the app (.output/server/index.mjs)
define worker_deploy
	$(call with_version,npx nitro build --dir workers/$(1) && npx wrangler deploy -c $(call worker_cfg,$(1)) --env $(2) && echo "Deployed theslope-$(1) version $${NUXT_PUBLIC_RELEASE_VERSION:-$$RELEASE_VERSION} to $(2).")
endef
define worker_tail
	@npx wrangler tail -c $(call worker_cfg,$(1)) --env $(2) --format pretty
endef

deploy-theslope-dev: ## Deploy the app to dev with version info
	$(call deploy_to,deploy,dev)

deploy-theslope-prod: ## Deploy the app to prod with version info
	$(call deploy_to,deploy:prod,prod)

run-sender-local: ## Run theslope-sender locally (miniflare, port 3100 from its wrangler.toml [dev] block)
	@npx nitro build --dir workers/sender && npx wrangler dev -c $(call worker_cfg,sender)

deploy-sender-dev: ## Build + deploy theslope-sender to dev
	$(call worker_deploy,sender,dev)

deploy-sender-prod: ## Build + deploy theslope-sender to prod
	$(call worker_deploy,sender,prod)

# CI entry points — names unchanged. Prerequisites run in order: consumers first, the app (producer) last.
deploy-dev: $(foreach w,$(WORKERS),deploy-$(w)-dev) deploy-theslope-dev ## Deploy ALL workers to dev
deploy-prod: $(foreach w,$(WORKERS),deploy-$(w)-prod) deploy-theslope-prod ## Deploy ALL workers to prod

logs-dev: ## Tail app logs (dev)
	@npx wrangler tail theslope --env dev --format pretty

logs-prod: ## Tail app logs (prod)
	@npx wrangler tail theslope --env prod --format pretty

logs-sender-dev: ## Tail theslope-sender logs (dev)
	$(call worker_tail,sender,dev)

logs-sender-prod: ## Tail theslope-sender logs (prod)
	$(call worker_tail,sender,prod)

typegen: ## Regenerate wrangler binding typings for every worker from wrangler.toml alone (root + workers/*)
	@CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false npx wrangler types shared/types/worker-configuration.d.ts && $(foreach w,$(WORKERS),CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false npx wrangler types workers/$(w)/worker-configuration.d.ts -c $(call worker_cfg,$(w)) &&) true

# ============================================================================
# SENDER EVENTS — trigger a notification event on an environment (the cron twins' pattern, via theslope_call)
# ============================================================================
.PHONY: theslope-sender-event-test-local theslope-sender-event-test-dev theslope-sender-event-test-prod \
        theslope-sender-event-monthly-billing-local theslope-sender-event-monthly-billing-dev theslope-sender-event-monthly-billing-prod queues-info-dev queues-info-prod \
        theslope-sender-dry-run-booking-status-local theslope-sender-dry-run-booking-status-dev theslope-sender-dry-run-booking-status-prod

# $(1)=env file. The mail goes to the environment's admin mailbox
define theslope_sender_event_test
	$(call theslope_call,$(1),-X POST "$$BASE_URL/api/admin/sender/event/test")
endef

theslope-sender-event-test-local: ## Test event on localhost (lands in the miniflare queue sink)
	$(call theslope_sender_event_test,$(ENV_local))

theslope-sender-event-test-dev: ## Test event on dev → real mail from Skråningen dev <no-reply.dev@skraaningen.dk>
	$(call theslope_sender_event_test,$(ENV_dev))

theslope-sender-event-test-prod: ## Test event on prod → real mail from Skråningen prod <no-reply@skraaningen.dk>
	$(call theslope_sender_event_test,$(ENV_prod))

# $(1)=env file; bpid=<billingPeriodSummaryId> — the numeric id from GET /api/admin/billing/periods
define theslope_sender_event_monthly_billing
	@case "$(bpid)" in ''|*[!0-9]*) echo "usage: make $@ bpid=<billingPeriodSummaryId> (numeric id, see GET /api/admin/billing/periods)"; exit 1;; esac
	$(call theslope_call,$(1),-X POST "$$BASE_URL/api/admin/sender/event/monthly-billing" -d "{\"billingPeriodSummaryId\":$(bpid)}")
endef

theslope-sender-event-monthly-billing-local: ## Re-send the accountant mail for a period on localhost (miniflare queue sink) — bpid=<billingPeriodSummaryId>
	$(call theslope_sender_event_monthly_billing,$(ENV_local))

theslope-sender-event-monthly-billing-dev: ## Re-send the accountant mail for a period on dev → real mail, CSV attached — bpid=<billingPeriodSummaryId>
	$(call theslope_sender_event_monthly_billing,$(ENV_dev))

theslope-sender-event-monthly-billing-prod: ## Re-send the accountant mail for a period on prod — bpid=<billingPeriodSummaryId>
	$(call theslope_sender_event_monthly_billing,$(ENV_prod))

# $(1)=env file. The delivery dry run: per user, the booking notifications the next run sends
define theslope_sender_dry_run_booking_status
	$(call theslope_call,$(1),"$$BASE_URL/api/admin/sender/delivery?dryRun=BOOKING_STATUS")
endef

theslope-sender-dry-run-booking-status-local: ## Delivery dry run of the active season's booking notifications on localhost
	$(call theslope_sender_dry_run_booking_status,$(ENV_local))

theslope-sender-dry-run-booking-status-dev: ## Delivery dry run of the active season's booking notifications on dev
	$(call theslope_sender_dry_run_booking_status,$(ENV_dev))

theslope-sender-dry-run-booking-status-prod: ## Delivery dry run of the active season's booking notifications on prod
	$(call theslope_sender_dry_run_booking_status,$(ENV_prod))

queues-info-dev: ## Backlog of the dev sender queue
	@npx wrangler queues info theslope-sender-dev

queues-info-prod: ## Backlog of the prod sender queue
	@npx wrangler queues info theslope-sender-prod

# ============================================================================
# THESLOPE API
# ============================================================================
.PHONY: theslope-login-local theslope-login-dev theslope-login-prod theslope-admin-get-households theslope-admin-import theslope-put-user

theslope-login-local: ## Login to localhost
	@$(call require_base_url,$(ENV_local)) && curl -s -c .cookies.txt "$$BASE_URL/api/auth/login" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq

theslope-login-dev: ## Login to dev
	@$(call require_base_url,$(ENV_dev)) && curl -s -c .cookies.txt "$$BASE_URL/api/auth/login" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq

theslope-login-prod: ## Login to prod
	@$(call require_base_url,$(ENV_prod)) && curl -s -c .cookies.txt "$$BASE_URL/api/auth/login" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq

theslope-admin-get-households:
	@$(call require_base_url,$(ENV_local)) && curl -s -b .cookies.txt $$BASE_URL/api/admin/household | jq

theslope-admin-import:
	@$(call require_base_url,$(ENV_local)) && curl -s -b .cookies.txt $$BASE_URL/api/admin/heynabo/import | jq

theslope-put-user:
	@$(call require_base_url,$(ENV_local)) && curl -b .cookies.txt -X PUT "$$BASE_URL/api/admin/users" \
		--url-query "email=andemad@andeby.dk" \
		--url-query "phone=+4512345678" \
		--url-query "systemRole=ADMIN" \
		-H "Content-Type: application/json" -d '{"role": "admin"}' | jq

# ============================================================================
# ORDER IMPORT (Billing CSV)
# ============================================================================
.PHONY: theslope-import-orders-local theslope-import-orders-dev theslope-import-orders-prod

# $(1)=env file, $(2)=CSV
define theslope_import_orders
	$(call require_file,csv,$(2))
	$(call theslope_call,$(1),-X POST "$$BASE_URL/api/admin/billing/import" -d "{\"csvContent\": $$(cat $(2) | jq -Rs .)}")
endef

theslope-import-orders-local: ## Import a billing CSV to localhost - csv=<file>
	$(call theslope_import_orders,$(ENV_local),$(csv))

theslope-import-orders-dev: ## Import a billing CSV to dev - csv=<file>
	$(call theslope_import_orders,$(ENV_dev),$(csv))

theslope-import-orders-prod: ## Import a billing CSV to production - csv=<file>
	$(call theslope_import_orders,$(ENV_prod),$(csv))

# ============================================================================
# SEASON IMPORT (Calendar + Teams CSV)
# ============================================================================
.PHONY: theslope-import-season-local theslope-import-season-dev theslope-import-season-prod

# $(1)=env file, $(2)=calendar CSV, $(3)=teams CSV
define theslope_import_season
	$(call require_file,calendar,$(2))
	$(call require_file,teams,$(3))
	$(call theslope_call,$(1),-X POST "$$BASE_URL/api/admin/season/import" -d "{\"calendarCsv\": $$(cat $(2) | jq -Rs .)$(COMMA) \"teamsCsv\": $$(cat $(3) | jq -Rs .)}")
endef

theslope-import-season-local: ## Import a season to localhost - calendar=<file> teams=<file>
	$(call theslope_import_season,$(ENV_local),$(calendar),$(teams))

theslope-import-season-dev: ## Import a season to dev - calendar=<file> teams=<file>
	$(call theslope_import_season,$(ENV_dev),$(calendar),$(teams))

theslope-import-season-prod: ## Import a season to production - calendar=<file> teams=<file>
	$(call theslope_import_season,$(ENV_prod),$(calendar),$(teams))

# ============================================================================
# SEASON TEAMS EXPORT (teams CSV in the season importer's format)
# ============================================================================
.PHONY: theslope-export-teams

# GET /api/admin/team → team,role,name,affinity. The full name matches the importer exactly; a member's affinity becomes
# the importer's weekday abbreviation when it holds exactly one weekday
TEAMS_EXPORT_JQ = if type != "array" then error("no teams for the active season: \(.)") else ("team,role,name,affinity", (.[] | (.name | capture("(?<n>[0-9]+)").n) as $$n | .assignments | sort_by(.role, .inhabitant.name)[] | ["Madhold " + $$n, .role, .inhabitant.name + " " + .inhabitant.lastName, ((.affinity // {}) | with_entries(select(.value)) | keys | if length == 1 then ({"mandag": "man", "tirsdag": "tirs", "onsdag": "ons", "torsdag": "tors"}[.[0]] // "") else "" end)] | @csv)) end

# The season is the active one (GET /api/admin/season/active), read after the login
theslope-export-teams: ## Export the active season's team members as a teams CSV - env=local|dev|prod out=<file>
	@test -n "$(ENV_$(env))" -a -n "$(out)" || { echo "usage: make $@ env=local|dev|prod out=<file>"; exit 1; }
	$(call theslope_call,$(ENV_$(env)),"$$BASE_URL/api/admin/team?seasonId=$$(curl -s -b .cookies.txt "$$BASE_URL/api/admin/season/active")") | jq -r '$(TEAMS_EXPORT_JQ)' > $(out)
	@echo "$$(($$(wc -l < $(out)) - 1)) members → $(out)"

# ============================================================================
# REGENERATE DINNER EVENTS (reconcile with season config - fixes stale holiday events)
# ============================================================================
# Usage: make regen-dinner-events-prod sid=2
.PHONY: regen-dinner-events-local regen-dinner-events-dev regen-dinner-events-prod

regen-dinner-events-local: ## Regenerate dinner events (local) - sid=seasonId
	$(call theslope_call,$(ENV_local),-X POST "$$BASE_URL/api/admin/season/$(sid)/generate-dinner-events")

regen-dinner-events-dev: ## Regenerate dinner events (dev) - sid=seasonId
	$(call theslope_call,$(ENV_dev),-X POST "$$BASE_URL/api/admin/season/$(sid)/generate-dinner-events")

regen-dinner-events-prod: ## Regenerate dinner events (prod) - sid=seasonId
	$(call theslope_call,$(ENV_prod),-X POST "$$BASE_URL/api/admin/season/$(sid)/generate-dinner-events")

# ============================================================================
# HEYNABO API
# ============================================================================
.PHONY: heynabo-login heynabo-get-events heynabo-get-event heynabo-patch-event heynabo-delete-event heynabo-upload-image heynabo-get-locations heynabo-get-nhbrs

heynabo-login-dev: ## Login to HeyNabo (prints token)
	@source $(ENV_dev) && curl -s -X POST "$$NUXT_PUBLIC_HEY_NABO_API/login" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq

heynabo-login-prod: ## Login to HeyNabo (prints token)
	@source $(ENV_prod) && curl -s -X POST "$$NUXT_PUBLIC_HEY_NABO_API/login" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq

heynabo-get-events-dev: ## List all events
	$(call heynabo_call,$(ENV_local),"$$NUXT_PUBLIC_HEY_NABO_API/members/events/")

heynabo-get-event-dev: ## Get event (EVENT_ID=xxx)
	$(call heynabo_call,$(ENV_local),"$$NUXT_PUBLIC_HEY_NABO_API/members/events/$(EVENT_ID)")

heynabo-patch-event-dev: ## Update event status (EVENT_ID=xxx)
	@source $(ENV_local) && \
		HEY_TOKEN=$$(curl -s -X POST "$$NUXT_PUBLIC_HEY_NABO_API/login" -H "Content-Type: application/json" \
			-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq -r '.token') && \
		curl -s -X PATCH "$$NUXT_PUBLIC_HEY_NABO_API/members/events/$(EVENT_ID)" \
			-H "Content-Type: application/json" -H "Authorization: Bearer $$HEY_TOKEN" \
			-d '{"status": "CANCELED"}' | jq

heynabo-delete-event-dev: ## Delete event (EVENT_ID=xxx)
	@source $(ENV_local) && \
		HEY_TOKEN=$$(curl -s -X POST "$$NUXT_PUBLIC_HEY_NABO_API/login" -H "Content-Type: application/json" \
			-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq -r '.token') && \
		curl -s -X DELETE "$$NUXT_PUBLIC_HEY_NABO_API/members/events/$(EVENT_ID)" \
			-H "Authorization: Bearer $$HEY_TOKEN" | jq

heynabo-upload-image-dev: ## Upload image to event (EVENT_ID=xxx)
	@source $(ENV_local) && \
		HEY_TOKEN=$$(curl -s -X POST "$$NUXT_PUBLIC_HEY_NABO_API/login" -H "Content-Type: application/json" \
			-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq -r '.token') && \
		curl -v -X POST "$$NUXT_PUBLIC_HEY_NABO_API/members/events/$(EVENT_ID)/files" \
			-H "Authorization: Bearer $$HEY_TOKEN" -F "file=@public/fællesspisning_0.jpeg"

heynabo-get-locations-dev: ## List all locations (dev)
	$(call heynabo_call,$(ENV_local),"$$NUXT_PUBLIC_HEY_NABO_API/members/locations/")

heynabo-get-locations-prod: ## List all locations (prod)
	$(call heynabo_call,$(ENV_prod),"$$NUXT_PUBLIC_HEY_NABO_API/members/locations/")

heynabo-get-nhbrs-dev: ## List all neighbors (dev)
	$(call heynabo_call,$(ENV_local),"$$NUXT_PUBLIC_HEY_NABO_API/members/users/")

heynabo-get-nhbrs-prod: ## List all neighbors (prod) - uses /admin/users/ matching import client
	$(call heynabo_call,$(ENV_prod),"$$NUXT_PUBLIC_HEY_NABO_API/admin/users/")

heynabo-nuke-test-events: ## Nuke all test events from Heynabo (patterns: Test Menu-, Updated Delicious Pasta-)
	$(call theslope_call,$(ENV_local),-X POST "$$BASE_URL/api/test/heynabo/cleanup" -d '{"nuke": true}')

# ============================================================================
# UTILITIES
# ============================================================================
.PHONY: generate-session-secret

generate-session-secret: ## Generate a session secret
	@openssl rand -base64 32

.env.example:
	@cat .env | sed 's/=.*$$/=/g' > .env.example

# ============================================================================
# CLAUDE MODES - each mode starts its agent from .claude/agents/
# ============================================================================
.PHONY: claude-senior-dev claude-test claude-adr claude-ux claude-doc claude-pair claude-devops claude-code-review claude-orchestrator

claude-senior-dev: ## Claude as senior dev
	@claude --agent nuxt-typescript-developer

claude-test: ## Claude as test engineer
	@claude --agent test-automation-engineer

claude-adr: ## Claude as architect
	@claude --agent senior-architect

claude-ux: ## Claude as UX designer
	@claude --agent frontend-engineer

claude-doc: ## Claude as documentar
	@claude --agent documentar

claude-pair: ## Claude as pair programmer
	@claude --agent tdd-pair-programmer

claude-devops: ## Claude as DevOps engineer
	@claude --agent devops-engineer

claude-code-review: ## Claude PR review against ADRs
	@claude --agent documentar "/code-review"

claude-orchestrator: ## Claude orchestrator for multi-agent collaboration
	@claude --agent senior-architect --append-system-prompt "You are in charge of peer sesssions, use the /orchestrator skill to interact with the human Architect, and my sure what is produced lives up to the standards /dry, and is adr compliant"
