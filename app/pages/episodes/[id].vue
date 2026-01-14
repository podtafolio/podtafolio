<template>
  <div>
    <div v-if="pending" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 text-gray-400" />
    </div>

    <div v-else-if="error || !episode" class="text-red-500 py-12 text-center">
        Episode not found.
    </div>

    <div v-else class="max-w-4xl mx-auto">
      <UButton
        :to="`/podcasts/${episode.data.podcastId}`"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        class="mb-6"
      >
        Back to Podcast
      </UButton>

      <div class="mb-8">
          <h1 class="text-3xl font-bold mb-4">{{ episode.data.title }}</h1>
          <div class="flex items-center gap-4 text-gray-500 text-sm mb-6">
              <span>{{ new Date(episode.data.publishedAt).toLocaleDateString() }}</span>
              <span>•</span>
              <span>{{ formatDuration(episode.data.duration) }}</span>
          </div>

          <audio
            controls
            :src="episode.data.enclosureUrl"
            class="w-full mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            Your browser does not support the audio element.
          </audio>
      </div>

      <UCard>
        <template #header>
            <h3 class="font-semibold">Show Notes</h3>
        </template>
        <div class="prose dark:prose-invert max-w-none break-words" v-html="episode.data.content || episode.data.description"></div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

const { data: episode, pending, error } = await useFetch(`/api/episodes/${id}`)

function formatDuration(seconds: number) {
    if (!seconds) return '00:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
}
</script>
