<!--
  Landing page - the brand rainbow, walked in hue order.

  ┌ Hero ───────────────────────────────────────────────┐
  │  TheSlope                              mocha + 50   │  BACKGROUNDS.landing.titleBar
  └─────────────────────────────────────────────────────┘
  ┌ Ticker ─────────────────────────────────────────────┐
  │  [natur] [fællesskab] [bæredygtighed] …  mocha + 50 │  BACKGROUNDS.landing.ticker
  │   ↑ PANTONE_CHIPS, the same family order as below   │
  └─────────────────────────────────────────────────────┘
  ┌ band 0 ─────────────────────────────────────────────┐
  │  46 HUSSTANDE                        pink + black   │  getRainbowBand(0)
  ├ band 1 ─────────────────────────────────────────────┤
  │  FORPLIGTENDE FÆLLESSKAB           orange + black   │  getRainbowBand(1)
  ├ band 2 ─────────────────────────────────────────────┤
  │  ØKOLOGISK FÆLLESSPISNING …         ocean + black   │  getRainbowBand(2)
  ├ band 3 ─────────────────────────────────────────────┤
  │  DANMARKS SMUKKESTE SOLNEDGANGE …  bonbon + white   │  getRainbowBand(3)
  └─────────────────────────────────────────────────────┘

  Each band is full-height on phones and a quarter of it from md up. The page owns the
  composition; the fill and the ink of a stop come from the design system (ADR-018).
-->
<script setup lang="ts">
const words = ['natur', 'fællesskab', 'bæredygtighed', 'nationalpark', 'fællesspisning', 'fredagsbar', 'hjemmekoncerter', 'pool', 'byttehylde', 'lånebiler', 'hugelbede', 'børneleg', 'bålplads','solnedgange','bier']

const sections = [
    '46 husstande',
    'Forpligtende fællesskab',
    'Økologisk fællesspisning fire gange om ugen skaber fællesskab',
    'Danmarks smukkeste solnedgange i smørhullet Lejre'
]

const { BACKGROUNDS, TYPOGRAPHY, getRainbowBand } = useTheSlopeDesignSystem()
</script>

<template>
  <div class="flex flex-col">
    <Hero />
    <div :class="`w-full py-21 md:py-2 min-h-12 overflow-hidden ${BACKGROUNDS.landing.ticker}`">
      <Ticker :words="words" class="my-2"/>
    </div>

    <div
      v-for="(section, index) in sections"
      :key="section"
      :class="`min-h-screen md:min-h-1/4 ${getRainbowBand(index)}`"
      :data-testid="`landing-band-${index}`"
    >
      <h2 :class="TYPOGRAPHY.sectionTitle">{{ section }}</h2>
    </div>
  </div>
</template>
