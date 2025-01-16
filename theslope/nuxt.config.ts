// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  devtools: { enabled: true },

  eslint: {
    // options here
  },

  nitro: {
    preset: "cloudflare_module"
  },

  modules: [
    "nitro-cloudflare-dev",
    "@nuxt/ui",
    '@nuxt/test-utils/module',
    "@nuxt/eslint",
  ],


})
