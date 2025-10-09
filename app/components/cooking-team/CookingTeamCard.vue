<script setup lang="ts">
import type {CookingTeam} from '~/composables/useCookingTeamValidation'

type TeamMode = 'view' | 'edit'
type TeamVariant = 'list' | 'standalone'

interface Props {
  team: CookingTeam
  mode?: TeamMode
  variant?: TeamVariant
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'view',
  variant: 'list'
})

const emit = defineEmits<{
  update: [team: CookingTeam]
  delete: [teamId: number]
}>()

// Local state for editing
const editedName = ref(props.team.name)

// Reset edited name when team prop changes
watch(() => props.team.name, (newName) => {
  editedName.value = newName
})

const handleNameUpdate = () => {
  // Only emit if name actually changed
  if (editedName.value !== props.team.name && editedName.value.trim()) {
    emit('update', {
      ...props.team,
      name: editedName.value.trim()
    })
  } else if (!editedName.value.trim()) {
    // Revert to original if empty
    editedName.value = props.team.name
  }
}

const handleDelete = () => {
  if (props.team.id) {
    emit('delete', props.team.id)
  }
}
</script>

<template>
  <!-- LIST VARIANT: Compact single-line -->
  <div v-if="variant === 'list'" class="flex items-center gap-2 p-2 border rounded">
    <!-- VIEW MODE -->
    <div v-if="mode === 'view'" class="flex-1">
      <h3 class="font-semibold">{{ team.name }}</h3>
    </div>

    <!-- EDIT MODE -->
    <template v-else>
      <input
        v-model="editedName"
        @blur="handleNameUpdate"
        @keyup.enter="handleNameUpdate"
        type="text"
        class="flex-1 px-3 py-2 border rounded"
        placeholder="Madhold navn"
      />
      <UButton
        color="red"
        size="sm"
        icon="i-heroicons-trash"
        @click="handleDelete"
        aria-label="Slet madhold"
      />
    </template>
  </div>

  <!-- STANDALONE VARIANT: Full card for detailed view -->
  <UCard v-else class="w-full">
    <template #header>
      <div class="flex items-center justify-between">
        <!-- VIEW MODE -->
        <h3 v-if="mode === 'view'" class="text-lg font-semibold">{{ team.name }}</h3>

        <!-- EDIT MODE -->
        <div v-else class="flex-1 flex items-center gap-2">
          <input
            v-model="editedName"
            @blur="handleNameUpdate"
            @keyup.enter="handleNameUpdate"
            type="text"
            class="flex-1 px-3 py-2 border rounded"
            placeholder="Madhold navn"
          />
          <UButton
            color="red"
            size="sm"
            icon="i-heroicons-trash"
            @click="handleDelete"
            aria-label="Slet madhold"
          />
        </div>
      </div>
    </template>

    <template #default>
      <!-- Future: Team assignments, cooking schedule, etc. -->
      <div class="text-sm text-gray-500">
        <p>Team ID: {{ team.id }}</p>
        <p>Season ID: {{ team.seasonId }}</p>
      </div>
    </template>
  </UCard>
</template>