// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  modules: ['@nuxt/image', '@nuxt/ui', '@nuxt/scripts'],
  nitro: {
    experimental: {
      tasks: true
    },
    scheduledTasks: {
      '0 * * * *': ['sync-podcasts']
    }
  }
})
