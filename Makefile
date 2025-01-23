include .env
export

.PHONY: heynabo-print-token heynabo-api heynabo-get-locations heynabo-get-nhbrs heynabo-get-admin heynabo

export HEY_TOKEN?="$(shell curl -X POST https://demo.spaces.heynabo.com/api/login "Content-Type: application/json"  -d '{"email": "moryde@gmail.com","password": "dydmy1-mocmib-pycjEk"}' | jq .'token')"
HEYNABO_API="https://demo.spaces.heynabo.com/api"

heynabo-api:
	@echo $(HEYNABO_API)

heynabo-print-token:
	@echo $(HEY_TOKEN)

heynabo-get-locations:
	@curl https://demo.spaces.heynabo.com/api/members/locations/ -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-get-nhbrs:
	@curl https://demo.spaces.heynabo.com/api/members/users/ -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-get-admin:
	@curl https://demo.spaces.heynabo.com/api/admin/users/154 -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

heynabo-post-event:
	curl -v "$(HEYNABO_API)/members/events/" -H "Content-Type: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" -d "@docs/heynabo.json"

heynabo-events:
	@curl https://demo.spaces.heynabo.com/api/members/events/ -H "Accept: application/json" -H "Authorization: Bearer $(HEY_TOKEN)" | jq

debug:
	@echo "Space: $(HEY_NABO_SPACE)"
	@echo "API URL: $(HEYNABO_API)"
	@echo "user: $(HEY_NABO_USERNAME)"
	@echo "password: $(HEY_NABO_PASSWORD)"