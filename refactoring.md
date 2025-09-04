# URL State Management Refactoring

## Overview

This document outlines the approach for replacing local storage with URL-based state management to enable bookmarking and sharing of the admin interface state, including:

1. Tab selection (component navigation)
2. Form mode (create, edit, view)
3. Form content (season data)

## URL Structure Examples

### Current State
```
/admin
```

### With Tab Navigation
```
/admin#adminplanning
```

### With Tab Navigation + Form Mode
```
/admin#adminplanning?mode=edit
```

### With Tab Navigation + Form Mode + All Form Data (full serialization)
```
/admin#adminplanning?mode=edit&seasonDates={"start":"01/08/2025","end":"30/06/2026"}&cookingDays={"mandag":true,"tirsdag":false,"onsdag":true,"torsdag":false,"fredag":true,"loerdag":false,"soendag":false}&holidays=[{"start":"24/12/2025","end":"02/01/2026"}]&ticketIsCancellableDaysBefore=2&diningModeIsEditableMinutesBefore=30
```

## Implementation Changes

### 1. Remove Local Storage Code ✅

### 2. Add URL-based State Management

#### Parent Page Tab Navigation (admin/index.vue) ✅


#### Leveraging useSeason for URL State Management

Instead of creating a new composable, we'll leverage the existing `useSeason` composable and its serialization functions:

```typescript
// Add to script setup in AdminPlanning.vue
const route = useRoute()
const router = useRouter()
const { serializeSeason, deserializeSeason } = useSeason()

// Update URL with form mode
const updateFormModeInUrl = (mode: FormMode): void => {
  router.replace({
    hash: route.hash,
    query: {
      ...route.query,
      mode
    }
  })
}

// Get form mode from URL
const getFormModeFromUrl = (): FormMode | undefined => {
  const modeParam = route.query.mode as string
  return Object.values(FORM_MODES).includes(modeParam as FormMode) 
    ? modeParam as FormMode 
    : undefined
}

// Initialize form mode from URL parameter
onMounted(() => {
  const urlMode = getFormModeFromUrl()
  if (urlMode) {
    onModeChange(urlMode)
  }
})

// Update URL when form mode changes
watch(formMode, (newMode) => {
  updateFormModeInUrl(newMode)
})
```

#### Form Data Management in AdminSeason.vue

```typescript
// Add to script setup in AdminPlanningSeason.vue
const route = useRoute()
const router = useRouter()
const { serializeSeason, deserializeSeason } = useSeason()

// Update URL with season data
const updateSeasonInUrl = (season: Season): void => {
  // Use the existing serializer
  const serialized = serializeSeason(season)
  
  router.replace({
    hash: route.hash,
    query: {
      ...route.query,
      seasonDates: serialized.seasonDates,
      cookingDays: serialized.cookingDays,
      holidays: serialized.holidays,
      ticketIsCancellableDaysBefore: String(season.ticketIsCancellableDaysBefore),
      diningModeIsEditableMinutesBefore: String(season.diningModeIsEditableMinutesBefore)
    }
  })
}

// Get season data from URL
const getSeasonFromUrl = (): Partial<Season> => {
  const query = route.query as Record<string, string>
  
  if (query.seasonDates && query.cookingDays) {
    try {
      // Create a partial SerializedSeason object from URL parameters
      const serialized = {
        seasonDates: query.seasonDates,
        cookingDays: query.cookingDays,
        holidays: query.holidays || '[]',
        ticketIsCancellableDaysBefore: Number(query.ticketIsCancellableDaysBefore || '0'),
        diningModeIsEditableMinutesBefore: Number(query.diningModeIsEditableMinutesBefore || '0')
      }
      
      // Use existing deserializer
      return deserializeSeason(serialized as any)
    } catch (e) {
      console.error('Error deserializing from URL', e)
    }
  }
  
  return {}
}

// Apply URL parameters to form on mount
onMounted(() => {
  if (props.mode === 'create' || props.mode === 'edit') {
    const urlSeason = getSeasonFromUrl()
    
    // Apply URL parameters to the model if they exist
    if (Object.keys(urlSeason).length > 0) {
      // Merge with existing model to preserve any fields not in URL
      model.value = {
        ...model.value,
        ...urlSeason
      }
    }
  }
})

// Update URL when form values change
watch(model, (newModel) => {
  if (props.mode === 'create' || props.mode === 'edit') {
    updateSeasonInUrl(newModel)
  }
}, { deep: true })
```

## Benefits

1. **Shareable URLs**: Users can bookmark or share specific states of the admin interface
2. **Persistent State**: Form data persists through page refreshes
3. **Leverages Existing Code**: Uses the established serialization functions from `useSeason`
4. **Clean Separation of Concerns**:
   - Parent handles tab navigation (via hash)
   - Components handle their own form state (via query params)
5. **Improved Privacy**: No data stored in browser local storage
6. **Simpler Code**: Removes complexity of local storage management, reuses existing serializers

## SSR Compatibility

This URL-based approach works well with Nuxt's Server-Side Rendering (SSR) because:

1. **Hash fragments are client-side only**:
   - Hash fragments (#) are not sent to the server, allowing the server to render the base page
   - Client-side JavaScript handles hash-based navigation after hydration

2. **Query parameters are SSR-friendly**:
   - Query parameters are available during SSR through the `useRoute()` composable
   - The server can render the initial state based on URL query parameters
   - Works in both server and client contexts

3. **Proper hydration flow**:
   - Server renders the initial component structure
   - Client hydrates the page and then enhances with URL-driven state
   - Uses `onMounted()` hooks to ensure client-side URL handling happens after hydration

4. **Conditional server/client execution**:
   - Uses Vue's patterns to handle code that should only run in client context
   - No "flash of content" when moving from server-rendered to client-enhanced view

Unlike local storage (which is entirely client-side), this URL approach integrates with SSR by allowing both server and client to participate in state management, with a clean transition between the two.

## Implementation Steps

1. Remove local storage code from the project
   - Delete `useDraftStorage.ts`
   - Update `plan.ts` store to remove local storage dependencies
2. Implement hash-based tab navigation in admin/index.vue
3. Add URL state management to AdminPlanning.vue for form mode
4. Add URL state management to AdminSeason.vue for form data

## Testing Considerations

1. **Navigation**:
   - Verify correct tab activates when using hash URLs
   - Test browser back/forward navigation
   - Ensure URL updates when changing tabs

2. **Form Mode**:
   - Test form mode changes update URL correctly
   - Verify URL with mode parameter loads correct form mode

3. **Form Data**:
   - Test serialization and deserialization of season data
   - Verify that complex objects (dates, arrays, maps) are correctly saved/restored
   - Verify bookmarking a URL with form data restores the form state
   - Test error handling when URL parameters are invalid

4. **Deep Linking**:
   - Test directly navigating to a URL with all parameters
   - Verify full application state restores from URL
