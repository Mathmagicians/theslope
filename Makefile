#! /usr/bin/env bash
# change .env, .env.test, .env.prod to access localhost, dev, prod system
include .env
export

.PHONY: heynabo-print-token heynabo-api heynabo-get-locations heynabo-get-nhbrs heynabo-get-admin heynabo

export HEY_TOKEN?="$(shell curl -s -X POST $(HEY_NABO_API)/login  -H "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)"}' | jq .'token')"

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

theslope-admin-get-users:
	@curl -b .cookies.txt $(THE_SLOPE_API)/api/admin/users | jq

theslope-admin-import:
	@curl -b .cookies.txt $(THE_SLOPE_API)/api/admin/heynabo/import | jq

theslope-put-user:
	@curl -b .cookies.txt -X PUT "$(THE_SLOPE_API)/api/admin/users" \
		--url-query "email=andemad@andeby.dk" \
		--url-query "phone=+4512345678" \
		--url-query "systemRole=ADMIN" \
		-H "Content-Type: application/json" -d '{"role": "admin"}' | jq

prisma-to-zod:
	@npx prisma generate zod

d1-prisma: prisma-to-zod
	@npx prisma format
	@npm run db:generate-client

d1-migrate: d1-prisma
	@echo "🏗️ Generating db client from model, and migrating all d1 databases to new data model"
	@npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/0001_initial.sql

d1-migrate-local: d1-migrate
	$(info "🏗️ Migrating schemas of local database")
	@yes | npm run db:migrate:local
	@npm run db:seed:local

d1-migrate-prod: d1-migrate
	$(info "🏗️ Migrating schemas of production database")
	@yes | npm run db:migrate
	@npm run db:seed

d1-migrate-all: d1-migrate-local d1-migrate-prod
	$(info '🤖Will build d1 databases - local and remote - using Prisma migrations')

d1-list-users-local:
	@npx wrangler d1 execute theslope --command  "SELECT * FROM user"

d1-list-tables:
	@npx wrangler d1 execute theslope --command 'PRAGMA table_list' --remote

d1-list-tables-local:
	@npx wrangler d1 execute theslope --command 'PRAGMA table_list'

.env.example:
	@cat .env | sed 's/=.*$$/=/g' > .env.examples

generate-session-secret:
	@openssl rand -base64 32

run-e2e-team:
	@npx playwright test tests/e2e/api/admin/team.e2e.spec.ts --reporter=line

run-e2e-user:
	@npx playwright test tests/e2e/api/admin/users.e2e.spec.ts --reporter=line
