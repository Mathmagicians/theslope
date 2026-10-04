<!--
Install guidance - the dashboard's answer to "Where is the app?". The face follows the
browser's capability (useInstallPrompt): standalone or nothing offered renders nothing.

┌ button face (beforeinstallprompt captured) ──────────────────┐
│  ┌─────────┐   Få Skråningen som app                         │
│  │   app   │   Installér appen, så ligger den på din         │
│  │  ikon   │   hjemmeskærm som alle andre apps.              │
│  └─────────┘                                                 │
│   (tap-tap)    [ Installér app ]   [ Ikke nu ]               │
└──────────────────────────────────────────────────────────────┘

┌ share-instructions face (navigator.standalone false) ────────┐
│  ┌─────────┐   Få Skråningen som app                         │
│  │   app   │   Åbn Del-menuen og vælg                        │
│  │  ikon   │   'Føj til hjemmeskærm'                         │
│  └─────────┘                                                 │
│   (tap-tap)    [ Ikke nu ]                                   │
└──────────────────────────────────────────────────────────────┘

┌ menu-instructions face (touch-first, no better signal) ──────┐
│  ┌─────────┐   Få Skråningen som app                         │
│  │   app   │   Åbn browserens menu og vælg                   │
│  │  ikon   │   'Føj til startskærm'                          │
│  └─────────┘                                                 │
│   (tap-tap)    [ Ikke nu ]                                   │
└──────────────────────────────────────────────────────────────┘

The icon box is public/app-icon.svg in a home-screen frame; (tap-tap) marks the
double press-pulse drawn on the icon itself (COMPONENTS.installIcon, static under
reduced motion).
Phone and desktop share the layout; the buttons wrap under the text on the phone
(withActions). The parent mounts it inside <ClientOnly>: capability is a browser fact.
-->
<script setup lang="ts">
const {ALERTS, BUTTONS, ICONS, COLOR, COMPONENTS} = useTheSlopeDesignSystem()
const {face, promptInstall, dismiss} = useInstallPrompt()

const DESCRIPTIONS = {
  button: 'Installér appen, så ligger den på din hjemmeskærm som alle andre apps.',
  'share-instructions': 'Åbn Del-menuen og vælg \'Føj til hjemmeskærm\'',
  'menu-instructions': 'Åbn browserens menu og vælg \'Føj til startskærm\''
} as const satisfies Record<Exclude<InstallFace, 'none'>, string>
</script>

<template>
  <UAlert
      v-if="face !== 'none'"
      v-bind="{...ALERTS.info, ...ALERTS.withActions}"
      title="Få Skråningen som app"
      :description="DESCRIPTIONS[face]"
      data-testid="install-prompt"
  >
    <template #leading>
      <img
          src="/app-icon.svg"
          alt=""
          aria-hidden="true"
          :class="COMPONENTS.installIcon"
      >
    </template>

    <template #actions>
      <UButton
          v-if="face === 'button'"
          v-bind="BUTTONS.primaryAction"
          :color="COLOR.primary"
          :icon="ICONS.download"
          data-testid="install-app"
          @click="promptInstall"
      >
        Installér app
      </UButton>
      <UButton
          v-bind="BUTTONS.cancel"
          data-testid="install-dismiss"
          @click="dismiss"
      >
        Ikke nu
      </UButton>
    </template>
  </UAlert>
</template>
