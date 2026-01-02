# ADR-002 Compliance Violations - API Endpoints

**Generated:** 2025-01-09
**Last Updated:** 2026-01-02 (Inhabitant POST returns InhabitantUpdateResponse with scaffoldResult)

### Repository Column Legend
- ✅ = Repository function validates with `Schema.parse()`
- ❌ = Repository function doesn't validate (returns raw Prisma type)
- ❓ = Not yet audited

## Detailed Violations

| Endpoint | Return Type | Validation | Repository | E2E Tests | Notes                                                                                            |
|----------|-------------|------------|------------|-----------|--------------------------------------------------------------------------------------------------|
| **Order Management** | | | | | **✅ FULLY COMPLIANT** (4/5 endpoints implemented) + Authorization middleware                     |
| `/api/order/index.put.ts` | ✅ | ✅ | ✅ | ✅ | createOrder() + `requireHouseholdAccess()` authorization                                         |
| `/api/order/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchOrders() validates with OrderSchema                                                         |
| `/api/order/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchOrder() + `requireHouseholdAccess()` authorization                                          |
| `/api/order/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteOrder() validates with OrderSchema                                                         |
| `/api/order/swap-order.post.ts` | N/A | N/A | N/A | N/A | Stub - not yet implemented                                                                       |
| **Admin - Dinner Events** | | | | | **✅ FULLY COMPLIANT**                                                                            |
| `/api/admin/dinner-event/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteDinnerEvent() validates with DinnerEventResponseSchema                                     |
| `/api/admin/dinner-event/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchDinnerEvent() validates with DinnerEventResponseSchema                                      |
| `/api/admin/dinner-event/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | updateDinnerEvent() validates with DinnerEventResponseSchema                                     |
| `/api/admin/dinner-event/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchDinnerEvents() validates with DinnerEventResponseSchema                                     |
| `/api/admin/dinner-event/index.put.ts` | ✅ | ✅ | ✅ | ✅ | saveDinnerEvent() validates with DinnerEventResponseSchema                                       |
| **Admin - Teams** | | | | | **✅ FULLY COMPLIANT (2025-12-15)** - Uses teamService for auto-assignment                       |
| `/api/admin/team/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteTeam() → CookingTeamWithMembers                                                            |
| `/api/admin/team/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchTeams() → CookingTeamWithMembers[]                                                          |
| `/api/admin/team/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | updateTeamWithAssignments() auto-assigns affinities + events                                     |
| `/api/admin/team/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchTeam() → CookingTeamWithMembers                                                             |
| `/api/admin/team/index.put.ts` | ✅ | ✅ | ✅ | ✅ | createTeamsWithAssignments() auto-assigns affinities + events                                    |
| `/api/admin/team/assignment/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteCookingTeamAssignments() → number                                                          |
| `/api/admin/team/assignment/index.get.ts` | ❌ | ✅ | N/A | N/A | Stub endpoint (returns static message)                                                           |
| `/api/admin/team/assignment/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchTeamAssignment() → CookingTeamAssignment                                                    |
| `/api/admin/team/assignment/index.put.ts` | ✅ | ✅ | ✅ | ✅ | createTeamAssignment() → CookingTeamAssignment                                                   |
| **Admin - Users** | | | | | **✅ FULLY COMPLIANT**                                                                            |
| `/api/admin/users/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteUser() validates with UserResponseSchema                                                   |
| `/api/admin/users/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchUsers() validates with UserDisplaySchema                                                    |
| `/api/admin/users/index.put.ts` | ✅ | ✅ | ✅ | ✅ | saveUser() validates with UserResponseSchema                                                     |
| `/api/admin/users/by-role/[role].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchUsersByRole() validates with UserDisplaySchema                                              |
| **Admin - Households** | | | | | **✅ FULLY COMPLIANT (2025-11-12)**                                                               |
| `/api/admin/household/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteHousehold() → HouseholdDetail (uses useCoreValidation)                                     |
| `/api/admin/household/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchHousehold() → HouseholdDetail (ADR-009)                                                     |
| `/api/admin/household/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | updateHousehold() → HouseholdDetail (uses useCoreValidation, ADR-009)                            |
| `/api/admin/household/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchHouseholds() → HouseholdDisplay[] (ADR-009)                                                 |
| `/api/admin/household/index.put.ts` | ✅ | ✅ | ✅ | ✅ | saveHousehold() → HouseholdDetail (uses useCoreValidation, ADR-009)                              |
| `/api/admin/household/inhabitants/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteInhabitant() → Inhabitant with deserializeInhabitant()                                     |
| `/api/admin/household/inhabitants/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchInhabitant() → Inhabitant with deserialization                                              |
| `/api/admin/household/inhabitants/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | updateInhabitant() → InhabitantUpdateResponse (ADR-015: triggers scaffoldPrebookings on preference change) |
| `/api/admin/household/inhabitants/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchInhabitants() → Inhabitant[] with deserialization                                           |
| `/api/admin/household/inhabitants/index.put.ts` | ✅ | ✅ | ✅ | ✅ | saveInhabitant() → Inhabitant with deserializeInhabitant()                                       |
| **Admin - Seasons** | | | | | **✅ FULLY COMPLIANT**                                                                            |
| `/api/admin/season/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteSeason() → Season                                                                          |
| `/api/admin/season/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchSeason() → Season                                                                           |
| `/api/admin/season/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | updateSeason() → Season                                                                          |
| `/api/admin/season/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchSeasons() → Season[]                                                                        |
| `/api/admin/season/index.put.ts` | ✅ | ✅ | ✅ | ✅ | createSeason() → Season                                                                          |
| `/api/admin/season/active.get.ts` | ✅ | ✅ | ✅ | ✅ | Returns active season ID (number \| null)                                                        |
| `/api/admin/season/[id]/assign-cooking-teams.post.ts` | ✅ | ✅ | ✅ | ✅ | Returns AssignTeamsResponse                                                                      |
| `/api/admin/season/[id]/assign-team-affinities.post.ts` | ✅ | ✅ | ✅ | ✅ | Returns AssignAffinitiesResponse                                                                 |
| `/api/admin/season/import.post.ts` | ✅ | ✅ | ✅ | ✅ | CSV import with ADR-002/015 patterns, job tracking, uses teamService                             |
| **Admin - Allergy Types** | | | | | **✅ FULLY COMPLIANT**                                                                            |
| `/api/admin/allergy-type/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchAllergyTypes() validates with AllergyTypDetailSchema                                        |
| `/api/admin/allergy-type/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchAllergyType() validates with AllergyTypeDisplaySchema                                       |
| `/api/admin/allergy-type/index.put.ts` | ✅ | ✅ | ✅ | ✅ | createAllergyType() validates with AllergyTypeDisplaySchema                                      |
| `/api/admin/allergy-type/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | updateAllergyType() validates with AllergyTypeDisplaySchema                                      |
| `/api/admin/allergy-type/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteAllergyType() validates with AllergyTypeDisplaySchema                                      |
| **Household - Allergies** | | | | | **✅ FULLY COMPLIANT **                                                                           |
| `/api/household/allergy/[id].delete.ts` | ✅ | ✅ | ✅ | ✅ | deleteAllergy() → AllergyResponse                                                                |
| `/api/household/allergy/index.get.ts` | ✅ | ✅ | ✅ | ✅ | fetchAllergiesForInhabitant/fetchAllergiesForHousehold() → AllergyWithRelations[]                |
| `/api/household/allergy/[id].post.ts` | ✅ | ✅ | ✅ | ✅ | updateAllergy() → AllergyWithRelations                                                           |
| `/api/household/allergy/[id].get.ts` | ✅ | ✅ | ✅ | ✅ | fetchAllergy() → AllergyWithRelations                                                            |
| `/api/household/allergy/index.put.ts` | ✅ | ✅ | ✅ | ✅ | createAllergy() → AllergyWithRelations                                                           |
| **Teams (Public)** |
| `/api/team/index.get.ts` | ❌ | ✅ | |
| `/api/team/[id].get.ts` | ❌ | ✅ | |
| `/api/team/my.get.ts` | ❌ | ✅ | |
| `/api/team/cooking/[id]/assign-role.post.ts` | ✅ | ✅ | ✅ | ❌ | **FULLY COMPLIANT** - Uses repository functions only (ADR-001, ADR-010) |
| **Other** |
| `/api/chefing/team.ts` | ❌ | ✅ | |
| `/api/calendar/index.get.ts` | ❌ | ✅ | |
| `/api/calendar/feed.ts` | ❌ | ✅ | |
| `/api/auth/login.post.ts` | ❌ | ✅ | |
| **Admin - Billing** | | | | | **✅ FULLY COMPLIANT (2025-12-03)**                                                               |
| `/api/admin/billing/import.post.ts` | ✅ | ✅ | ✅ | ✅ | CSV import with ADR-002 separate try-catch, uses useBillingValidation composable                 |
| **Admin - Heynabo** | | | | | **✅ COMPLIANT**                                                                                  |
| `/api/admin/heynabo/import.get.ts` | ✅ | ✅ | ✅ | ✅ | GET endpoint with proper business logic try-catch, uses transformation functions from composable |
| **Authorization Infrastructure** | | | | | **✅ COMPLIANT (2025-12-23)** - Route-level + resource-level authorization                       |
| `server/middleware/2.authorize.ts` | N/A | N/A | N/A | ✅ | Route-level authorization middleware, uses `usePermissions` composable                           |
| `server/utils/authorizationHelper.ts` | N/A | N/A | N/A | ✅ | `requireHouseholdAccess()`, `requireRoutePermission()` helpers with ADR-004 logging              |
| **User Feedback** | | | | | **✅ FULLY COMPLIANT (2025-12-29)**                                                               |
| `/api/feedback.post.ts` | ✅ | ✅ | N/A | ❌ | Creates GitHub issue via PAT, requires auth (Inhabitant), ADR-002 separate try-catch            |
| `server/integration/github/githubClient.ts` | ✅ | ✅ | N/A | ❌ | GitHub API client with Zod validation, uses `useRuntimeConfig()`                                 |

## Compliance Checklist

Use this checklist when creating/reviewing API endpoints:

- [ ] Separate try-catch for validation vs business logic
- [ ] Use `getValidatedRouterParams` for path params
- [ ] Use `readValidatedBody` for request body
- [ ] Define explicit return type `Promise<Type>`
- [ ] Import types from composables (not Prisma directly)
- [ ] Follow logging standards (ADR-004)
- [ ] Add JSDoc comments for complex endpoints
- [ ] E2E test coverage adequate, factories use proper types, test data uses proper salting, e2e tests are green
- [ ] Component test coverage adequate, tests are dry and paremetrized, component tests are green

## Fully Compliant Examples

Reference these endpoints for correct ADR-002 implementation:

- ✅ `/api/admin/users/by-role/[role].get.ts` - Route validation + return type
- ✅ `/api/admin/allergy-type/[id].get.ts` - ID validation + return type + error handling
- ✅ `/api/admin/household/[id].get.ts` - Complete pattern
- ✅ `/api/order/[id].delete.ts` - DELETE pattern with validation
- ✅ `/api/team/cooking/[id]/assign-role.post.ts` - Full ADR-001 & ADR-010 compliance with repository pattern
