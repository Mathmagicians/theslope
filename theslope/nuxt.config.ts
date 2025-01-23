// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-19",
  devtools: { enabled: true },

  nitro: {
    preset: "cloudflare_module"
  },

  modules: ["nitro-cloudflare-dev", "@nuxtjs/tailwindcss"]
})