<!--
Install guidance - the dashboard's answer to "Where is the app?". The face follows the
browser's capability (useInstallPrompt): standalone or nothing offered renders nothing.
A white UCard on the mocha app shell, framed like every dashboard sibling (UserProfileCard).

┌ UCard, button face (beforeinstallprompt captured) ───────────┐
│  ┌─────────┐   Få Skråningen som app                         │
│  │   app   │   Installér appen, så ligger den på din         │
│  │  ikon   │   hjemmeskærm som alle andre apps.              │
│  └─────────┘                                                 │
│   (tap-tap)                                                  │
│  [ Installér app ]   [ Ikke nu ]                             │
└──────────────────────────────────────────────────────────────┘

┌ UCard, share-instructions face (navigator.standalone false) ─┐
│  ┌─────────┐   Få Skråningen som app                         │
│  │   app   │   Åbn Del-menuen og vælg                        │
│  │  ikon   │   'Føj til hjemmeskærm'                         │
│  └─────────┘                                                 │
│   (tap-tap)                                                  │
│  [ Ikke nu ]                                                 │
└──────────────────────────────────────────────────────────────┘

┌ UCard, menu-instructions face (touch-first, no better signal) ┐
│  ┌─────────┐   Få Skråningen som app                          │
│  │   app   │   Åbn browserens menu og vælg                    │
│  │  ikon   │   'Føj til startskærm'                           │
│  └─────────┘                                                  │
│   (tap-tap)                                                   │
│  [ Ikke nu ]                                                  │
└───────────────────────────────────────────────────────────────┘

The icon box is public/app-icon.svg in a home-screen frame; (tap-tap) marks the
double press-pulse drawn on the icon itself (COMPONENTS.installIcon, static under
reduced motion). The buttons sit in a row from md and stack full-width on the phone
(LAYOUTS.cardActionRow). The parent mounts it inside <ClientOnly>: capability is a browser fact.
-->
<script setup lang="ts">
const {BUTTONS, ICONS, COLOR, COMPONENTS, LAYOUTS, TYPOGRAPHY} = useTheSlopeDesignSystem()
const {face, promptInstall, dismiss} = useInstallPrompt()

const DESCRIPTIONS = {
  button: 'Installér appen, så ligger den på din hjemmeskærm som alle andre apps.',
  'share-instructions': 'Åbn Del-menuen og vælg \'Føj til hjemmeskærm\'',
  'menu-instructions': 'Åbn browserens menu og vælg \'Føj til startskærm\''
} as const satisfies Record<Exclude<InstallFace, 'none'>, string>
</script>

<template>
  <UCard v-if="face !== 'none'" data-testid="install-prompt">
    <div class="space-y-4">
      <div class="flex items-start gap-4">
        <img
            src="/app-icon.svg"
            alt=""
            aria-hidden="true"
            :class="COMPONENTS.installIcon"
        >
        <div class="space-y-2">
          <h2 :class="TYPOGRAPHY.cardTitle">Få Skråningen som app</h2>
          <p :class="TYPOGRAPHY.bodyTextMuted">{{ DESCRIPTIONS[face] }}</p>
        </div>
      </div>

      <div :class="LAYOUTS.cardActionRow">
        <UButton
            v-if="face === 'button'"
            v-bind="BUTTONS.primaryAction"
            :color="COLOR.secondary"
            :icon="ICONS.download"
            :class="LAYOUTS.cardActionButton"
            data-testid="install-app"
            @click="promptInstall"
        >
          Installér app
        </UButton>
        <UButton
            v-bind="BUTTONS.cancel"
            :class="LAYOUTS.cardActionButton"
            data-testid="install-dismiss"
            @click="dismiss"
        >
          Ikke nu
        </UButton>
      </div>
    </div>
  </UCard>
</template>
