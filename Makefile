#!/usr/bin/env make
# Environment: .env.* locally, CI/CD provides env vars directly
SHELL := /bin/bash

# ============================================================================
# ENVIRONMENT CONFIGS
# ============================================================================
ENV_local := .env
ENV_dev   := .env.dev
ENV_prod  := .env.prod

URL_local := http://localhost:3000
URL_dev   := https://dev.skraaningen.dk
URL_prod  := https://skraaningen.dk

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

define theslope_call
	@source $(1) && curl -s -c .cookies.txt "$(2)/api/auth/login" -H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq -e '.email' > /dev/null && \
	curl -s -b .cookies.txt -H "Content-Type: application/json" $(3) | jq
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
# PRISMA & MIGRATIONS
# ============================================================================
.PHONY: prisma-to-zod d1-prisma prisma-create-migration prisma-flatten-migrations

prisma-to-zod:
	@npx prisma generate zod

d1-prisma: prisma-to-zod ## Generate Prisma client and Zod types
	@npx prisma format
	@npx prisma validate
	@npm run db:generate-client

prisma-create-migration: ## Create migration (name=xxx)
	@echo "📝 Creating new Prisma migration..."
	@npx prisma migrate dev --name $(name) --create-only
	@echo "✅ Migration created in prisma/migrations/"
	@$(MAKE) prisma-flatten-migrations

prisma-flatten-migrations:
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

# ============================================================================
# DATABASE MIGRATIONS
# ============================================================================
.PHONY: d1-migrate-local d1-migrate-dev d1-migrate-prod d1-migrate-all

d1-migrate-local: ## Migrate + seed local database
	@echo "🏗️ Applying migrations to local database"
	@npm run db:migrate:local
	@npm run db:seed:all:local

d1-migrate-dev: ## Migrate + seed dev database
	@echo "🏗️ Applying migrations to dev database"
	@npm run db:migrate:dev
	@npm run db:seed:all:dev

d1-migrate-prod: ## Migrate + seed production database
	@echo "🏗️ Applying migrations to production database"
	@npm run db:migrate:prod
	@npm run db:seed:all:prod

d1-migrate-all: d1-migrate-local d1-migrate-dev d1-migrate-prod
	@echo "✅ Applied migrations to all databases"

# ============================================================================
# DATABASE SEEDING
# ============================================================================
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


# ============================================================================
# DATABASE QUERIES
# ============================================================================
.PHONY: d1-list-users-local d1-list-tables d1-list-tables-local d1-nuke-seasons d1-nuke-households d1-nuke-users d1-nuke-allergytypes d1-nuke-all

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

d1-nuke-all: d1-nuke-seasons d1-nuke-households d1-nuke-users d1-nuke-allergytypes ## Nuke all test data from local database
	@echo "✅ Nuked all test data!"

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
.PHONY: deploy-dev deploy-prod logs-dev logs-prod

# Deploy macro: $(1)=npm script, $(2)=environment name
# Uses env vars if set (CI), otherwise calculates via version-info (local)
define deploy_to
	@if [ -z "$$NUXT_PUBLIC_RELEASE_VERSION" ]; then eval $$(make version-info); fi && \
	GITHUB_SHA=$${GITHUB_SHA:-$$COMMIT_SHA} \
	NUXT_PUBLIC_RELEASE_VERSION=$${NUXT_PUBLIC_RELEASE_VERSION:-$$RELEASE_VERSION} \
	NUXT_PUBLIC_RELEASE_DATE=$${NUXT_PUBLIC_RELEASE_DATE:-$$RELEASE_DATE} \
	npm run $(1) && \
	echo "Deployed version $${NUXT_PUBLIC_RELEASE_VERSION:-$$RELEASE_VERSION} to $(2)."
endef

deploy-dev: ## Deploy to dev with version info
	$(call deploy_to,deploy,dev)

deploy-prod: ## Deploy to prod with version info
	$(call deploy_to,deploy:prod,prod)

logs-dev: ## Tail dev logs
	@npx wrangler tail theslope --env dev --format pretty

logs-prod: ## Tail prod logs
	@npx wrangler tail theslope --env prod --format pretty

# ============================================================================
# THESLOPE API
# ============================================================================
.PHONY: theslope-login-local theslope-login-dev theslope-login-prod theslope-admin-get-households theslope-admin-import theslope-put-user

theslope-login-local: ## Login to localhost
	@source $(ENV_local) && curl -s -c .cookies.txt "$(URL_local)/api/auth/login" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq

theslope-login-dev: ## Login to dev
	@source $(ENV_dev) && curl -s -c .cookies.txt "$(URL_dev)/api/auth/login" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq

theslope-login-prod: ## Login to prod
	@source $(ENV_prod) && curl -s -c .cookies.txt "$(URL_prod)/api/auth/login" \
		-H "Content-Type: application/json" \
		-d "{\"email\":\"$$HEY_NABO_USERNAME\",\"password\":\"$$HEY_NABO_PASSWORD\"}" | jq

theslope-admin-get-households:
	@curl -s -b .cookies.txt $(URL_local)/api/admin/household | jq

theslope-admin-import:
	@curl -s -b .cookies.txt $(URL_local)/api/admin/heynabo/import | jq

theslope-put-user:
	@curl -b .cookies.txt -X PUT "$(URL_local)/api/admin/users" \
		--url-query "email=andemad@andeby.dk" \
		--url-query "phone=+4512345678" \
		--url-query "systemRole=ADMIN" \
		-H "Content-Type: application/json" -d '{"role": "admin"}' | jq

theslope-import-orders-dev-manual: theslope-login-dev
	@curl -b .cookies.txt -X POST "$(URL_local)/api/admin/billing/import" \
		-H "Content-Type: application/json" \
		-d '{"csvContent": $(shell cat $(CSV_TEST) | jq -Rs .)}' | jq

# ============================================================================
# ORDER IMPORT (Billing CSV)
# ============================================================================
.PHONY: theslope-import-orders-local theslope-import-orders-dev theslope-import-orders-prod

define theslope_import_orders
	$(call theslope_call,$(1),$(2),-X POST "$(2)/api/admin/billing/import" -d "{\"csvContent\": $$(cat $(3) | jq -Rs .)}")
endef

theslope-import-orders-local: ## Import orders CSV to localhost
	$(call theslope_import_orders,$(ENV_local),$(URL_local),$(CSV_TEST))

theslope-import-orders-dev: ## Import orders CSV to dev
	$(call theslope_import_orders,$(ENV_dev),$(URL_dev),$(CSV_TEST))

theslope-import-orders-prod: ## Import orders CSV to production
	$(call theslope_import_orders,$(ENV_prod),$(URL_prod),$(CSV_PROD))

# ============================================================================
# SEASON IMPORT (Calendar + Teams CSV)
# ============================================================================
.PHONY: theslope-import-season-local theslope-import-season-dev theslope-import-season-prod

define theslope_import_season
	$(call theslope_call,$(1),$(2),-X POST "$(2)/api/admin/season/import" -d "{\"calendarCsv\": $$(cat $(3) | jq -Rs .)$(COMMA) \"teamsCsv\": $$(cat $(4) | jq -Rs .)}")
endef

theslope-import-season-local: ## Import season CSV to localhost
	$(call theslope_import_season,$(ENV_local),$(URL_local),$(CALENDAR_CSV),$(TEAMS_CSV_TEST))

theslope-import-season-dev: ## Import season CSV to dev
	$(call theslope_import_season,$(ENV_dev),$(URL_dev),$(CALENDAR_CSV),$(TEAMS_CSV_TEST))

theslope-import-season-prod: ## Import season CSV to production
	$(call theslope_import_season,$(ENV_prod),$(URL_prod),$(CALENDAR_CSV),$(TEAMS_CSV_PROD))

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

heynabo-nuke-test-events: ## Nuke all test events from Heynabo (patterns: Test Menu-, Updated Delicious Pasta-)
	$(call theslope_call,$(ENV_local),$(URL_local),-X POST "$(URL_local)/api/test/heynabo/cleanup" -d '{"nuke": true}')

# ============================================================================
# TESTING
# ============================================================================
.PHONY: unit-test unit-test-single e2e-team e2e-season

unit-test: ## Run all unit tests
	@npx vitest --run

unit-test-single: ## Run single test (name=pattern)
	@npx vitest --run --testNamePattern=$(name)

e2e-team: ## Run team E2E tests
	@npx playwright test tests/e2e/api/admin/team.e2e.spec.ts --reporter=line

e2e-season: ## Run season E2E tests
	@npx playwright test tests/e2e/api/admin/season.e2e.spec.ts --reporter=line

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
