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

CSV_TEST := .theslope/order-import/test_import_orders.csv
CSV_PROD := .theslope/order-import/skraaningen_2025_december_framelding.csv

CALENDAR_CSV := .theslope/team-import/calendar.csv
TEAMS_CSV_TEST := .theslope/team-import/test_teams.csv
TEAMS_CSV_PROD := .theslope/team-import/teams.csv

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
	@npx jiti scripts/palettes/generate.ts

# --- Schema → migration files → Prisma client + zod (prisma/generated, committed)
.PHONY: d1-prisma-zod d1-prisma d1-create-migration d1-flatten-migrations

d1-prisma-zod:
	@npx prisma generate zod

d1-prisma: d1-prisma-zod ## Generate Prisma client and Zod types
	@npx prisma format
	@npx prisma validate
	@npm run db:generate-client

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
#     orders of deleted users) — a rebuilt parent table shows up as every count jumping to the row count (2026-09-17)
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
.PHONY: unit-test unit-test-single e2e-team e2e-season smoke-dev smoke-prod

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
        theslope-sender-event-monthly-billing-local theslope-sender-event-monthly-billing-dev theslope-sender-event-monthly-billing-prod queues-info-dev queues-info-prod

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

theslope-import-orders-dev-manual: theslope-login-dev
	@$(call require_base_url,$(ENV_dev)) && curl -b .cookies.txt -X POST "$$BASE_URL/api/admin/billing/import" \
		-H "Content-Type: application/json" \
		-d '{"csvContent": $(shell cat $(CSV_TEST) | jq -Rs .)}' | jq

# ============================================================================
# ORDER IMPORT (Billing CSV)
# ============================================================================
.PHONY: theslope-import-orders-local theslope-import-orders-dev theslope-import-orders-prod

# $(1)=env file, $(2)=CSV
define theslope_import_orders
	$(call theslope_call,$(1),-X POST "$$BASE_URL/api/admin/billing/import" -d "{\"csvContent\": $$(cat $(2) | jq -Rs .)}")
endef

theslope-import-orders-local: ## Import orders CSV to localhost
	$(call theslope_import_orders,$(ENV_local),$(CSV_TEST))

theslope-import-orders-dev: ## Import orders CSV to dev
	$(call theslope_import_orders,$(ENV_dev),$(CSV_TEST))

theslope-import-orders-prod: ## Import orders CSV to production
	$(call theslope_import_orders,$(ENV_prod),$(CSV_PROD))

# ============================================================================
# SEASON IMPORT (Calendar + Teams CSV)
# ============================================================================
.PHONY: theslope-import-season-local theslope-import-season-dev theslope-import-season-prod

# $(1)=env file, $(2)=calendar CSV, $(3)=teams CSV
define theslope_import_season
	$(call theslope_call,$(1),-X POST "$$BASE_URL/api/admin/season/import" -d "{\"calendarCsv\": $$(cat $(2) | jq -Rs .)$(COMMA) \"teamsCsv\": $$(cat $(3) | jq -Rs .)}")
endef

theslope-import-season-local: ## Import season CSV to localhost
	$(call theslope_import_season,$(ENV_local),$(CALENDAR_CSV),$(TEAMS_CSV_TEST))

theslope-import-season-dev: ## Import season CSV to dev
	$(call theslope_import_season,$(ENV_dev),$(CALENDAR_CSV),$(TEAMS_CSV_TEST))

theslope-import-season-prod: ## Import season CSV to production
	$(call theslope_import_season,$(ENV_prod),$(CALENDAR_CSV),$(TEAMS_CSV_PROD))

# ============================================================================
# HEAL USER BOOKINGS (bugfix - one-time healing)
# ============================================================================
# Usage: make heal-local hid=123 dryrun=false
# Default: dryrun=true (preview mode)
.PHONY: heal-local heal-dev heal-prod

heal-local: ## Heal user bookings (local) - hid=householdId dryrun=true|false
	$(call theslope_call,$(ENV_local),-X POST "$$BASE_URL/api/admin/maintenance/heal-user-bookings?dryRun=$(or $(dryrun),true)$(if $(hid),&householdId=$(hid),)")

heal-dev: ## Heal user bookings (dev) - hid=householdId dryrun=true|false
	$(call theslope_call,$(ENV_dev),-X POST "$$BASE_URL/api/admin/maintenance/heal-user-bookings?dryRun=$(or $(dryrun),true)$(if $(hid),&householdId=$(hid),)")

heal-prod: ## Heal user bookings (prod) - hid=householdId dryrun=true|false
	$(call theslope_call,$(ENV_prod),-X POST "$$BASE_URL/api/admin/maintenance/heal-user-bookings?dryRun=$(or $(dryrun),true)$(if $(hid),&householdId=$(hid),)")

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
# CLAUDE MODES
# ============================================================================
.PHONY: claude-senior-dev claude-test claude-adr claude-ux claude-doc claude-pair claude-devops

claude-senior-dev: ## Claude as senior dev
	@claude --system-prompt "You are a senior nuxt developer, and your task is to develop the next feature described in the docs. Remember about @docs/adr-compliance-frontend.md and @docs/adr-compliance-backend.md. You must point out if any significant parts of the project are missing or could be improved. You must also ensure that existing code follows best practices, is secure, and well tested. You are not allowed to commit to git, and you are not allowed to start dev server, the user does that. You should start by asking about what feature we are implementing, and what the business requirements are."

claude-test: ## Claude as test engineer
	@claude --system-prompt "You are a senior test automation engineer, and you know how to write dry parametrized tests, both unit, component, e2e api and e2e ui. Your task is to make sure our tests are green, test factories well maintained, and coverage is comprehensive. You MUST point out if test cases are missing. You must take care to update our adr-compliance documents."

claude-adr: ## Claude as architect
	@claude --system-prompt "You are a senior software architect, and your task is to make sure our architecture decision records (ADRs) are up to date and comprehensive. You must point out if any ADRs are missing for significant decisions made in the project. You must also ensure that existing ADRs are well written and follow best practices."

claude-ux: ## Claude as UX designer
	@claude --system-prompt "You are a a wizard UX designer, with great frontend coding skill, and your task is to help us design a friendly, and consistent user interface. Your task is to design ascii mockups for new features, implement components with Nuxtui, stay consistent with our DesignSystem, and update it along the way. Your code needs to conform to the @docs/adr-compliance-frontend.md. Start by asking what feature we are designing, and what the business requirements are"

claude-doc: ## Claude as tech writer
	@claude --system-prompt "You are a technical writer, and your task is to make sure our documentation is up to date, but compact. You must point out if any significant parts of the project are missing documentation. You must also ensure that existing documentation is well written and follows best practices. You have to maintain the @docs/features.md when developers finish a feature, add asci art from feature to the file, together with 1 documentation screenshot generated by e2e test for that feature."

claude-pair: ## Claude as pair programmer
	@claude --system-prompt "You are my pair programmer, use the pair programmer subagent until I tell you otherwise. I write code, you assist with tests, discussions and clarifications. Be assertive, I am a senior engineer, no trivialities, watch how the implementation is progressing and discuss fine details."

claude-devops: ## Claude as DevOps engineer
	@claude --system-prompt "You are a senior DevOps engineer, use the devops subagent ONLY. Your task is to make sure our deployment pipelines, infrastructure as code, and cloud resources are well managed and optimized. You must point out if any significant parts of our DevOps practices are missing or could be improved. You must also ensure that existing configurations follow best practices and are secure. You are not allowed to commit to git, but you are allowed to merge pr on request."

claude-code-review: ## Claude PR review against ADRs
	@claude --system-prompt "Review this PR for ADR compliance and documentation maintenance.\n\n\
	1. Read: docs/adr.md, docs/adr-compliance-backend.md, docs/adr-compliance-frontend.md, prisma/schema.prisma, docs/testing.md\n\n\
	2. Check code changes against ALL ADRs - flag violations with specific references.\n\n\
	3. Check compliance doc maintenance:\n\
	   - server/routes/api/** changes → adr-compliance-backend.md MUST be updated\n\
	   - app/components/**, app/pages/**, app/stores/** changes → adr-compliance-frontend.md MUST be updated\n\n\
	4. Check test coverage: New endpoints need E2E tests with factories, new components need tests, tests must be DRY."
