import type {Season} from '~/composables/useSeasonValidation'
import type {CookingTeamDisplay, CookingTeamDetail, CookingTeamAssignment} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay, DinnerEventDetail} from '~/composables/useBookingValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {handleApiError} = useApiHandler()
        const {SeasonSchema} = useSeasonValidation()
        const authStore = useAuthStore()
        const {isAdmin} = storeToRefs(authStore)

        // ========================================
        // State - useAsyncData/useFetch with status exposed internally
        // ========================================
        // DATA FETCHING - Per ADR-007, prefer useAsyncData for explicit refresh control
        // HTTP JSON converts Date objects to ISO strings during transport
        // SeasonSchema.parse converts ISO strings back to Date objects via dateRangeSchema union

        // Fetch active season ID (static endpoint)
        const {
            data: activeSeasonId, status: activeSeasonIdStatus,
            error: activeSeasonIdError, refresh: refreshActiveSeasonId
        } = useFetch<number | null>(
            '/api/admin/season/active',
            {
                key: 'plan-store-active-season-id',
                immediate: true,
                default: () => null,
                transform: (value) => value ?? null  // Explicit null coercion to silence Nuxt warning
            }
        )


        const {
            data: seasons, status: seasonsStatus,
            error: seasonsError, refresh: refreshSeasons
        } = useFetch<Season[]>(
            '/api/admin/season',
            {
                key: 'plan-store-seasons',
                watch: false,
                default: () => [],
                transform: (data: any[]) => {
                    // Repository validates data per ADR-010, so we can trust it's valid
                    return data.map(season => SeasonSchema.parse(season))
                }
            }
        )

        // Use useAsyncData for detail endpoint - allows manual execute() without context issues
        const selectedSeasonId = ref<number | null>(null)
        const selectedSeasonKey = computed(() => `/api/admin/season/${selectedSeasonId.value || 'null'}`)

        const {
            data: selectedSeason, status: selectedSeasonStatus,
            error: selectedSeasonError, refresh: refreshSelectedSeason
        } = useAsyncData<Season | null>(
            selectedSeasonKey,
            () => {
                if (!selectedSeasonId.value) return Promise.resolve(null)
                return $fetch(`/api/admin/season/${selectedSeasonId.value}`)
            },
            {
                default: () => null,
                transform: (data: any) => data ? SeasonSchema.parse(data) : null
            }
        )

        // Fetch cooking team detail (ADR-009: Detail data with dinnerEvents)
        // No store state - components use useAsyncData with this function
        // Pattern: Store provides fetch logic, components manage their own data
        const fetchTeamDetail = (teamId: number): Promise<CookingTeamDetail> => {
            return $fetch(`/api/admin/team/${teamId}`)
        }

        // Create team operation - useAsyncData pattern for mutations
        const createTeamData = ref<CookingTeamDetail | CookingTeamDetail[]>([])
        const {
            status: createTeamStatus,
            error: createTeamError,
            execute: executeCreateTeam
        } = useAsyncData(
            'plan-store-create-team',
            () => Promise.resolve(createTeamData.value),
            {
                immediate: false,
                default: () => []
            }
        )


        // ========================================
        // Computed - Public API (derived from status)
        // ========================================
        const isActiveSeasonIdLoading = computed(() => activeSeasonIdStatus.value === 'pending')
        const isActiveSeasonIdErrored = computed(() => activeSeasonIdStatus.value === 'error')
        const isActiveSeasonIdInitialized = computed(() => activeSeasonIdStatus.value === 'success')

        const isSeasonsLoading = computed(() => seasonsStatus.value === 'pending')
        const isSeasonsErrored = computed(() => seasonsStatus.value === 'error')
        const isSeasonsInitialized = computed(() => seasonsStatus.value === 'success')
        const isNoSeasons = computed(() => isSeasonsInitialized.value && seasons.value.length === 0)

        const isSelectedSeasonLoading = computed(() => {
            // When there are no seasons, nothing to load
            if (isNoSeasons.value) return false
            return selectedSeasonStatus.value === 'pending'
        })
        const isSelectedSeasonErrored = computed(() => selectedSeasonStatus.value === 'error')
        const isSelectedSeasonInitialized = computed(() => {
            // When there are no seasons, consider it initialized (nothing to select)
            if (isNoSeasons.value) return true
            // Otherwise wait for a season to be selected and loaded
            return selectedSeasonStatus.value === 'success' && selectedSeason.value !== null
        })

        // Convenience computed for components - true when store is fully initialized and ready to use
        const isPlanStoreReady = computed(() =>
            isSeasonsInitialized.value &&
            isActiveSeasonIdInitialized.value &&
            (isNoSeasons.value || isSelectedSeasonInitialized.value)
        )

        // Overall error state - true if ANY dependency failed (prevents infinite loading)
        const isPlanStoreErrored = computed(() =>
            isSeasonsErrored.value || isActiveSeasonIdErrored.value || isSelectedSeasonErrored.value
        )

        // First error encountered (for display)
        const planStoreError = computed(() =>
            seasonsError.value || activeSeasonIdError.value || selectedSeasonError.value
        )

        // Active season - the community's currently active season (by activeSeasonId)
        const activeSeason = computed(() => {
            if (!activeSeasonId.value) return null
            return seasons.value.find(s => s.id === activeSeasonId.value) ?? null
        })

        // Team creation status
        const isCreatingTeams = computed(() => createTeamStatus.value === 'pending')

        const disabledModes = computed(() => {
            const disabledSet: Set<FormMode> = new Set()
            if (isNoSeasons.value) {
                disabledSet.add(FORM_MODES.EDIT)
            }
            if (!isAdmin.value) {
                disabledSet.add(FORM_MODES.CREATE)
                disabledSet.add(FORM_MODES.EDIT)
            }
            return [...disabledSet]
        })

        // ACTIONS
        const loadSeasons = async () => {
            await refreshSeasons()
            if (seasonsError.value) {
                console.error(`🗓️ > PLAN_STORE > Error loading seasons:`, seasonsError.value)
                throw seasonsError.value
            }
            console.info(`🗓️ > PLAN_STORE > Loaded ${seasons.value.length} seasons`)
        }

        const loadSeason = (id: number) => {
            selectedSeasonId.value = id
            // Setting selectedSeasonId triggers reactive useAsyncData fetch
            // Logging happens immediately but data may still be loading
            console.info(`🗓️ > PLAN_STORE > Loading season ID: ${id}`)
        }

    const loadActiveSeason = async () => {
        await refreshActiveSeasonId()
        if (activeSeasonIdError.value) {
            console.error('🗓️ > PLAN_STORE > Error loading active season ID:', activeSeasonIdError.value)
            throw activeSeasonIdError.value
        }
        console.info('🗓️ > PLAN_STORE > Loaded active season ID:', activeSeasonId.value)
    }

        // Helper: Get default season ID (active season or first available)
        const getDefaultSeasonId = (): number | null => {
            if (activeSeasonId.value) {
                console.info(LOG_CTX, `🗓️ > Using active season ID: ${activeSeasonId.value}`)
                return activeSeasonId.value
            } else if (seasons.value.length > 0) {
                const {sortSeasonsByActivePriority} = useSeason()
                const sortedSeasons = sortSeasonsByActivePriority(seasons.value)
                const firstId = sortedSeasons[0]?.id ?? null
                console.info(LOG_CTX, `🗓️ > No active season, using first sorted season ID: ${firstId}`)
                return firstId
            }
            console.warn(LOG_CTX, '🗓️ > No seasons available, cannot determine default')
            return null
        }

        const loadSeasonByShortName = (shortName: string) => {
            const season = seasons.value.find(s => s.shortName === shortName)
            if (season?.id) {
                loadSeason(season.id)
            } else {
                console.warn(LOG_CTX, `🗓️ > No season found with shortName "${shortName}", falling back to default`)
                const defaultId = getDefaultSeasonId()
                if (defaultId) loadSeason(defaultId)
            }
        }

        const onSeasonSelect = (id: number) => {
            loadSeason(id)
        }

        const createSeason = async (season: Season): Promise<Season> => {
            try {
                // API accepts domain objects (JSON.stringify converts Date to ISO strings)
                const createdSeason = await $fetch<Season>('/api/admin/season', {
                    method: 'PUT',
                    body: season,
                    headers: {'Content-Type': 'application/json'}
                })
                await loadSeasons()
                return createdSeason
            } catch (e: unknown) {
                handleApiError(e, 'createSeason')
                throw e
            }
        }

        const generateDinnerEvents = async (seasonId: number) => {
            try {
                const result = await $fetch<{
                    seasonId: number,
                    eventCount: number,
                    events: any[]
                }>(`/api/admin/season/${seasonId}/generate-dinner-events`, {
                    method: 'POST'
                })
                console.info(`🗓️ > PLAN_STORE > Generated ${result.eventCount} dinner events for season ${seasonId}`)
                return result
            } catch (e: unknown) {
                handleApiError(e, 'generateDinnerEvents')
                throw e
            }
        }

        const assignTeamAffinitiesAndEvents = async (seasonId: number) => {
            try {
                // Step 1: Assign affinities to teams
                const affinityResult = await $fetch<{
                    seasonId: number,
                    teamCount: number,
                    teams: CookingTeamDisplay[]
                }>(`/api/admin/season/${seasonId}/assign-team-affinities`, {
                    method: 'POST'
                })
                console.info(`👥 > PLAN_STORE > Assigned affinities to ${affinityResult.teamCount} teams for season ${seasonId}`)

                // Step 2: Assign teams to dinner events
                const assignmentResult = await $fetch<{
                    seasonId: number,
                    eventCount: number,
                    events: DinnerEventDisplay[]
                }>(`/api/admin/season/${seasonId}/assign-cooking-teams`, {
                    method: 'POST'
                })
                console.info(`🍽️ > PLAN_STORE > Assigned teams to ${assignmentResult.eventCount} dinner events for season ${seasonId}`)

                // Refresh selected season to get updated teams with affinities and event assignments
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
                return {
                    teamCount: affinityResult.teamCount,
                    eventCount: assignmentResult.eventCount
                }
            } catch (e: unknown) {
                handleApiError(e, 'assignTeamAffinitiesAndEvents')
                throw e
            }
        }

        const updateSeason = async (season: Season) => {
            try {
                // API accepts domain objects (JSON.stringify converts Date to ISO strings)
                await $fetch(`/api/admin/season/${season.id}`, {
                    method: 'POST',
                    body: season,
                    headers: {'Content-Type': 'application/json'}
                })
                await loadSeasons()
                // Refresh the selected season to get updated data
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
            } catch (e: unknown) {
                handleApiError(e, 'updateSeason')
                throw e
            }
        }

        const activateSeason = async (seasonId: number) => {
            try {
                console.info(`🌞 > PLAN_STORE > Activating season ${seasonId}`)
                await $fetch<Season>('/api/admin/season/active', {
                    method: 'POST',
                    body: {seasonId},
                    headers: {'Content-Type': 'application/json'}
                })
                // Refresh
                await loadActiveSeason()
                await loadSeasons()
                // Switch to the newly activated season
                loadSeason(seasonId)
                console.info(`🌞 > PLAN_STORE > Successfully activated season ${seasonId}`)
            } catch (e: unknown) {
                handleApiError(e, 'activateSeason')
                throw e
            }
        }

        // COOKING TEAM ACTIONS - Part of Season aggregate (ADR-005)
        const createTeam = async (teamOrTeams: CookingTeamDetail | CookingTeamDetail[]): Promise<CookingTeamDetail[]> => {
            const teams = Array.isArray(teamOrTeams) ? teamOrTeams : [teamOrTeams]

            createTeamData.value = await $fetch<CookingTeamDetail[]>('/api/admin/team', {
                method: 'PUT',
                body: teams,
                headers: {'Content-Type': 'application/json'}
            })

            await executeCreateTeam()

            if (createTeamError.value) {
                handleApiError(createTeamError.value, 'createTeam')
                throw createTeamError.value
            }

            console.info(`👥 > PLAN_STORE > Created ${createTeamData.value.length} team(s)`)

            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }

            return Array.isArray(createTeamData.value) ? createTeamData.value : [createTeamData.value]
        }

        const updateTeam = async (team: CookingTeamDetail) => {
            try {
                await $fetch(`/api/admin/team/${team.id}`, {
                    method: 'post',
                    body: team,
                    headers: {'Content-Type': 'application/json'}
                })
                console.info(`👥 > PLAN_STORE > Updated team "${team.name}"`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
            } catch (e: unknown) {
                handleApiError(e, 'updateTeam')
                throw e
            }
        }

        const deleteTeam = async (teamId: number) => {
            try {
                await $fetch(`/api/admin/team/${teamId}`, {
                    method: 'DELETE'
                })
                console.info(`👥 > PLAN_STORE > Deleted team ${teamId}`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
            } catch (e: unknown) {
                handleApiError(e, 'deleteTeam')
                throw e
            }
        }

        // TEAM MEMBER ASSIGNMENT ACTIONS - Part of Team aggregate (ADR-005)
        const addTeamMember = async (assignment: CookingTeamAssignment): Promise<CookingTeamAssignment> => {
            try {
                const created = await $fetch<CookingTeamAssignment>('/api/admin/team/assignment', {
                    method: 'PUT',
                    body: assignment,
                    headers: {'Content-Type': 'application/json'}
                })
                console.info(`👥🔗 > PLAN_STORE > Added member ${assignment.inhabitantId} to team ${assignment.cookingTeamId} as ${assignment.role}`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
                return created
            } catch (e: unknown) {
                handleApiError(e, 'addTeamMember')
                throw e
            }
        }

        const removeTeamMember = async (assignmentId: number) => {
            try {
                await $fetch(`/api/admin/team/assignment/${assignmentId}`, {
                    method: 'DELETE'
                })
                console.info(`👥🔗 > PLAN_STORE > Removed team member assignment ${assignmentId}`)
                // Refresh selected season to get updated teams
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
            } catch (e: unknown) {
                handleApiError(e, 'removeTeamMember')
                throw e
            }
        }

        // DINNER EVENT ACTIONS
        const assignRoleToDinner = async (dinnerEventId: number, inhabitantId: number, role: CookingTeamAssignment['role']): Promise<DinnerEventDetail> => {
            try {
                const roleEmoji = role === 'CHEF' ? '👨‍🍳' : role === 'COOK' ? '👥' : '🌱'
                const updated = await $fetch<DinnerEventDetail>(`/api/team/cooking/${dinnerEventId}/assign-role`, {
                    method: 'POST',
                    body: { inhabitantId, role },
                    headers: {'Content-Type': 'application/json'}
                })
                console.info(`${roleEmoji} > PLAN_STORE > Assigned ${role} role to inhabitant ${inhabitantId} for dinner event ${dinnerEventId}`)
                // Refresh selected season to get updated dinner events and team assignments
                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
                return updated
            } catch (e: unknown) {
                handleApiError(e, 'assignRoleToDinner')
                throw e
            }
        }

        const initPlanStore = (shortName?: string) => {
            console.info(LOG_CTX, '🗓️ > PLAN_STORE > initPlanStore > shortName:', shortName,
                'selected:', selectedSeasonId.value, 'active:', activeSeasonId.value)
            if (shortName) {
                loadSeasonByShortName(shortName)  // Handles fallback if shortName is invalid
            } else {
                const defaultId = getDefaultSeasonId()
                if (defaultId) loadSeason(defaultId)
            }
        }

        // AUTO-INITIALIZATION - Watch for data to load, then auto-select active season
        // Don't call initPlanStore immediately - wait for both data sources to load
        watch([isSeasonsInitialized, isActiveSeasonIdInitialized], () => {
            if (!isSeasonsInitialized.value) return
            if (!isActiveSeasonIdInitialized.value) return // Wait for activeSeasonId to load
            if (selectedSeasonId.value !== null) return // Already selected

            console.info(LOG_CTX, '🗓️ > PLAN_STORE > Data loaded, calling initPlanStore')
            initPlanStore()
        }, { immediate: true }) // Check immediately in case data is already loaded


        return {
            // state
            selectedSeason,
            seasons,
            // computed state
            isActiveSeasonIdLoading,
            isActiveSeasonIdErrored,
            isActiveSeasonIdInitialized,
            activeSeasonIdError,
            isSeasonsLoading,
            isNoSeasons,
            isSeasonsErrored,
            isSeasonsInitialized,
            seasonsError,
            isSelectedSeasonLoading,
            isSelectedSeasonErrored,
            isSelectedSeasonInitialized,
            selectedSeasonError,
            isPlanStoreReady,
            isPlanStoreErrored,
            planStoreError,
            activeSeason,
            disabledModes,
            isCreatingTeams,
            // actions
            initPlanStore,
            loadSeasons,
            onSeasonSelect,
            fetchTeamDetail,  // Fetch function, not state
            createSeason,
            updateSeason,
            activateSeason,
            generateDinnerEvents,
            assignTeamAffinitiesAndEvents,
            createTeam,
            updateTeam,
            deleteTeam,
            addTeamMember,
            removeTeamMember,
            assignRoleToDinner
        }
    }
)

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
