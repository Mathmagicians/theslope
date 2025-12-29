<script setup lang="ts">
import { HELP_TEXTS } from '~/config/help-texts'
import type { FeedbackPayload, GitHubIssueResponse } from '~~/server/integration/github/githubClient'

const route = useRoute()
const requestUrl = useRequestURL()
const isOpen = ref(false)
const doClose = () => isOpen.value = false

const { NAVIGATION, ICONS, SIZES, COLOR, TYPOGRAPHY } = useTheSlopeDesignSystem()

// Feedback form
type FeedbackType = FeedbackPayload['type']
const feedbackType = ref<FeedbackType>('bug')
const feedbackDescription = ref('')
const showFeedbackForm = ref(false)

const feedbackOptions: Array<{ label: string, value: FeedbackType }> = [
    { label: '🐛 Fejl', value: 'bug' },
    { label: '💡 Forslag', value: 'idea' },
    { label: '❓ Spørgsmål', value: 'question' }
]

const { execute: submitFeedback, status, data: feedbackResult, error: feedbackError } = useAsyncData<GitHubIssueResponse>(
    'feedback-submit',
    () => $fetch<GitHubIssueResponse>('/api/feedback', {
        method: 'POST',
        body: {
            type: feedbackType.value,
            description: feedbackDescription.value,
            currentUrl: requestUrl.href
        }
    }),
    { immediate: false }
)

const isSubmitting = computed(() => status.value === 'pending')
const isSuccess = computed(() => status.value === 'success' && feedbackResult.value !== null)
const isError = computed(() => status.value === 'error')

const cancelFeedback = () => {
    showFeedbackForm.value = false
    feedbackDescription.value = ''
}
// Dynamically lookup help content based on current route
const helpContent = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)

  // Handle root path - look for 'index' key
  if (pathSegments.length === 0) {
    const indexContent = HELP_TEXTS.index
    return indexContent?.title && indexContent?.content ? indexContent : null
  }

  // Get all param values to identify dynamic segments
  const paramValues = Object.values(route.params).flat()

  // Traverse HELP_TEXTS using path segments, skipping dynamic params
  let current: Record<string, unknown> = HELP_TEXTS
  for (const segment of pathSegments) {
    // Skip dynamic param values (e.g., shortname like 'abc-123')
    if (paramValues.includes(segment) && !current[segment]) {
      continue
    }

    if (current[segment]) {
      current = current[segment] as Record<string, unknown>
    } else {
      return null
    }
  }
  return current?.title && current?.content ? current : null
})

// Close help when route changes
watch(() => route.path, () => {
  doClose()
})
</script>

<template>
  <UPopover
      v-if="helpContent"
      v-model:open="isOpen"
      :popper="{ placement: 'bottom-start' }"
  >
    <UButton
        :icon="ICONS.help"
        :color="isOpen ? NAVIGATION.link.activeColor : NAVIGATION.link.color"
        :variant="isOpen ? NAVIGATION.link.activeVariant : NAVIGATION.link.variant"
    />

    <template #content>
      <UCard class="max-w-xs sm:max-w-sm mx-2" variant="outline">
        <template #header>
          <div class="flex justify-between items-center gap-2">
            <span :class="TYPOGRAPHY.cardTitle">{{ helpContent.title }}</span>
            <UButton
                :icon="ICONS.xMark"
                variant="ghost"
                :size="SIZES.small"
                class="flex-shrink-0"
                @click="doClose()"
            />
          </div>
        </template>

        <p :class="[TYPOGRAPHY.bodyTextSmall, 'text-pretty break-words']">{{ helpContent.content }}</p>

        <template #footer>
          <div class="flex flex-col gap-1 md:gap-2">
            <UButton
                to="https://github.com/Mathmagicians/theslope/blob/main/docs/user-guide.md"
                target="_blank"
                :icon="ICONS.book"
                label="Læs manualen"
                :size="SIZES.small"
                variant="ghost"
            />
            <UButton
                :icon="ICONS.github"
                label="Rapporter fejl"
                :size="SIZES.small"
                variant="ghost"
                trailing-icon="i-heroicons-chevron-down"
                :ui="{ trailingIcon: showFeedbackForm ? 'rotate-180 transition-transform duration-200' : 'transition-transform duration-200' }"
                @click="showFeedbackForm = !showFeedbackForm"
            />

            <!-- Expandable feedback form -->
            <UCollapsible v-model:open="showFeedbackForm" :unmount-on-hide="false">
              <template #content>
                <div class="pt-2 md:pt-3 space-y-2 md:space-y-3">
                  <div v-if="isSuccess" class="text-center py-2 md:py-3">
                    <UBadge :color="COLOR.success" variant="soft">✅ Tak for din feedback!</UBadge>
                  </div>
                  <div v-else-if="isError" class="text-center py-2 md:py-3 space-y-1">
                    <UBadge color="error" variant="soft">❌ Kunne ikke sende feedback</UBadge>
                    <p :class="[TYPOGRAPHY.finePrint, 'text-muted']">{{ feedbackError?.message || 'Ukendt fejl' }}</p>
                  </div>
                  <template v-else>
                    <URadioGroup
                        v-model="feedbackType"
                        :items="feedbackOptions"
                        value-key="value"
                        :ui="{ fieldset: 'flex flex-col md:flex-row gap-2 md:gap-4' }"
                    />
                    <UTextarea
                        v-model="feedbackDescription"
                        placeholder="Beskriv din feedback..."
                        :size="SIZES.small"
                        class="flex-1"
                        autoresize
                    />
                    <div class="flex gap-2 md:gap-3">
                      <UButton
                          :size="SIZES.small"
                          variant="ghost"
                          @click="cancelFeedback"
                      >
                        Annuller
                      </UButton>
                      <UButton
                          class="flex-1"
                          :size="SIZES.small"
                          :color="COLOR.primary"
                          :loading="isSubmitting"
                          :disabled="isSubmitting"
                          @click="() => submitFeedback()"
                      >
                        {{ isSubmitting ? 'Sender...' : 'Send' }}
                      </UButton>
                    </div>
                  </template>
                </div>
              </template>
            </UCollapsible>
          </div>
        </template>
      </UCard>
    </template>
  </UPopover>
</template>
