<script setup lang="ts">
interface TeamMember {
  id: number
  role: 'CHEF' | 'COOK' | 'JUNIORHELPER'
  inhabitant: {
    id: number
    name: string
    lastName: string
    pictureUrl: string | null
  }
}

interface Props {
  teamId: number          // Database ID
  teamNumber: number      // Logical number 1..N in season
  assignments?: TeamMember[]
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  assignments: () => []
})

// Team color rotation based on teamNumber (1..N)
const teamColors = ['mocha', 'pink', 'orange', 'winery', 'party', 'peach', 'bonbon', 'caramel']
const teamColor = computed(() => {
  return teamColors[(props.teamNumber - 1) % teamColors.length]
})

// Group assignments by role
const roleGroups = computed(() => {
  const groups = {
    CHEF: [] as TeamMember[],
    COOK: [] as TeamMember[],
    JUNIORHELPER: [] as TeamMember[]
  }

  props.assignments.forEach(assignment => {
    if (assignment.role in groups) {
      groups[assignment.role].push(assignment)
    }
  })

  return groups
})

const roleLabels = {
  CHEF: 'Chefkok',
  COOK: 'Kok',
  JUNIORHELPER: 'Kokkespire'
}

const navigateToInhabitant = (inhabitantId: number) => {
  navigateTo(`/inhabitant/${inhabitantId}`)
}
</script>

<template>
  <!-- COMPACT VIEW for table display -->
  <div v-if="compact" class="flex flex-col md:flex-row gap-2">
    <div
      v-for="(members, role) in roleGroups"
      :key="role"
      v-show="members.length > 0"
      class="flex flex-col gap-1"
    >
      <span class="text-xs text-gray-500 font-medium">{{ roleLabels[role] }}</span>
      <div class="flex items-center gap-2">
        <UAvatarGroup size="sm" :max="3">
          <UTooltip
            v-for="member in members"
            :key="member.id"
            :text="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
          >
            <UAvatar
              :src="member.inhabitant.pictureUrl"
              :alt="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
              icon="i-heroicons-user"
              class="cursor-pointer"
              @click="navigateToInhabitant(member.inhabitant.id)"
            />
          </UTooltip>
        </UAvatarGroup>

        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="member in members"
            :key="member.id"
            size="sm"
            variant="subtle"
            :color="teamColor"
            class="cursor-pointer"
            @click="navigateToInhabitant(member.inhabitant.id)"
          >
            {{ member.inhabitant.name }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>

  <!-- FULL VIEW with role sections -->
  <div v-else class="space-y-4">
    <div
      v-for="(members, role) in roleGroups"
      :key="role"
      class="space-y-2"
    >
      <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {{ roleLabels[role] }}
      </h4>

      <div v-if="members.length > 0" class="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
        <UAvatarGroup size="md" :max="5">
          <UTooltip
            v-for="member in members"
            :key="member.id"
            :text="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
          >
            <UAvatar
              :src="member.inhabitant.pictureUrl"
              :alt="`${member.inhabitant.name} ${member.inhabitant.lastName}`"
              icon="i-heroicons-user"
              class="cursor-pointer hover:ring-2 hover:ring-offset-2"
              :class="`hover:ring-${teamColor}`"
              @click="navigateToInhabitant(member.inhabitant.id)"
            />
          </UTooltip>
        </UAvatarGroup>

        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="member in members"
            :key="member.id"
            size="md"
            variant="subtle"
            :color="teamColor"
            class="cursor-pointer hover:opacity-80 transition-opacity"
            @click="navigateToInhabitant(member.inhabitant.id)"
          >
            {{ member.inhabitant.name }} {{ member.inhabitant.lastName }}
          </UBadge>
        </div>
      </div>

      <div v-else class="text-sm text-gray-500 italic p-3">
        Ingen medlemmer tildelt
      </div>
    </div>
  </div>
</template>