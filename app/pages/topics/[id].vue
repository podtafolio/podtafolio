<template>
  <div class="max-w-4xl mx-auto py-8">
    <UButton
      @click="$router.back()"
      variant="ghost"
      icon="i-heroicons-arrow-left"
      class="mb-6"
    >
      Back
    </UButton>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-8 h-8 text-gray-400"
      />
    </div>

    <div v-else-if="error || !topic" class="text-center py-12">
      <div class="text-red-500 mb-2">Topic not found</div>
      <UButton to="/" variant="link">Go home</UButton>
    </div>

    <div v-else>
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-2">
          <UIcon name="i-heroicons-hashtag" class="text-primary-500" />
          <span class="text-sm text-gray-500">Topic</span>
        </div>
        <h1 class="text-3xl font-bold">{{ topic.data.name }}</h1>
      </div>

      <div class="space-y-6">
        <h2 class="text-xl font-semibold flex items-center gap-2">
          Related Episodes
          <UBadge color="gray" variant="soft">{{
            topic.data.episodes.length
          }}</UBadge>
        </h2>

        <div
          v-if="topic.data.episodes.length === 0"
          class="text-gray-500 italic"
        >
          No episodes found.
        </div>

        <UCard v-for="episode in topic.data.episodes" :key="episode.id">
          <div class="flex gap-4">
            <img
              v-if="episode.imageUrl"
              :src="episode.imageUrl"
              class="w-20 h-20 object-cover rounded-lg bg-gray-100"
              alt="Episode Art"
            />
            <div
              class="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"
              v-else
            >
              <UIcon name="i-heroicons-microphone" class="w-8 h-8" />
            </div>
            <div class="flex-1 min-w-0">
              <NuxtLink :to="`/episodes/${episode.id}`" class="block group">
                <h3
                  class="font-semibold text-lg group-hover:text-primary-500 transition-colors truncate"
                >
                  {{ episode.title }}
                </h3>
              </NuxtLink>
              <div class="text-sm text-gray-500 mb-2">
                {{ episode.podcastTitle }} •
                {{ new Date(episode.publishedAt).toLocaleDateString() }}
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;

const { data: topic, pending, error } = await useFetch(`/api/topics/${id}`);
</script>
