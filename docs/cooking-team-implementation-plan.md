# Cooking Team Implementation - Architectural Analysis & Plan

**Date:** 2025-09-29
**Architect:** Senior Architect
**Status:** Analysis Complete - Ready for Implementation

---

## Executive Summary

This document provides a comprehensive architectural analysis of the Cooking Team implementation for TheSlope project. The analysis reveals that approximately **70% of the implementation is complete**, with critical gaps in:

1. **SeasonFactory test utilities** (syntax errors preventing execution)
2. **CookingTeamAssignment repository functions** (missing CRUD operations)
3. **Team assignment API endpoints** (incomplete implementation)
4. **Test factory methods** (incomplete member assignment logic)

The implementation follows ADR-002 (error handling), ADR-003 (factory pattern), and ADR-005 (cascade deletion) patterns correctly where implemented.

---

## 1. Schema Analysis

### 1.1 Prisma Schema Structure

**CookingTeam Entity:**
```prisma
model CookingTeam {
  id          Int                     @id @default(autoincrement())
  seasonId    Int
  season      Season                  @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  name        String
  dinners     DinnerEvent[]
  assignments CookingTeamAssignment[]
}
```

**CookingTeamAssignment Entity:**
```prisma
model CookingTeamAssignment {
  id            Int         @id @default(autoincrement())
  cookingTeamId Int
  cookingTeam   CookingTeam @relation(fields: [cookingTeamId], references: [id], onDelete: Cascade)
  inhabitantId  Int
  inhabitant    Inhabitant  @relation(fields: [inhabitantId], references: [id], onDelete: Cascade)
  role          Role
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

**Role Enum:**
```prisma
enum Role {
  CHEF
  COOK
  JUNIORHELPER
}
```

### 1.2 Relationship Analysis (ADR-005 Compliance)

**Strong Relations (CASCADE DELETE):**
- ✅ **CookingTeam → Season**: `onDelete: Cascade` - Teams cannot exist without season
- ✅ **CookingTeamAssignment → CookingTeam**: `onDelete: Cascade` - Assignments require team
- ✅ **CookingTeamAssignment → Inhabitant**: `onDelete: Cascade` - Assignments require inhabitant

**Weak Relations (SET NULL):**
- ✅ **DinnerEvent → CookingTeam**: `onDelete: SetNull` - Events can exist without team

**Cascade Behavior Verification:**
```
Season Deletion → CookingTeam CASCADE → CookingTeamAssignment CASCADE
CookingTeam Deletion → CookingTeamAssignment CASCADE
Inhabitant Deletion → CookingTeamAssignment CASCADE
```

**Schema Design Assessment:** ✅ **COMPLIANT** with ADR-005

---

## 2. API Endpoint Analysis

### 2.1 Team CRUD Endpoints

| Endpoint | Status | ADR-002 Compliance | Notes |
|----------|--------|-------------------|-------|
| `PUT /api/admin/team` | ✅ Complete | ✅ Yes | Creates team, returns 201 |
| `GET /api/admin/team` | ✅ Complete | ✅ Yes | Lists teams with optional seasonId filter |
| `GET /api/admin/team/[id]` | ✅ Complete | ✅ Yes | Returns team with members (chefs[], cooks[], juniorHelpers[]) |
| `POST /api/admin/team/[id]` | ✅ Complete | ✅ Yes | Updates team name/seasonId |
| `DELETE /api/admin/team/[id]` | ✅ Complete | ✅ Yes | Deletes team + cascades assignments |

**Team Endpoints Assessment:** ✅ **COMPLETE** and **ADR-COMPLIANT**

### 2.2 Team Assignment Endpoints

| Endpoint | Status | Implementation | Notes |
|----------|--------|----------------|-------|
| `PUT /api/admin/team/assignment` | ⚠️ Partial | Validation only, no DB operations | TODO comment in code |
| `GET /api/admin/team/assignment/[id]` | ❌ Missing | File exists but empty (1 line) | Needs implementation |
| `DELETE /api/admin/team/assignment/[id]` | ✅ Complete | Uses `deleteCookingTeamAssignments` | Works correctly |

**Assignment Endpoints Assessment:** ⚠️ **INCOMPLETE** - 2 of 3 endpoints need work

### 2.3 Repository Functions Analysis

**Team Repository Functions (in prismaRepository.ts):**
- ✅ `fetchTeams(d1Client, seasonId?)` - Lines 438-475
- ✅ `fetchTeam(d1Client, id)` - Lines 477-516 (includes chefs, cooks, juniorHelpers)
- ✅ `createTeam(d1Client, teamData)` - Lines 518-537
- ✅ `updateTeam(d1Client, id, teamData)` - Lines 539-557
- ✅ `deleteTeam(d1Client, id)` - Lines 559-575 (cascade handled by schema)
- ✅ `deleteCookingTeamAssignments(d1Client, assignmentIds[])` - Lines 415-436

**Missing Repository Functions:**
- ❌ `createCookingTeamAssignment(d1Client, assignmentData)`
- ❌ `fetchCookingTeamAssignment(d1Client, id)`
- ❌ `updateCookingTeamAssignment(d1Client, id, assignmentData)`

**Repository Assessment:** ⚠️ **INCOMPLETE** - Missing 3 assignment CRUD functions

### 2.4 Expected Response Structure

Based on `fetchTeam` repository function (lines 477-516) and test expectations:

```typescript
{
  id: number
  seasonId: number
  name: string
  season: Season
  chefs: Array<{
    id: number
    inhabitantId: number
    role: 'CHEF'
    inhabitant: Inhabitant
  }>
  cooks: Array<{
    id: number
    inhabitantId: number
    role: 'COOK'
    inhabitant: Inhabitant
  }>
  juniorHelpers: Array<{
    id: number
    inhabitantId: number
    role: 'JUNIORHELPER'
    inhabitant: Inhabitant
  }>
  dinners: DinnerEvent[]
}
```

**Issue Identified:** ⚠️ **SCHEMA MISMATCH**

The repository function tries to include `chefs`, `cooks`, `juniorHelpers` arrays, but the Prisma schema only has `assignments` relation. This suggests the repository function is incorrectly written.

---

## 3. Test Analysis

### 3.1 E2E Test Coverage

**File:** `/Users/agatanoair/workspace/theslope/tests/e2e/api/admin/team.e2e.spec.ts`

**Test Scenarios (15 tests total):**

| Test | Factory Methods Required | Status |
|------|-------------------------|--------|
| PUT creates team + GET retrieves | `createCookingTeamForSeason`, `getCookingTeamById` | ⚠️ Syntax errors |
| PUT creates with assignments + DELETE cascades | `createCookingTeamWithMembersForSeason`, `getCookingTeamAssignment` | ⚠️ Incomplete |
| GET lists all teams | `getAllCookingTeams` | ✅ Complete |
| GET filters by seasonId | `getCookingTeamsForSeason` | ✅ Complete |
| GET specific team details | `getCookingTeamById` | ⚠️ Syntax errors |
| POST updates team | Direct API call | ✅ Complete |
| DELETE removes team + assignments | `deleteCookingTeam` | ✅ Complete |
| PUT adds team assignments | `createCookingTeamWithMembersForSeason` | ⚠️ Incomplete |
| DELETE removes assignment | `removeMemberFromTeam` | ❌ Not implemented |
| Validation: invalid seasonId | `createCookingTeamForSeason` | ⚠️ Syntax errors |
| Validation: empty team name | `createCookingTeamForSeason` | ⚠️ Syntax errors |
| Error: 404 for non-existent team GET | `getCookingTeamById` | ⚠️ Syntax errors |
| Error: 404 for non-existent team POST | Direct API call | ✅ Complete |
| Error: 404 for non-existent team DELETE | `deleteCookingTeam` | ✅ Complete |
| Validation: invalid member data | `assignMemberToTeam` | ❌ Not implemented |

**Test Coverage:** ⚠️ **60% Complete** - 9 of 15 tests can run, 6 blocked by factory issues

### 3.2 SeasonFactory Critical Issues

**File:** `/Users/agatanoair/workspace/theslope/tests/e2e/testDataFactories/seasonFactory.ts`

**Critical Syntax Errors:**

1. **Line 108**: `Promis.all` → Should be `Promise.all`
   ```typescript
   const teams = await Promis.all(  // ❌ TYPO
   ```

2. **Line 109**: Undefined variable `newSeason` → Should be `season`
   ```typescript
   Array(teamCount).fill(0).map(() => this.createCookingTeamForSeason(context, newSeason.id as number))
   //                                                                            ^^^^^^^^^ undefined
   ```

3. **Line 169**: Default parameter syntax error
   ```typescript
   teamName: string = 'TestTeam',  // Line 141
   // ...
   const team = await this.createCookingTeamForSeason(context, seasonId, teamName = 'TestTeam')  // Line 169
   //                                                                     ^^^^^^^^^^^^^^^^^^^^^ Wrong syntax
   ```

4. **Lines 173-183**: Incomplete implementation
   ```typescript
   const household = HouseholdFactory.createHouseholdWithInhabitants(context, undefined, memberCount)
   // This returns a Promise, but not awaited

   const memberAssignments = Array(memberCount).fill(0).map((_, i) =>
       ({
           seasonId: seasonId,
           name: salt(`TestMember-${i}`),
           role: roles[i % roles.length]
           tea  // ❌ INCOMPLETE LINE
       })
   )
   ```

5. **Lines 186-195**: Unreachable code (dead code after incomplete block)
   ```typescript
   for (let i = 0; i < memberCount; i++) {
       // This code is unreachable due to incomplete block above
   }
   ```

6. **Line 143**: Type error in function signature
   ```typescript
   ): Promise<Team> => {  // ❌ Type 'Team' doesn't exist, should be 'CookingTeam' or 'any'
   ```

7. **Line 252**: Variable name mismatch
   ```typescript
   const response = await context.request.put(`${ADMIN_TEAM_ENDPOINT}/assignments`, {
       headers: headers,
       data: memberData  // ❌ Should be 'teamAssignmentData'
   })
   ```

8. **Line 272**: Missing implementation
   ```typescript
   static readonly removeMemberFromTeam = async (
       context: BrowserContext,
       teamId: number,
       memberAssignmentIds: number,  // ❌ Should be 'memberAssignmentId' (singular)
       expectedStatus: number = 200
   ): Promise<any[]> => {  // ❌ Should return single item, not array
       throw new Error('assignMembersToTeam: Not implemented - mock method')  // ❌ Wrong error message
   }
   ```

**Factory Assessment:** ❌ **BLOCKED** - Cannot execute tests until syntax errors are fixed

---

## 4. Validation Schema Analysis

**File:** `/Users/agatanoair/workspace/theslope/app/composables/useCookingTeamValidation.ts`

**Schemas Defined:**
- ✅ `CookingTeamSchema` - Basic team validation
- ✅ `CookingTeamWithMembersSchema` - Team with role-based member arrays
- ✅ `CookingTeamAssignmentSchema` - Individual assignment validation
- ✅ `TeamMemberAssignmentSchema` - API operation schema (teamId + inhabitantId + role)
- ✅ `BulkMemberAssignmentSchema` - Bulk assignment operations

**Utility Functions:**
- ✅ `getTeamMemberCounts(team)` - Returns counts by role + total
- ✅ `getAllAssignmentIds(team)` - Flattens all assignment IDs from role arrays

**Validation Assessment:** ✅ **COMPLETE** and **WELL-DESIGNED**

**Note on Schema Design:** The filter logic for `chefs`, `cooks`, `juniorHelpers` arrays must happen at the API/repository layer, not in Prisma schema. The validation composable correctly expects these arrays in the response.

---

## 5. Critical Issues to Fix First

### Priority 1: Blocking Issues (Must Fix Before Any Tests Can Run)

#### 5.1 SeasonFactory Syntax Errors

**File:** `/Users/agatanoair/workspace/theslope/tests/e2e/testDataFactories/seasonFactory.ts`

**Fix 1: Line 108** - Typo
```typescript
// Current:
const teams = await Promis.all(

// Fix:
const teams = await Promise.all(
```

**Fix 2: Line 109** - Undefined variable
```typescript
// Current:
Array(teamCount).fill(0).map(() => this.createCookingTeamForSeason(context, newSeason.id as number))

// Fix:
Array(teamCount).fill(0).map(() => this.createCookingTeamForSeason(context, season.id as number))
```

**Fix 3: Line 143** - Type definition
```typescript
// Current:
): Promise<Team> => {

// Fix:
): Promise<CookingTeam> => {
```

**Fix 4: Line 169** - Default parameter
```typescript
// Current:
const team = await this.createCookingTeamForSeason(context, seasonId, teamName = 'TestTeam')

// Fix:
const team = await this.createCookingTeamForSeason(context, seasonId, teamName)
```

**Fix 5: Lines 162-200** - Complete rewrite of `createCookingTeamWithMembersForSeason`
```typescript
static readonly createCookingTeamWithMembersForSeason = async (
    context: BrowserContext,
    seasonId: number,
    teamName: string = 'TestTeam',
    memberCount: number = 3
): Promise<CookingTeamWithMembers> => {
    // First create the team
    const team = await this.createCookingTeamForSeason(context, seasonId, teamName)

    // Create household with inhabitants
    const {household, inhabitants} = await HouseholdFactory.createHouseholdWithInhabitants(
        context,
        `Household-for-${teamName}`,
        memberCount
    )

    // Assign inhabitants to team with different roles
    const roles: TeamRole[] = ['CHEF', 'COOK', 'JUNIORHELPER']

    for (let i = 0; i < memberCount; i++) {
        const inhabitant = inhabitants[i]
        const role = roles[i % roles.length]

        await this.assignMemberToTeam(context, team.id, inhabitant.id, role)
    }

    // Return team with member assignments populated
    const teamWithMembers = await this.getCookingTeamById(context, team.id)
    return teamWithMembers
}
```

**Fix 6: Line 240** - Fix parameter types and endpoint
```typescript
// Current:
static readonly assignMemberToTeam = async (
    context: BrowserContext,
    teamId: number,
    inhabitantId: number,
    role: TeamRole,
    expectedStatus: number = 201
): Promise<any> => {
    const teamAssignmentData = {
        teamId: teamId,
        inhabitantId: inhabitantId,
        role: role
    }
    const response = await context.request.put(`${ADMIN_TEAM_ENDPOINT}/assignments`, {
        headers: headers,
        data: memberData  // ❌ Wrong variable name
    })

// Fix:
static readonly assignMemberToTeam = async (
    context: BrowserContext,
    teamId: number,
    inhabitantId: number,
    role: TeamRole,
    expectedStatus: number = 201
): Promise<TeamMemberAssignment> => {
    const assignmentData = {
        cookingTeamId: teamId,
        inhabitantId: inhabitantId,
        role: role
    }
    const response = await context.request.put(`/api/admin/team/assignment`, {
        headers: headers,
        data: assignmentData
    })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

    if (expectedStatus === 201) {
        const responseBody = await response.json()
        expect(responseBody.id).toBeDefined()
        return responseBody
    }
    return null
}
```

**Fix 7: Line 266** - Implement `removeMemberFromTeam`
```typescript
// Current:
static readonly removeMemberFromTeam = async (
    context: BrowserContext,
    teamId: number,
    memberAssignmentIds: number,
    expectedStatus: number = 200
): Promise<any[]> => {
    throw new Error('assignMembersToTeam: Not implemented - mock method')
}

// Fix:
static readonly removeMemberFromTeam = async (
    context: BrowserContext,
    teamId: number,
    assignmentId: number,
    expectedStatus: number = 200
): Promise<any> => {
    const response = await context.request.delete(`/api/admin/team/assignment/${assignmentId}`, {
        headers: headers
    })

    const status = response.status()
    expect(status, 'Unexpected status').toBe(expectedStatus)

    if (expectedStatus === 200) {
        return await response.json()
    }
    return null
}
```

**Fix 8: Add missing import**
```typescript
// At top of file, add:
import {type TeamRole} from "~/composables/useCookingTeamValidation"
```

### Priority 2: Repository Functions (Block API Implementation)

#### 5.2 Missing CookingTeamAssignment Repository Functions

**File:** `/Users/agatanoair/workspace/theslope/server/data/prismaRepository.ts`

**Add after `deleteCookingTeamAssignments` (line 436):**

```typescript
export async function createCookingTeamAssignment(
    d1Client: D1Database,
    assignmentData: PrismaFromClient.CookingTeamAssignmentCreateInput
): Promise<CookingTeamAssignment> {
    console.info(`👥🔗 > ASSIGNMENT > [CREATE] Creating assignment for team ${assignmentData.cookingTeamId}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const newAssignment = await prisma.cookingTeamAssignment.create({
            data: assignmentData,
            include: {
                cookingTeam: true,
                inhabitant: true
            }
        })

        console.info(`👥🔗 > ASSIGNMENT > [CREATE] Successfully created assignment with ID ${newAssignment.id}`)
        return newAssignment
    } catch (error) {
        const h3e = h3eFromCatch('Error creating team assignment', error)
        console.error(`👥🔗 > ASSIGNMENT > [CREATE] ${h3e.message}`, error)
        throw h3e
    }
}

export async function fetchCookingTeamAssignment(
    d1Client: D1Database,
    id: number
): Promise<CookingTeamAssignment | null> {
    console.info(`👥🔗 > ASSIGNMENT > [GET] Fetching assignment with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const assignment = await prisma.cookingTeamAssignment.findFirst({
            where: {id},
            include: {
                cookingTeam: true,
                inhabitant: true
            }
        })

        if (assignment) {
            console.info(`👥🔗 > ASSIGNMENT > [GET] Found assignment (ID: ${assignment.id})`)
        } else {
            console.info(`👥🔗 > ASSIGNMENT > [GET] No assignment found with ID ${id}`)
        }
        return assignment
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching assignment with ID ${id}`, error)
        console.error(`👥🔗 > ASSIGNMENT > [GET] ${h3e.message}`, error)
        throw h3e
    }
}

export async function updateCookingTeamAssignment(
    d1Client: D1Database,
    id: number,
    assignmentData: Partial<PrismaFromClient.CookingTeamAssignmentCreateInput>
): Promise<CookingTeamAssignment> {
    console.info(`👥🔗 > ASSIGNMENT > [UPDATE] Updating assignment with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const updatedAssignment = await prisma.cookingTeamAssignment.update({
            where: {id},
            data: assignmentData,
            include: {
                cookingTeam: true,
                inhabitant: true
            }
        })

        console.info(`👥🔗 > ASSIGNMENT > [UPDATE] Successfully updated assignment (ID: ${updatedAssignment.id})`)
        return updatedAssignment
    } catch (error) {
        const h3e = h3eFromCatch(`Error updating assignment with ID ${id}`, error)
        console.error(`👥🔗 > ASSIGNMENT > [UPDATE] ${h3e.message}`, error)
        throw h3e
    }
}
```

**Add import at top:**
```typescript
import {
    // ... existing imports
    CookingTeamAssignment,
} from "@prisma/client"
```

#### 5.3 Fix `fetchTeam` Repository Function

**Problem:** Lines 477-516 try to include `chefs`, `cooks`, `juniorHelpers` but Prisma schema only has `assignments`.

**Solution:** Transform assignments into role-based arrays.

**File:** `/Users/agatanoair/workspace/theslope/server/data/prismaRepository.ts`

**Replace lines 477-516:**
```typescript
export async function fetchTeam(d1Client: D1Database, id: number): Promise<CookingTeam | null> {
    console.info(`👥 > TEAM > [GET] Fetching team with ID ${id}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const team = await prisma.cookingTeam.findFirst({
            where: {id},
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                },
                dinners: true
            }
        })

        if (!team) {
            console.info(`👥 > TEAM > [GET] No team found with ID ${id}`)
            return null
        }

        // Transform assignments into role-based arrays
        const transformedTeam = {
            ...team,
            chefs: team.assignments.filter(a => a.role === 'CHEF'),
            cooks: team.assignments.filter(a => a.role === 'COOK'),
            juniorHelpers: team.assignments.filter(a => a.role === 'JUNIORHELPER')
        }

        console.info(`👥 > TEAM > [GET] Found team ${team.name} (ID: ${team.id})`)
        return transformedTeam
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching team with ID ${id}`, error)
        console.error(`👥 > TEAM > [GET] ${h3e.message}`, error)
        throw h3e
    }
}
```

**Do the same for `fetchTeams` (lines 438-475):**
```typescript
export async function fetchTeams(d1Client: D1Database, seasonId?: number): Promise<CookingTeam[]> {
    console.info(`👥 > TEAM > [GET] Fetching teams${seasonId ? ` for season ${seasonId}` : ''}`)
    const prisma = await getPrismaClientConnection(d1Client)

    try {
        const teams = await prisma.cookingTeam.findMany({
            where: seasonId ? {seasonId} : undefined,
            include: {
                season: true,
                assignments: {
                    include: {
                        inhabitant: true
                    }
                },
                dinners: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        // Transform each team's assignments into role-based arrays
        const transformedTeams = teams.map(team => ({
            ...team,
            chefs: team.assignments.filter(a => a.role === 'CHEF'),
            cooks: team.assignments.filter(a => a.role === 'COOK'),
            juniorHelpers: team.assignments.filter(a => a.role === 'JUNIORHELPER')
        }))

        console.info(`👥 > TEAM > [GET] Successfully fetched ${teams.length} teams`, 'Season: ', seasonId ? ` for season ${seasonId}` : '')
        return transformedTeams
    } catch (error) {
        const h3e = h3eFromCatch(`Error fetching teams for season ${seasonId}` , error)
        console.error(`👥 > TEAM > [GET] ${h3e.message}`, error)
        throw h3e
    }
}
```

### Priority 3: API Endpoint Implementation

#### 5.4 Implement `PUT /api/admin/team/assignment`

**File:** `/Users/agatanoair/workspace/theslope/server/routes/api/admin/team/assignment/index.put.ts`

**Replace entire file (lines 1-71):**
```typescript
// PUT /api/admin/team/assignment - Create team assignment

import {defineEventHandler, createError, readValidatedBody, setResponseStatus} from "h3"
import {createCookingTeamAssignment} from "~~/server/data/prismaRepository"
import {useCookingTeamValidation} from "~/composables/useCookingTeamValidation"

// Get the validation utilities from our composable
const {TeamMemberAssignmentSchema} = useCookingTeamValidation()

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let assignmentData
    try {
        assignmentData = await readValidatedBody(event, TeamMemberAssignmentSchema.parse)
    } catch (error) {
        console.error("👥🔗 > ASSIGNMENT > [PUT] Input validation error:", error)
        throw createError({
            statusCode: 400,
            message: 'Invalid input data',
            cause: error
        })
    }

    // Database operations try-catch - separate concerns
    try {
        // Transform to Prisma format
        const prismaAssignmentData = {
            cookingTeam: {
                connect: {id: assignmentData.teamId}
            },
            inhabitant: {
                connect: {id: assignmentData.inhabitantId}
            },
            role: assignmentData.role
        }

        const savedAssignment = await createCookingTeamAssignment(d1Client, prismaAssignmentData)

        console.info(`👥🔗 > ASSIGNMENT > [PUT] Successfully created assignment ${savedAssignment.id}`)

        // Return the saved assignment with 201 Created status
        setResponseStatus(event, 201)
        return savedAssignment
    } catch (error) {
        console.error("👥🔗 > ASSIGNMENT > [PUT] Error creating assignment:", error)
        throw createError({
            statusCode: 500,
            message: '👥🔗 > ASSIGNMENT > Server Error',
            cause: error
        })
    }
})
```

#### 5.5 Implement `GET /api/admin/team/assignment/[id]`

**File:** `/Users/agatanoair/workspace/theslope/server/routes/api/admin/team/assignment/index.get.ts`

**Replace entire file:**
```typescript
// GET /api/admin/team/assignment/[id] - Get team assignment by ID

import {defineEventHandler, createError, getValidatedRouterParams} from "h3"
import {fetchCookingTeamAssignment} from "~~/server/data/prismaRepository"
import * as z from 'zod'
import eventHandlerHelper from "~~/server/utils/eventHandlerHelper"

const {h3eFromCatch} = eventHandlerHelper

// Define schema for ID parameter
const idSchema = z.object({
    id: z.coerce.number().int().positive('Assignment ID must be a positive integer')
})

export default defineEventHandler(async (event) => {
    const {cloudflare} = event.context
    const d1Client = cloudflare.env.DB

    // Input validation try-catch - FAIL EARLY
    let id
    try {
        const params = await getValidatedRouterParams(event, idSchema.parse)
        id = params.id
    } catch (error) {
        const h3e = h3eFromCatch('Input validation error for assignment', error)
        console.warn("👥🔗 > ASSIGNMENT > [GET] Input validation error:", h3e.statusMessage)
        throw h3e
    }

    let assignment
    // Database operations try-catch - separate concerns
    try {
        console.info("👥🔗 > ASSIGNMENT > [GET] Fetching assignment", "id", id)
        assignment = await fetchCookingTeamAssignment(d1Client, id)
    } catch (error: any) {
        const h3e = h3eFromCatch('Could not fetch assignment', error)
        console.warn(`👥🔗 > ASSIGNMENT > [GET] Error fetching assignment: ${h3e.statusMessage}`)
        throw h3e
    }

    if (!assignment) {
        const h3e = h3eFromCatch('Record does not exist', new Error(`Assignment with ID ${id} not found`))
        console.warn(`👥🔗 > ASSIGNMENT > [GET] Assignment not found: ${h3e.statusMessage}`)
        throw h3e
    }

    console.info("👥🔗 > ASSIGNMENT > [GET] Fetched assignment", "id", assignment.id)
    return assignment
})
```

---

## 6. Implementation Order & Strategy

### Phase 1: Fix Blocking Issues (2-3 hours)
**Goal:** Make tests runnable

1. **Fix SeasonFactory syntax errors** (Priority 1, Fixes 1-8)
   - Lines 108, 109, 143, 169
   - Rewrite `createCookingTeamWithMembersForSeason` (lines 162-200)
   - Fix `assignMemberToTeam` (lines 240-264)
   - Implement `removeMemberFromTeam` (lines 266-273)
   - Add missing import for `TeamRole`

2. **Fix repository transformation functions** (Priority 2, Fixes 5.3)
   - Update `fetchTeam` to transform assignments
   - Update `fetchTeams` to transform assignments

3. **Run basic team CRUD tests** to verify Phase 1
   ```bash
   npx playwright test tests/e2e/api/admin/team.e2e.spec.ts --grep "PUT.*should create a new team" --reporter=line
   ```

### Phase 2: Add Repository Functions (1-2 hours)
**Goal:** Enable assignment operations

1. **Add assignment repository functions** (Priority 2, Fix 5.2)
   - `createCookingTeamAssignment`
   - `fetchCookingTeamAssignment`
   - `updateCookingTeamAssignment`

2. **Test repository functions** with unit tests
   ```bash
   npx vitest run tests/component/data/prismaRepository.unit.spec.ts --grep "assignment"
   ```

### Phase 3: Implement Assignment Endpoints (1-2 hours)
**Goal:** Complete API surface

1. **Implement `PUT /api/admin/team/assignment`** (Priority 3, Fix 5.4)

2. **Implement `GET /api/admin/team/assignment/[id]`** (Priority 3, Fix 5.5)

3. **Test assignment endpoints individually**
   ```bash
   npx playwright test tests/e2e/api/admin/team.e2e.spec.ts --grep "assignment" --reporter=line
   ```

### Phase 4: Full Integration Testing (1 hour)
**Goal:** Verify complete feature

1. **Run all team tests**
   ```bash
   npx playwright test tests/e2e/api/admin/team.e2e.spec.ts --reporter=line
   ```

2. **Run cascade deletion tests** to verify ADR-005 compliance

3. **Verify validation tests** for error handling (ADR-002)

### Phase 5: Documentation & Cleanup (30 minutes)
**Goal:** Maintain project quality

1. Remove console.log statements (use console.info/warn/error only)
2. Update any TODO comments
3. Verify all tests pass
4. Review code against ADR-002, ADR-003, ADR-005

---

## 7. Architecture Compliance Review

### ADR-002: Error Handling Patterns ✅

**Assessment:** All implemented endpoints comply with ADR-002

**Evidence:**
- ✅ Separate try-catch for validation and business logic
- ✅ H3 validation methods used (`getValidatedRouterParams`, `readValidatedBody`)
- ✅ Appropriate status codes (400 for validation, 404 for not found, 500 for server errors)
- ✅ No nested try-catch blocks

**Example (team/[id].delete.ts):**
```typescript
// Validation try-catch
try {
    const params = await getValidatedRouterParams(event, idSchema.parse)
    id = params.id
} catch (error) {
    throw createError({ statusCode: 400, ... })
}

// Business logic try-catch
try {
    const deletedTeam = await deleteTeam(d1Client, id)
    return deletedTeam
} catch (error) {
    if (error.message?.includes('Record to delete does not exist')) {
        throw createError({ statusCode: 404, ... })
    }
    throw createError({ statusCode: 500, ... })
}
```

### ADR-003: Factory Pattern ⚠️

**Assessment:** Partially compliant - factories exist but have syntax errors

**Compliant Aspects:**
- ✅ Factory class structure (`SeasonFactory` in correct location)
- ✅ Static readonly methods
- ✅ Separation of data creation and HTTP operations
- ✅ Built-in assertions in HTTP methods

**Non-Compliant Aspects:**
- ❌ Syntax errors prevent execution
- ⚠️ Incomplete implementation of `createCookingTeamWithMembersForSeason`
- ❌ Missing implementation of `removeMemberFromTeam`

**Once Fixed:** ✅ Will be fully compliant

### ADR-005: Cascade Deletion ✅

**Assessment:** Fully compliant with proper cascade behavior

**Evidence:**
- ✅ Prisma schema uses `onDelete: Cascade` correctly
- ✅ Strong relations cascade (Team → Assignments)
- ✅ Weak relations set null (DinnerEvent → Team)
- ✅ Repository functions use single atomic operations
- ✅ No manual multi-step deletion (avoids race conditions)

**Example (prismaRepository.ts deleteTeam):**
```typescript
export async function deleteTeam(d1Client: D1Database, id: number): Promise<CookingTeam> {
    const prisma = await getPrismaClientConnection(d1Client)
    try {
        // Single atomic operation - cascade handled by schema
        const deletedTeam = await prisma.cookingTeam.delete({
            where: {id}
        })
        return deletedTeam
    } catch (error) {
        // Error handling
    }
}
```

**Test Coverage:** Tests verify cascade behavior (lines 51-72, 149-171)

---

## 8. Risk Assessment

### High Risk (Blocker Issues)
- ❌ **SeasonFactory syntax errors** - Prevents all tests from running
- ❌ **Missing repository functions** - Blocks assignment API implementation

### Medium Risk (Incomplete Features)
- ⚠️ **Assignment endpoints** - Feature partially unusable
- ⚠️ **Test coverage** - 40% of tests cannot run

### Low Risk (Quality Issues)
- ℹ️ **Console.log usage** - Should use console.info/warn/error (ADR-004)
- ℹ️ **Type definitions** - Minor type inconsistencies in factory

---

## 9. Success Criteria

### Definition of Done

**Phase 1 Complete:**
- [ ] All SeasonFactory syntax errors fixed
- [ ] Basic team CRUD tests pass (5 tests)
- [ ] Repository transformation functions work correctly

**Phase 2 Complete:**
- [ ] All 3 assignment repository functions implemented
- [ ] Unit tests for repository functions pass
- [ ] Repository functions follow ADR-002 error handling

**Phase 3 Complete:**
- [ ] `PUT /api/admin/team/assignment` fully implemented
- [ ] `GET /api/admin/team/assignment/[id]` fully implemented
- [ ] Assignment endpoint tests pass (3 tests)

**Phase 4 Complete:**
- [ ] All 15 E2E tests pass
- [ ] Cascade deletion tests verify ADR-005 compliance
- [ ] Validation tests verify ADR-002 compliance

**Phase 5 Complete:**
- [ ] Code reviewed against all ADRs
- [ ] Documentation updated
- [ ] No console.log statements remain
- [ ] All TODOs resolved or documented

### Acceptance Criteria

```bash
# All tests must pass
npx playwright test tests/e2e/api/admin/team.e2e.spec.ts

# Expected output:
# ✓ 15 passed (XXs)
# 0 flaky
# 0 skipped
# 0 failed
```

---

## 10. Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|---------------|
| Phase 1 | Fix syntax errors & transformations | 2-3 hours |
| Phase 2 | Add repository functions | 1-2 hours |
| Phase 3 | Implement endpoints | 1-2 hours |
| Phase 4 | Integration testing | 1 hour |
| Phase 5 | Documentation & cleanup | 30 minutes |
| **Total** | | **5.5-8.5 hours** |

**Confidence Level:** High (85%)

**Dependencies:**
- No blocking external dependencies
- All infrastructure already in place
- Clear implementation patterns established

---

## 11. Next Steps

### Immediate Actions (Senior Architect → Development Team)

1. **Review this plan** with the development team
2. **Assign phases** to developers based on availability
3. **Set up pair programming** for Phase 1 (critical fixes)
4. **Schedule code review** after Phase 3

### Development Workflow

```bash
# Create feature branch
git checkout -b cooking-teams-complete

# Phase 1: Fix syntax errors
# Edit: tests/e2e/testDataFactories/seasonFactory.ts
# Edit: server/data/prismaRepository.ts (fetchTeam, fetchTeams)

# Test Phase 1
npx playwright test tests/e2e/api/admin/team.e2e.spec.ts --grep "PUT.*create" --reporter=line

# Phase 2: Add repository functions
# Edit: server/data/prismaRepository.ts (add 3 functions)

# Phase 3: Implement endpoints
# Edit: server/routes/api/admin/team/assignment/index.put.ts
# Edit: server/routes/api/admin/team/assignment/index.get.ts

# Final test
npx playwright test tests/e2e/api/admin/team.e2e.spec.ts

# If all pass, commit and create PR
git add .
git commit -m "Complete cooking team implementation

- Fixed SeasonFactory syntax errors
- Added assignment repository functions
- Implemented assignment endpoints
- All 15 E2E tests passing
- ADR-002, ADR-003, ADR-005 compliant"

gh pr create --title "Complete Cooking Team Implementation" --body "..."
```

---

## 12. Appendix: Key File Locations

### Source Files
- **Prisma Schema:** `/Users/agatanoair/workspace/theslope/prisma/schema.prisma`
- **Repository:** `/Users/agatanoair/workspace/theslope/server/data/prismaRepository.ts`
- **Validation:** `/Users/agatanoair/workspace/theslope/app/composables/useCookingTeamValidation.ts`

### API Endpoints
- **Team CRUD:** `/Users/agatanoair/workspace/theslope/server/routes/api/admin/team/`
  - `index.put.ts` - Create team
  - `index.get.ts` - List teams
  - `[id].get.ts` - Get team details
  - `[id].post.ts` - Update team
  - `[id].delete.ts` - Delete team
- **Assignments:** `/Users/agatanoair/workspace/theslope/server/routes/api/admin/team/assignment/`
  - `index.put.ts` - Create assignment
  - `index.get.ts` - Get assignment (NEEDS IMPLEMENTATION)
  - `[id].delete.ts` - Delete assignment

### Test Files
- **E2E Tests:** `/Users/agatanoair/workspace/theslope/tests/e2e/api/admin/team.e2e.spec.ts`
- **SeasonFactory:** `/Users/agatanoair/workspace/theslope/tests/e2e/testDataFactories/seasonFactory.ts`
- **HouseholdFactory:** `/Users/agatanoair/workspace/theslope/tests/e2e/testDataFactories/householdFactory.ts`

### Documentation
- **ADRs:** `/Users/agatanoair/workspace/theslope/docs/adr.md`
- **This Plan:** `/Users/agatanoair/workspace/theslope/docs/cooking-team-implementation-plan.md`

---

## Conclusion

The cooking team implementation is approximately **70% complete** with well-architected foundations. The remaining work involves:

1. **Fixing syntax errors** (quick wins, 2-3 hours)
2. **Adding 3 repository functions** (straightforward, 1-2 hours)
3. **Implementing 2 API endpoints** (following existing patterns, 1-2 hours)

All architectural patterns (ADR-002, ADR-003, ADR-005) are correctly applied where implemented. Once the syntax errors are fixed, the tests will provide immediate validation of progress.

**Recommendation:** Proceed with Phase 1 immediately to unblock testing, then continue with Phases 2-5 in sequence.

---

**Document Version:** 1.0
**Last Updated:** 2025-09-29
**Prepared By:** Senior Architect