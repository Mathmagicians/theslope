# Feature: Heynabo Event Synchronization

**Status:** ✅ Complete | **Date:** 2025-01-30
**Updated:** 2025-12-04 (Status updated to reflect implementation)
**ADR Reference:** ADR-013 (External System Integration Pattern)

## Summary

Sync dinner events to Heynabo when chef announces, updates, or cancels. Chef owns the event in Heynabo (their credentials used).

## Data Flow

```
DinnerEvent State          Heynabo Action
─────────────────          ──────────────
SCHEDULED → ANNOUNCED      POST /members/events/ → store heynaboEventId
ANNOUNCED (menu update)    PUT /members/events/{id}
ANNOUNCED (picture upload) POST /members/events/{id}/image → store CDN URL
ANNOUNCED → CANCELLED      PUT /members/events/{id} status=CANCELLED
View dinner (no picture)   GET /members/events/{id} → lazy fetch picture URL
```

## Event Description Template

```
🤖 Denne begivenhed synkroniseres fra skraaningen.dk
⚠️ Ret ikke her - ændringer overskrives!

{menuDescription}

📅 Book din billet: skraaningen.dk/dinner?date={dd/mm/yy}

Madhold: {cookingTeamName}
```

## Implementation Plan (TDD Style)

### Phase 1: E2E Tests & Factory (RED) ✅ COMPLETE
- [x] `DinnerEventFactory.cleanupHeynaboEvents()` added
- [x] E2E test: `tests/e2e/api/chef/dinnerAnnounce.e2e.spec.ts`
  - [x] GIVEN scheduled dinner WHEN announce THEN heynaboEventId stored
  - [x] GIVEN announced dinner WHEN update menu THEN Heynabo event updated
  - [x] GIVEN announced dinner WHEN cancel THEN Heynabo event cancelled
  - [x] GIVEN announced dinner WHEN fetch THEN picture URL lazy-synced

### Phase 2: Validation & Transformation (GREEN)
- [ ] `HeynaboEventCreateSchema` in `useHeynaboValidation.ts`
- [ ] `HeynaboEventResponseSchema` in `useHeynaboValidation.ts`
- [ ] `createHeynaboEventPayload(dinnerEvent, dinnerUrl)` transformation
- [ ] Unit tests for transformation function

### Phase 3: Heynabo Client Extension (GREEN)
- [ ] `createEvent(token, payload)` → returns eventId
- [ ] `updateEvent(token, eventId, payload)`
- [ ] `cancelEvent(token, eventId)`
- [ ] `fetchEvent(token, eventId)` → for picture URL

### Phase 4: API Endpoints (GREEN)
- [ ] `POST /api/chef/dinner/[id]/announce.post.ts`
- [ ] Update `updateDinnerEvent()` to sync if `heynaboEventId` exists
- [ ] Update cancel flow to sync cancellation

### Phase 5: Picture Handling (GREEN)
- [ ] `POST /api/chef/dinner/[id]/picture.post.ts`
- [ ] `uploadEventImage(token, eventId, image)` in client
- [ ] Lazy picture fetch in `fetchDinnerEvent()`

### Phase 6: UI Integration
- [ ] "Announce" button in chef view
- [ ] Picture upload component
- [ ] Heynabo sync status indicator

### Cleanup Strategy
- E2E tests cleanup Heynabo events in `afterAll` via factory
- Use `testSalt` for unique dinner titles (parallel test safety)
- Factory tracks created `heynaboEventId`s for cleanup

## Authentication

Chef's Heynabo token already in session (from login):
```typescript
const session = await getUserSession(event)
const heynaboToken = session.user.passwordHash
```

## Error Handling

```typescript
// Local state change succeeds, inform user if sync fails
try {
  await syncToHeynabo(dinnerEvent, token)
} catch (error) {
  throw createError({
    statusCode: 502,
    message: 'Middagen er opdateret, men Heynabo-synkronisering fejlede.'
  })
}
```

## Open Questions

1. Heynabo event time: Fixed 18:00-19:00 or configurable?
2. Picture size limits for Heynabo upload?
3. Should we show "synced to Heynabo" badge on dinner cards?
