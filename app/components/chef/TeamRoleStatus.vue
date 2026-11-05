<script setup lang="ts">
/**
 * TeamRoleStatus - the person's place on the team on view
 *
 * A role on the team (ALERTS.warning for the chef, ALERTS.info for a cook or a kokkespire, the role's ROLE_ICONS glyph):
 * +--------------------------------------------------+
 * | (whisk) Du er kok                                |
 * |         Du hjælper cheffen på Madhold 3 med ...  |
 * +--------------------------------------------------+
 *
 * No role on the team, a visit (ALERTS.neutral):
 * +--------------------------------------------------+
 * | (team) Du er ikke på Madhold 3                   |
 * +--------------------------------------------------+
 *
 * Visual check: /chef on an own team and on a visiting tab, phone and desktop.
 *
 * Used in:
 * - /chef/index.vue (master panel, under the team tabs)
 */
import type {CookingTeamDisplay} from '~/composables/useCookingTeamValidation'
import {TEAM_WORDS} from '~/config/teamWords'

interface Props {
  team: CookingTeamDisplay
  inhabitantId: number
}

const props = defineProps<Props>()

const {ICONS, ALERTS, ROLE_ICONS} = useTheSlopeDesignSystem()
const {getTeamShortName} = useCookingTeam()
const Role = useCookingTeamValidation().TeamRoleSchema.enum

const teamShortName = computed(() => getTeamShortName(props.team.name))
const role = computed(() => props.team.assignments.find(a => a.inhabitantId === props.inhabitantId)?.role ?? null)

const status = computed(() => role.value
  ? {
      icon: ROLE_ICONS[role.value],
      title: TEAM_WORDS.roles[role.value].title,
      description: TEAM_WORDS.roles[role.value].description(teamShortName.value)
    }
  : {icon: ICONS.team, title: TEAM_WORDS.visit.line(teamShortName.value), description: undefined})
</script>

<template>
  <UAlert
    v-bind="!role ? ALERTS.neutral : role === Role.CHEF ? ALERTS.warning : ALERTS.info"
    :icon="status.icon"
    :title="status.title"
    :description="status.description"
    data-testid="team-role-status"
  />
</template>
