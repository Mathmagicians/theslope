# URL State Management

## Final Architecture

### 1. Path-Based Tab Navigation ✅

```
/admin/planning
/admin/users
/admin/households
/admin/allergies
/admin/economy
/admin/settings
```

**Implementation:** `app/pages/admin/[tab].vue`

**Features:**
- Clean, bookmarkable URLs
- Browser back/forward navigation
- Invalid paths redirect to `/admin/planning`

**Tests:** `tests/e2e/ui/admin.e2e.spec.ts:31-127` ✅

---

### 2. Form Mode Query Parameter ✅

```
/admin/planning?mode=view
/admin/planning?mode=edit
/admin/planning?mode=create
```

**Implementation:** `app/components/admin/AdminPlanning.vue` (lines 62-88)

**Features:**
- Form mode persists in URL
- Mode changes update URL automatically
- Restores mode from URL on page load

**Tests:** `tests/e2e/ui/admin.e2e.spec.ts:129-153` ✅

---

### 3. Client-Side Draft State

**Implementation:** `app/stores/plan.ts:14` (`draftSeason` ref)

**Features:**
- In-memory draft for create/edit modes
- Clears on mode change
- Resets to default on cancel

**Note:** This is client-side only (Vue ref), not persisted to database.

---

## URL Examples

| Action | URL |
|--------|-----|
| View planning tab | `/admin/planning` |
| Create new season | `/admin/planning?mode=create` |
| Edit existing season | `/admin/planning?mode=edit` |
| Switch to users tab | `/admin/users` |
| Invalid tab fallback | `/admin/unicorn` → `/admin/planning` |