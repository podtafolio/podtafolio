<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Discover Podcasts</h1>

    <form @submit.prevent="handleSearch" class="flex gap-2 mb-8">
      <UInput
        v-model="query"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search for podcasts..."
        class="flex-1"
        size="xl"
        :loading="loading"
      />
      <UButton type="submit" size="xl" :loading="loading">Search</UButton>
    </form>

    <div v-if="results.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard v-for="podcast in results" :key="podcast.feedUrl">
        <div class="flex gap-4 items-start">
          <NuxtImg
            v-if="podcast.imageUrl"
            :src="podcast.imageUrl"
            :alt="podcast.title"
            class="w-20 h-20 rounded-lg object-cover bg-gray-100"
            loading="lazy"
          />
          <div class="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400" v-else>
            <UIcon name="i-heroicons-microphone" class="w-8 h-8" />
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="font-bold truncate" :title="podcast.title">{{ podcast.title }}</h3>
            <p class="text-sm text-gray-500 truncate">{{ podcast.author }}</p>
          </div>
        </div>

        <template #footer>
          <UButton
            block
            label="Subscribe"
            :loading="importing === podcast.feedUrl"
            @click="subscribe(podcast)"
            :disabled="!!importing"
          />
        </template>
      </UCard>
    </div>

    <div v-else-if="hasSearched && !loading" class="text-center text-gray-500 py-12">
      No podcasts found. Try a different search term.
    </div>
  </div>
</template>

<script setup lang="ts">
const query = ref('')
const loading = ref(false)
const results = ref<any[]>([])
const hasSearched = ref(false)
const importing = ref<string | null>(null)
const toast = useToast()

async function handleSearch() {
  if (!query.value.trim()) return

  loading.value = true
  hasSearched.value = true
  try {
    results.value = await $fetch('/api/search', {
      params: { term: query.value }
    })
  } catch (err) {
    toast.add({
        title: 'Search failed',
        description: 'Could not search podcasts. Please try again.',
        color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function subscribe(podcast: any) {
  importing.value = podcast.feedUrl
  try {
    await $fetch('/api/podcasts/import', {
      method: 'POST',
      body: { feedUrl: podcast.feedUrl }
    })

    toast.add({
        title: 'Subscribed!',
        description: `Importing ${podcast.title}...`,
        color: 'success'
    })
    navigateTo('/')
  } catch (err) {
    toast.add({
        title: 'Import failed',
        description: 'Could not subscribe to podcast.',
        color: 'error'
    })
  } finally {
    importing.value = null
  }
}
</script>
