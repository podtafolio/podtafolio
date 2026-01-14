<template>
  <div>
    <UButton to="/" variant="ghost" icon="i-heroicons-arrow-left" class="mb-4"
      >Back to Podcasts</UButton
    >

    <div v-if="pendingPodcast" class="flex justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-8 h-8 text-gray-400"
      />
    </div>

    <div
      v-else-if="podcastError || !podcast"
      class="text-red-500 py-12 text-center"
    >
      Podcast not found.
    </div>

    <div v-else>
      <!-- Header -->
      <div class="flex flex-col md:flex-row gap-8 mb-8">
        <NuxtImg
          v-if="podcast.data.imageUrl"
          :src="podcast.data.imageUrl"
          :alt="podcast.data.title"
          class="w-48 h-48 rounded-lg object-cover bg-gray-100 shadow-md shrink-0"
          loading="lazy"
        />
        <div
          class="w-48 h-48 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0"
          v-else
        >
          <UIcon name="i-heroicons-microphone" class="w-16 h-16" />
        </div>

        <div class="flex-1">
          <h1 class="text-3xl font-bold mb-2">{{ podcast.data.title }}</h1>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            {{ podcast.data.author }}
          </p>
          <div
            class="prose dark:prose-invert max-w-none text-sm line-clamp-4"
            v-html="podcast.data.description"
          ></div>
        </div>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-800 my-8"></div>

      <!-- Episodes -->
      <h2 class="text-2xl font-bold mb-6">Episodes</h2>

      <div v-if="pendingEpisodes" class="flex justify-center py-12">
        <UIcon
          name="i-heroicons-arrow-path"
          class="animate-spin w-8 h-8 text-gray-400"
        />
      </div>

      <div
        v-else-if="episodes?.data.length === 0"
        class="text-center py-12 text-gray-500"
      >
        No episodes found.
      </div>

      <div v-else class="space-y-4">
        <UCard
          v-for="episode in episodes?.data"
          :key="episode.id"
          class="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
          @click="navigateTo(`/episodes/${episode.id}`)"
        >
          <div class="flex gap-4 items-center">
            <div class="flex-1">
              <h3 class="font-bold text-lg mb-1">{{ episode.title }}</h3>
              <p class="text-sm text-gray-500 mb-2">
                {{ new Date(episode.publishedAt).toLocaleDateString() }} •
                {{ formatDuration(episode.duration) }}
              </p>
            </div>
            <UButton
              icon="i-heroicons-play"
              variant="ghost"
              color="gray"
              @click.stop="navigateTo(`/episodes/${episode.id}`)"
            />
          </div>
        </UCard>

        <div
          v-if="episodes?.meta.totalPages > 1"
          class="flex justify-center mt-8"
        >
          <UPagination
            v-model="page"
            :total="episodes.meta.total"
            :page-count="episodes.meta.limit"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;
const page = ref(1);

const {
  data: podcast,
  pending: pendingPodcast,
  error: podcastError,
} = await useFetch(`/api/podcasts/${id}`);

const { data: episodes, pending: pendingEpisodes } = await useFetch(
  () => `/api/podcasts/${id}/episodes`,
  {
    query: { page },
  },
);

function formatDuration(seconds: number) {
  if (!seconds) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>
