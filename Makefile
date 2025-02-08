#! /usr/bin/env bash

include .env
export

.PHONY: heynabo-print-token heynabo-api heynabo-get-locations heynabo-get-nhbrs heynabo-get-admin heynabo

export HEY_TOKEN?="$(shell curl -s -X POST https://demo.spaces.heynabo.com/api/login "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)"}' | jq .'token')"
HEYNABO_API="https://$(HEY_NABO_SPACE).spaces.heynabo.com/api"

heynabo-api:
	@echo $(HEYNABO_API)

heynabo-print-token:
	@echo $(HEY_TOKEN)

heynabo-login:
	@curl -s -X POST https://demo.spaces.heynabo.com/api/login -H "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)" } '|  jq

heynabo-get-locations:
	@curl https://demo.spaces.heynabo.com/api/members/locations/ -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-get-nhbrs:
	@curl https://demo.spaces.heynabo.com/api/members/users/ -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-get-admin:
	@curl https://demo.spaces.heynabo.com/api/admin/users/154 -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-post-event:
	curl -v "$(HEYNABO_API)/members/events/" -H "Content-Type: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" -d "@docs/heynabo.json"

#logs into heynabo and saves the session cookie into .cookies.txt
theslope-login:
	@curl -c .cookies.txt -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json"  -d '{"email": "$(HEY_NABO_USERNAME)","password": "$(HEY_NABO_PASSWORD)" } '|  jq

theslope-admin-get-users:
	@curl -b .cookies.txt http://localhost:3000/api/admin/users | jq

theslope-admin-import:
	@curl -b .cookies.txt http://localhost:3000/api/admin/heynabo/import | jq

d1-prisma:
	@npx prisma format
	@npm run db:generate-client

d1-migrate: d1-prisma
	@echo "🏗️ Generating db client from model, and migrating all d1 databases to new data model"
	@npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script --output migrations/0001_initial.sql

d1-migrate-local: d1-migrate
	$(info "🏗️ Migrating schemas of local database")
	@yes | npm run db:migrate:local

d1-migrate-prod: d1-migrate
	$(info "🏗️ Migrating schemas of production database")
	@yes | npm run db:migrate

d1-migrate-all: d1-migrate-local d1-migrate-prod
	$(info '🤖Will build d1 databases - local and remote - using Prisma migrations')

d1-list-users-local:
	@npx wrangler d1 execute theslope --command  "SELECT * FROM user"

.env.example:
	@cat .env | sed 's/=.*$$/=/g' > .env.examples

generate-session-secret:
	@openssl rand -base64 32
