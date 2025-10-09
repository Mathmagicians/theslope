#! /usr/bin/env bash
# change .env, .env.test, .env.prod to access localhost, dev, prod system
include .env
export

.PHONY: heynabo-print-token heynabo-api heynabo-get-locations heynabo-get-nhbrs heynabo-get-admin heynabo

export HEY_TOKEN?="$(shell curl -s -X POST $(HEY_NABO_API)/login  -H "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)"}' | jq .'token')"

git-cleanup-branch:
	@current_branch=$$(git branch --show-current); \
	if [ "$$current_branch" = "main" ]; then \
		echo "❌ Already on main branch. Please specify branch to delete: make git-cleanup-branch branch=<branch-name>"; \
		exit 1; \
	fi; \
	git checkout main && git pull && git branch -d $$current_branch && \
	echo "✅ Cleaned up branch $$current_branch"

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

d1-list-users-local:
	@npx wrangler d1 execute theslope --command  "SELECT * FROM User" --local

d1-list-tables:
	@npx wrangler d1 execute theslope --command 'PRAGMA table_list' --env dev --remote

d1-list-tables-local:
	@npx wrangler d1 execute theslope --command 'PRAGMA table_list' --local

logs-dev:
	@npx wrangler tail theslope-dev --env dev --format pretty

logs-prod:
	@npx wrangler tail theslope-prod --env prod --format pretty

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
	curl -v "$(HEY_NABO_API)/members/events/" -H "Content-Type: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" -d "@docs/heynabo.json"

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
