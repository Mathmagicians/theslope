#! /usr/bin/env bash
# change .env, .env.test, .env.prod to access localhost, dev, prod system
include .env
export

.PHONY: heynabo-print-token heynabo-api heynabo-get-locations heynabo-get-nhbrs heynabo-get-admin heynabo

export HEY_TOKEN?="$(shell curl -s -X POST $(HEY_NABO_API)/login  -H "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)"}' | jq .'token')"

prisma-to-zod:
	@npx prisma generate zod

d1-prisma: prisma-to-zod
	@npx prisma format
	@npx prisma validate
	@npm run db:generate-client

prisma-create-migration:
	@echo "📝 Creating new Prisma migration..."
	@npx prisma migrate dev --name $(name) --create-only
	@echo "✅ Migration created in prisma/migrations/"
	@echo "🔄 Flattening for Wrangler..."
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

d1-migrate-local:
	@echo "🏗️ Applying migrations to local database"
	@npm run db:migrate:local
	@npm run db:seed:local

d1-migrate-dev:
	@echo "🏗️ Applying migrations to dev database (theslope --remote)"
	@npm run db:migrate
	@npm run db:seed

d1-migrate-prod:
	@echo "🏗️ Applying migrations to production database"
	@npm run db_prod:migrate
	@npm run db_prod:seed

d1-migrate-all: d1-migrate-local d1-migrate-dev d1-migrate-prod
	@echo "✅ Applied migrations to all databases"

d1-seed-testdata:
	@echo "🧪 Applying test data to local database"
	@npx wrangler d1 execute theslope --file migrations/seed/test-data.sql --local
	@echo "✅ Test data loaded!"

# Master data: Address → PBS ID mapping (from .theslope/, gitignored)
d1-seed-master-data-local:
	@echo "📦 Loading master data (Address → PBS ID) to local database"
	@npx wrangler d1 execute theslope --file .theslope/dev-master-data-households.sql --local
	@echo "✅ Master data loaded (local)!"

d1-seed-master-data-dev:
	@echo "📦 Loading master data (Address → PBS ID) to dev database"
	@npx wrangler d1 execute theslope --file .theslope/dev-master-data-households.sql --env dev --remote
	@echo "✅ Master data loaded (dev)!"

d1-seed-master-data-prod:
	@echo "📦 Loading master data (Address → PBS ID) to prod database"
	@npx wrangler d1 execute theslope-prod --file .theslope/prod-master-data-households.sql --env prod --remote
	@echo "✅ Master data loaded (prod)!"

# Billing: Import orders from CSV (uses active season)
# Usage: make import-orders-local FILE=path/to/file.csv
import-orders-local:
	@echo "📦 Importing orders from $(FILE) to local"
	@curl -b .cookies.txt -X POST "http://localhost:3000/api/admin/billing/import" \
		-H "Content-Type: application/json" \
		-d "{\"csvContent\": $$(cat $(FILE) | jq -Rs .)}" | jq

import-orders-dev:
	@echo "📦 Importing orders from $(FILE) to dev"
	@curl -b .cookies.txt -X POST "https://dev.theslope.dk/api/admin/billing/import" \
		-H "Content-Type: application/json" \
		-d "{\"csvContent\": $$(cat $(FILE) | jq -Rs .)}" | jq

import-orders-prod:
	@echo "📦 Importing orders from $(FILE) to prod"
	@curl -b .cookies.txt -X POST "https://theslope.dk/api/admin/billing/import" \
		-H "Content-Type: application/json" \
		-d "{\"csvContent\": $$(cat $(FILE) | jq -Rs .)}" | jq

d1-list-users-local:
	@npx wrangler d1 execute theslope --command  "SELECT * FROM User" --local

d1-list-tables:
	@npx wrangler d1 execute theslope --command 'PRAGMA table_list' --env dev --remote

d1-list-tables-local:
	@npx wrangler d1 execute theslope --command 'PRAGMA table_list' --local

d1-nuke-seasons:
	@ npx wrangler d1 execute theslope --command="SELECT COUNT(id) FROM Season WHERE shortName LIKE 'Test%'"
	@npx wrangler d1 execute theslope --command="DELETE FROM 'Order';"
	@npx wrangler d1 execute theslope --command="DELETE FROM Season WHERE ShortName LIKE 'Test%';"
	@ npx wrangler d1 execute theslope --command="SELECT COUNT(id) FROM Season WHERE shortName LIKE 'Test%'"

d1-nuke-households:
	@echo "🧹 Cleaning up test households and related data..."
	@echo "📊 Current test household count:"
	@npx wrangler d1 execute theslope --command="SELECT COUNT(id) as count FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%';" --local
	@echo "🗑️  Deleting orders, cooking team assignments, and allergies for test inhabitants..."
	@npx wrangler d1 execute theslope --command="DELETE FROM 'Order' WHERE inhabitantId IN (SELECT id FROM Inhabitant WHERE householdId IN (SELECT id FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%'));" --local
	@npx wrangler d1 execute theslope --command="DELETE FROM CookingTeamAssignment WHERE inhabitantId IN (SELECT id FROM Inhabitant WHERE householdId IN (SELECT id FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%'));" --local
	@npx wrangler d1 execute theslope --command="DELETE FROM Allergy WHERE inhabitantId IN (SELECT id FROM Inhabitant WHERE householdId IN (SELECT id FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%'));" --local
	@echo "🗑️  Deleting test inhabitants..."
	@npx wrangler d1 execute theslope --command="DELETE FROM Inhabitant WHERE householdId IN (SELECT id FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%');" --local
	@echo "🗑️  Deleting test households..."
	@npx wrangler d1 execute theslope --command="DELETE FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%';" --local
	@echo "✅ Cleanup complete!"
	@echo "📊 Remaining test household count:"
	@npx wrangler d1 execute theslope --command="SELECT COUNT(id) as count FROM Household WHERE name LIKE 'Test%' OR address LIKE 'Andeby%';" --local

logs-dev:
	@npx wrangler tail theslope --env dev --format pretty

logs-prod:
	@npx wrangler tail theslope --env prod --format pretty

.env.example:
	@cat .env | sed 's/=.*$$/=/g' > .env.examples

generate-session-secret:
	@openssl rand -base64 32

heynabo-api:
	@echo $(HEY_NABO_API)

heynabo-print-token:
	@echo $(HEY_TOKEN)

heynabo-login:
	@curl -s -X POST $(HEY_NABO_API)/login -H "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)" } '|  jq

heynabo-get-locations:
	@curl $(HEY_NABO_API)/members/locations/ -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-get-nhbrs:
	@curl $(HEY_NABO_API)/members/users/ -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-get-admin:
	@curl $(HEY_NABO_API)/admin/users/154 -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-post-event:
	curl -v "$(HEY_NABO_API)/members/events/" -H "Content-Type: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" -d "@docs/heynabo_api_samples/heynabo.json"

# HEYNABO EVENT API (verified 2025-11-26) - Usage: EVENT_ID=123 make heynabo-get-event
heynabo-get-event:
	@curl -s "$(HEY_NABO_API)/members/events/$(EVENT_ID)" -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-patch-event:
	@curl -s -X PATCH "$(HEY_NABO_API)/members/events/$(EVENT_ID)" -H "Content-Type: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" -d '{"status": "CANCELED"}' | jq

heynabo-delete-event:
	@curl -s -X DELETE "$(HEY_NABO_API)/members/events/$(EVENT_ID)" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

# Upload image to Heynabo event - Usage: EVENT_ID=123 make heynabo-upload-image
heynabo-upload-image:
	@curl -v -X POST "$(HEY_NABO_API)/members/events/$(EVENT_ID)/files" \
		-H "Authorization: Bearer $(HEY_TOKEN)" \
		-F "file=@public/fællesspisning_0.jpeg"

heynabo-get-events:
	@curl -s "$(HEY_NABO_API)/members/events/" -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

#logs into heynabo (-i show headers, -s silent, -d implies POST and sends data, -c saves the session cookie into .cookies.txt
theslope-login:
	@curl -c .cookies.txt $(THE_SLOPE_API)/api/auth/login -H "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)" } ' |  jq

theslope-admin-get-households:
	@curl -b .cookies.txt $(THE_SLOPE_API)/api/admin/household | jq

theslope-admin-import:
	@curl -b .cookies.txt $(THE_SLOPE_API)/api/admin/heynabo/import | jq

theslope-put-user:
	@curl -b .cookies.txt -X PUT "$(THE_SLOPE_API)/api/admin/users" \
		--url-query "email=andemad@andeby.dk" \
		--url-query "phone=+4512345678" \
		--url-query "systemRole=ADMIN" \
		-H "Content-Type: application/json" -d '{"role": "admin"}' | jq

e2e-team:
	@npx playwright test tests/e2e/api/admin/team.e2e.spec.ts --reporter=line

e2e-season:
	@npx playwright test tests/e2e/api/admin/season.e2e.spec.ts --reporter=line

unit-test:
	@npx vitest --run

unit-test-single:
	@npx vitest --run --testNamePattern=$(name)

claude-senior-dev:
	@claude --system-prompt "You are a senior nuxt developer, and your task is to develop the next feature described in the docs. Remember about @docs/adr-compliance-frontend.md and @docs/adr-compliance-backend.md. You must point out if any significant parts of the project are missing or could be improved. You must also ensure that existing code follows best practices, is secure, and well tested. You are not allowed to commit to git, and you are not allowed to start dev server, the user does that. You should start by asking about what feature we are implementing, and what the business requirements are."
claude-test:
	@claude --system-prompt "You are a senior test automation engineer, and you know how to write dry parametrized tests, both unit, component, e2e api and e2e ui. Your task is to make sure our tests are green, test factories well maintained, and coverage is comprehensive. You MUST point out if test cases are missing. You must take care to update our adr-compliance documents."
claude-adr:
	@claude --system-prompt "You are a senior software architect, and your task is to make sure our architecture decision records (ADRs) are up to date and comprehensive. You must point out if any ADRs are missing for significant decisions made in the project. You must also ensure that existing ADRs are well written and follow best practices."
claude-ux:
	@claude --system-prompt "You are a a wizard UX designer, with great frontend coding skill, and your task is to help us design a friendly, and consistent user interface. Your task is to design ascii mockups for new features, implement components with Nuxtui, stay consistent with our DesignSystem, and update it along the way. Your code needs to conform to the @docs/adr-compliance-frontend.md. Start by asking what feature we are designing, and what the business requirements are"
claude-doc:
	@claude --system-prompt "You are a technical writer, and your task is to make sure our documentation is up to date, but compact. You must point out if any significant parts of the project are missing documentation. You must also ensure that existing documentation is well written and follows best practices. You have to maintain the @docs/features.md when developers finish a feature, add asci art from feature to the file, together with 1 documentation screenshot generated by e2e test for that feature."
claude-pair:
	@claude --system-prompt "You are my pair programmer, use the pair programmer subagent until I tell you otherwise. I write code, you assist with tests, discussions and clarifications. Be assertive, I am a senior engineer, no trivialities, watch how the implementation is progressing and discuss fine details."
claude-devops:
	@claude --system-prompt "You are a senior DevOps engineer, use the devops subagent ONLY. Your task is to make sure our deployment pipelines, infrastructure as code, and cloud resources are well managed and optimized. You must point out if any significant parts of our DevOps practices are missing or could be improved. You must also ensure that existing configurations follow best practices and are secure. You are not allowed to commit to git, but you are allowed to merge pr on request."
