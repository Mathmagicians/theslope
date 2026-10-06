import type {Season, SeasonUpdateResponse} from '~/composables/useSeasonValidation'
import type {CookingTeamDisplay, CookingTeamDetail, CookingTeamAssignment, CookingTeamCreate, CookingTeamUpdate, CookingTeamAssignmentCreate, CreateTeamsResponse, TeamRole} from '~/composables/useCookingTeamValidation'
import type {DinnerEventDisplay, DinnerEventDetail, MenuSwapStrategy} from '~/composables/useBookingValidation'
import {FORM_MODES, type FormMode} from '~/types/form'

export const usePlanStore = defineStore("Plan", () => {
        // DEPENDENCIES
        const {storeAsyncData, apiRequest} = useApiHandler()
        const {SeasonSchema, SeasonUpdateResponseSchema, ActiveSeasonIdSchema} = useSeasonValidation()
        const authStore = useAuthStore()
        const {isAdmin} = storeToRefs(authStore)

        // ========================================
        // State (ADR-007)
        // ========================================

        const {
            data: activeSeasonId, status: activeSeasonIdStatus,
            error: activeSeasonIdError, refresh: refreshActiveSeasonId
        } = storeAsyncData('plan-store-active-season-id', '/api/admin/season/active', {
            schema: ActiveSeasonIdSchema,
            default: () => null
        })

        const {
            data: seasons, status: seasonsStatus,
            error: seasonsError, refresh: refreshSeasons
        } = storeAsyncData('plan-store-seasons', '/api/admin/season', {
            schema: SeasonSchema.array(),
            default: () => []
        })

        const selectedSeasonId = ref<number | null>(null)
        const selectedSeasonKey = computed(() => `/api/admin/season/${selectedSeasonId.value || 'null'}`)

        const {
            data: selectedSeason, status: selectedSeasonStatus,
            error: selectedSeasonError, refresh: refreshSelectedSeason
        } = storeAsyncData(
            selectedSeasonKey,
            () => {
                if (!selectedSeasonId.value) return null
                return `/api/admin/season/${selectedSeasonId.value}`
            },
            {
                schema: SeasonSchema.nullable(),
                default: () => null,
                errorMessage: 'Kunne ikke hente sæson'
            }
        )

        // Fetch cooking team detail (ADR-009: Detail data with dinnerEvents)
        // No store state - components use useAsyncData with this function
        const {CookingTeamDetailSchema, CreateTeamsResponseSchema} = useCookingTeamValidation()
        const fetchTeamDetail = (teamId: number): Promise<CookingTeamDetail> =>
            apiRequest(`/api/admin/team/${teamId}`, {schema: CookingTeamDetailSchema, action: 'fetchTeamDetail'})

        const isCreatingTeams = ref(false)
        const isSavingSeason = ref(false)
        const isActivatingSeason = ref(false)

        // Toast descriptions report what a save set in motion (ADR-009 operation results)
        const formatSeasonUpdate = (result: SeasonUpdateResponse): string => {
            const {created, deleted} = result.reconciliation
            const sentences = [`${created} datoer tilføjet, ${deleted} fjernet.`]
            if (result.scaffold) sentences.push('Forudbestillinger er opdateret.')
            if (created > 0) sentences.push('Husk at tildele madhold til nye datoer.')
            return sentences.join(' ')
        }
        const formatCreateTeams = ({teams, eventsAssigned}: CreateTeamsResponse): string =>
            `${teams.length} madhold oprettet · ${eventsAssigned} madlavninger tildelt`

        const toast = useToast()
        const toastSaved = (title: string, description?: string) =>
            toast.add({title, description, icon: ICONS.checkCircle, color: COLOR.success})

        // ========================================
        // Computed - Public API (derived from status)
        // ========================================
        const isActiveSeasonIdLoading = computed(() => activeSeasonIdStatus.value === 'pending')
        const isActiveSeasonIdErrored = computed(() => activeSeasonIdStatus.value === 'error')
        const isActiveSeasonIdInitialized = computed(() => activeSeasonIdStatus.value === 'success')

        // Compound state: true while API call OR subsequent refreshes are in progress
        const isSavingSeasonFlowInProgress = computed(() =>
            isSavingSeason.value || isSeasonsLoading.value
        )

        // Compound state: true while API call OR subsequent refreshes are in progress
        const isActivatingSeasonFlowInProgress = computed(() =>
            isActivatingSeason.value || isSeasonsLoading.value || isActiveSeasonIdLoading.value
        )

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
            if (seasonsError.value) throw seasonsError.value
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
        if (activeSeasonIdError.value) throw activeSeasonIdError.value
        console.info('🗓️ > PLAN_STORE > Loaded active season ID:', activeSeasonId.value)
    }

        // Helper: Get default season ID (active season or first available)
        const getDefaultSeasonId = (): number | null => {
            if (activeSeasonId.value) {
                console.info(`${LOG_CTX} 🗓️ > Using active season ID: ${activeSeasonId.value}`)
                return activeSeasonId.value
            } else if (seasons.value.length > 0) {
                const {sortSeasonsByActivePriority} = useSeason()
                const sortedSeasons = sortSeasonsByActivePriority(seasons.value)
                const firstId = sortedSeasons[0]?.id ?? null
                console.info(`${LOG_CTX} 🗓️ > No active season, using first sorted season ID: ${firstId}`)
                return firstId
            }
            console.warn(`${LOG_CTX} 🗓️ > No seasons available, cannot determine default`)
            return null
        }

        const loadSeasonByShortName = (shortName: string) => {
            const season = seasons.value.find(s => s.shortName === shortName)
            if (season?.id) {
                loadSeason(season.id)
            } else {
                console.warn(`${LOG_CTX} 🗓️ > No season found with shortName "${shortName}", falling back to default`)
                const defaultId = getDefaultSeasonId()
                if (defaultId) loadSeason(defaultId)
            }
        }

        const onSeasonSelect = (id: number) => {
            loadSeason(id)
        }

        // Resolves null when the save fails; apiRequest has already toasted the error
        const saveSeason = async <T>(request: () => Promise<T>): Promise<T | null> => {
            isSavingSeason.value = true
            try {
                return await request()
            } catch {
                return null
            } finally {
                isSavingSeason.value = false
            }
        }

        const createSeason = async (season: Season): Promise<Season | null> => {
            const created = await saveSeason(() => apiRequest('/api/admin/season', {method: 'PUT', body: season, action: 'createSeason'}))
            if (created === null) return null

            await loadSeasons()
            toastSaved('Sæson oprettet')
            return season
        }

        const assignTeamAffinitiesAndEvents = async (seasonId: number) => {
            // Step 1: Assign affinities to teams
            const affinityResult = await apiRequest<{
                seasonId: number,
                teamCount: number,
                teams: CookingTeamDisplay[]
            }>(`/api/admin/season/${seasonId}/assign-team-affinities`, {method: 'POST', action: 'assignTeamAffinitiesAndEvents'})
            console.info(`👥 > PLAN_STORE > Assigned affinities to ${affinityResult.teamCount} teams for season ${seasonId}`)

            // Step 2: Assign teams to dinner events
            const assignmentResult = await apiRequest<{
                seasonId: number,
                eventCount: number,
                events: DinnerEventDisplay[]
            }>(`/api/admin/season/${seasonId}/assign-cooking-teams`, {method: 'POST', action: 'assignTeamAffinitiesAndEvents'})
            console.info(`🍽️ > PLAN_STORE > Assigned teams to ${assignmentResult.eventCount} dinner events for season ${seasonId}`)

            // Refresh selected season to get updated teams with affinities and event assignments
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
            return {
                teamCount: affinityResult.teamCount,
                eventCount: assignmentResult.eventCount
            }
        }

        // Returns the operation envelope (ADR-009) so callers can report what the save changed
        const updateSeason = async (season: Season): Promise<SeasonUpdateResponse | null> => {
            const result = await saveSeason(() => apiRequest(`/api/admin/season/${season.id}`, {
                method: 'POST',
                body: season,
                schema: SeasonUpdateResponseSchema,
                action: 'updateSeason'
            }))
            if (result === null) return null

            await loadSeasons()
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
            toastSaved('Sæson opdateret', formatSeasonUpdate(result))
            return result
        }

        // Shared implementation for activate/deactivate
        const executeSeasonActivation = async (seasonId: number | null) => {
            isActivatingSeason.value = true
            try {
                await (seasonId
                    ? apiRequest('/api/admin/season/active', {method: 'POST', body: {seasonId}, action: 'seasonActivation'})
                    : apiRequest('/api/admin/season/deactivate', {method: 'POST', action: 'seasonActivation'}))
            } catch {
                return
            } finally {
                isActivatingSeason.value = false
            }

            await loadActiveSeason()
            await loadSeasons()
        }

        const activateSeason = async (seasonId: number) => {
            console.info(`🌞 > PLAN_STORE > Activating season ${seasonId}`)
            await executeSeasonActivation(seasonId)
            loadSeason(seasonId)
            console.info(`🌞 > PLAN_STORE > Successfully activated season ${seasonId}`)
        }

        const deactivateSeason = async () => {
            console.info(`🌞 > PLAN_STORE > Deactivating season`)
            await executeSeasonActivation(null)
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
            console.info(`🌞 > PLAN_STORE > Successfully deactivated season`)
        }

        // COOKING TEAM ACTIONS - Part of Season aggregate (ADR-005)
        const createTeam = async (teamOrTeams: CookingTeamCreate | CookingTeamCreate[]): Promise<CreateTeamsResponse> => {
            const teams = Array.isArray(teamOrTeams) ? teamOrTeams : [teamOrTeams]

            isCreatingTeams.value = true
            try {
                // ADR-009 operation result: teams created + dinner events the assignment touched
                const created = await apiRequest('/api/admin/team', {
                    method: 'PUT',
                    body: teams,
                    schema: CreateTeamsResponseSchema,
                    action: 'createTeam'
                })
                console.info(`👥 > PLAN_STORE > Created ${created.teams.length} team(s), assigned ${created.eventsAssigned} dinner event(s)`)

                if (selectedSeasonId.value) {
                    await refreshSelectedSeason()
                }
                toastSaved('Madhold oprettet', formatCreateTeams(created))
                return created
            } finally {
                isCreatingTeams.value = false
            }
        }

        const updateTeam = async (team: CookingTeamUpdate) => {
            await apiRequest(`/api/admin/team/${team.id}`, {method: 'POST', body: team, action: 'updateTeam'})
            console.info(`👥 > PLAN_STORE > Updated team "${team.name ?? team.id}"`)
            // Refresh selected season to get updated teams
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
        }

        const deleteTeam = async (teamId: number) => {
            await apiRequest(`/api/admin/team/${teamId}`, {method: 'DELETE', action: 'deleteTeam'})
            console.info(`👥 > PLAN_STORE > Deleted team ${teamId}`)
            // Refresh selected season to get updated teams
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
        }

        // TEAM MEMBER ASSIGNMENT ACTIONS - Part of Team aggregate (ADR-005)
        const addTeamMember = async (assignment: CookingTeamAssignmentCreate): Promise<CookingTeamAssignment> => {
            const created = await apiRequest<CookingTeamAssignment>('/api/admin/team/assignment', {
                method: 'PUT',
                body: assignment,
                action: 'addTeamMember'
            })
            console.info(`👥🔗 > PLAN_STORE > Added member ${assignment.inhabitantId} to team ${assignment.cookingTeamId} as ${assignment.role}`)
            // Refresh selected season to get updated teams
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
            return created
        }

        const removeTeamMember = async (assignmentId: number) => {
            await apiRequest(`/api/admin/team/assignment/${assignmentId}`, {method: 'DELETE', action: 'removeTeamMember'})
            console.info(`👥🔗 > PLAN_STORE > Removed team member assignment ${assignmentId}`)
            // Refresh selected season to get updated teams
            if (selectedSeasonId.value) {
                await refreshSelectedSeason()
            }
        }

        // DINNER EVENT ACTIONS
        const isRoleUpdating = ref(false)
        const assignRoleToDinner = async (dinnerEventId: number, inhabitantId: number, role: CookingTeamAssignment['role'], menuStrategy?: MenuSwapStrategy): Promise<DinnerEventDetail> => {
            isRoleUpdating.value = true
            try {
                const updated = await apiRequest<DinnerEventDetail>(`/api/team/cooking/${dinnerEventId}/assign-role`, {
                    method: 'POST',
                    body: { inhabitantId, role, ...(menuStrategy && {menuStrategy}) },
                    action: 'assignRoleToDinner'
                })
                console.info(`👥 > PLAN_STORE > Assigned ${role} role to inhabitant ${inhabitantId} for dinner event ${dinnerEventId}`)
                // Refresh selected detail LAST: on /chef the page watchEffect re-derives the
                // selected dinner id from myTeams/season, so settle those first or its re-run
                // reloads stale detail over the fresh fetch.
                if (selectedSeasonId.value) await refreshSelectedSeason()
                await useUsersStore().loadMyTeams()
                await useBookingsStore().refreshSelectedDinnerEventDetail()
                return updated
            } finally {
                isRoleUpdating.value = false
            }
        }

        /**
         * Volunteer the current user for a role on a dinner. Wraps assignRoleToDinner +
         * shows the same date/team-aware toast as the auto-claim path. Returns null on error.
         */
        const claimRoleForMe = async (dinnerEvent: DinnerEventDetail, role: TeamRole, menuStrategy?: MenuSwapStrategy): Promise<DinnerEventDetail | null> => {
            const inhabitantId = authStore.inhabitantId
            if (inhabitantId === null) return null
            try {
                const updated = await assignRoleToDinner(dinnerEvent.id, inhabitantId, role, menuStrategy)
                const {formatRoleClaimedTitle} = useCookingTeam()
                useToast().add({title: formatRoleClaimedTitle(dinnerEvent, role), color: 'success'})
                return updated
            } catch { return null }
        }

        /**
         * Withdraw the current user from a role on a dinner ("Meld afbud").
         * Clears chef + menu + allergens server-side; 207 means the Heynabo event
         * could not be deleted (best-effort, ADR-013). Returns null on error.
         */
        const resignRoleForMe = async (dinnerEvent: DinnerEventDetail, role: TeamRole): Promise<DinnerEventDetail | null> => {
            const inhabitantId = authStore.inhabitantId
            if (inhabitantId === null) return null
            isRoleUpdating.value = true
            try {
                let heynaboSyncDegraded = false
                const updated = await apiRequest<DinnerEventDetail>(`/api/team/cooking/${dinnerEvent.id}/remove-role`, {
                    method: 'POST',
                    body: {inhabitantId, role},
                    onResponse: ({response}) => { heynaboSyncDegraded = response.status === 207 },
                    action: 'resignRoleForMe'
                })
                console.info(`👥 > PLAN_STORE > Removed ${role} role from inhabitant ${inhabitantId} for dinner event ${dinnerEvent.id}`)
                // Refresh selected detail LAST: on /chef the page watchEffect re-derives the
                // selected dinner id from myTeams/season, so settle those first or its re-run
                // reloads stale detail over the fresh fetch.
                if (selectedSeasonId.value) await refreshSelectedSeason()
                await useUsersStore().loadMyTeams()
                await useBookingsStore().refreshSelectedDinnerEventDetail()
                useToast().add({title: 'Du har meldt afbud. Tjansen som chefkok er nu ledig.', color: 'success'})
                if (heynaboSyncDegraded) {
                    useToast().add({
                        title: 'Heynabo-synkronisering fejlede',
                        description: 'Tjansen er fjernet, men Heynabo-begivenheden kunne ikke slettes. Tjek Heynabo.',
                        color: 'error'
                    })
                }
                return updated
            } catch {
                return null
            } finally {
                isRoleUpdating.value = false
            }
        }


        const initPlanStore = (shortName?: string) => {
            console.info(`${LOG_CTX} 🗓️ > PLAN_STORE > initPlanStore > shortName: ${shortName ?? 'none'}, selected: ${selectedSeasonId.value}, active: ${activeSeasonId.value}`)
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

            console.info(`${LOG_CTX} 🗓️ > PLAN_STORE > Data loaded, calling initPlanStore`)
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
            isSavingSeasonFlowInProgress,
            isActivatingSeasonFlowInProgress,
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
            deactivateSeason,
            assignTeamAffinitiesAndEvents,
            createTeam,
            updateTeam,
            deleteTeam,
            addTeamMember,
            removeTeamMember,
            assignRoleToDinner,
            claimRoleForMe,
            resignRoleForMe,
            isRoleUpdating
        }
    }
)

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(usePlanStore, import.meta.hot))
}
