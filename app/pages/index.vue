<template>
  <div>
    <!-- Trending Topics Section -->
    <div v-if="topics?.data?.length > 0" class="mb-10">
      <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-fire" class="text-orange-500" />
        Trending Topics
      </h2>
      <div class="flex flex-wrap gap-3">
        <UButton
          v-for="topic in topics.data"
          :key="topic.id"
          :to="`/topics/${topic.id}`"
          variant="outline"
          color="gray"
          class="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {{ topic.name }}
          <UBadge color="gray" variant="soft" size="xs" class="ml-1 rounded-full">{{ topic.count }}</UBadge>
        </UButton>
      </div>
    </div>

    <!-- My Podcasts Section -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">My Podcasts</h1>
      <UButton to="/search" icon="i-heroicons-plus" label="Add Podcast" />
    </div>

    <div v-if="status === 'pending'" class="py-12 flex justify-center">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin w-8 h-8 text-gray-400" />
    </div>

    <div v-else-if="status === 'error'" class="text-red-500 py-12 text-center">
      Failed to load podcasts.
    </div>

    <div v-else-if="podcasts?.data.length === 0" class="text-center py-12">
      <div class="text-gray-500 mb-4">You haven't subscribed to any podcasts yet.</div>
      <UButton to="/search" label="Discover Podcasts" size="lg" />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard
        v-for="podcast in podcasts?.data"
        :key="podcast.id"
        class="group cursor-pointer transition-shadow hover:shadow-md"
        @click="navigateTo(`/podcasts/${podcast.id}`)"
      >
        <div class="flex gap-4 items-center">
          <NuxtImg
            v-if="podcast.imageUrl"
            :src="podcast.imageUrl"
            :alt="podcast.title"
            class="w-16 h-16 rounded-lg object-cover bg-gray-100"
            loading="lazy"
          />
           <div class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400" v-else>
            <UIcon name="i-heroicons-microphone" class="w-8 h-8" />
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="font-bold truncate" :title="podcast.title">{{ podcast.title }}</h3>

            <div class="mt-1">
                 <span
                    v-if="podcast.status === 'importing'"
                    class="inline-flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full"
                >
                    <UIcon name="i-heroicons-arrow-path" class="animate-spin w-3 h-3" />
                    Importing...
                </span>
                <span
                    v-else-if="podcast.status === 'error'"
                    class="inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full"
                >
                    <UIcon name="i-heroicons-exclamation-circle" class="w-3 h-3" />
                    Error
                </span>
                 <span v-else class="text-xs text-gray-500">
                    Ready
                 </span>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: podcasts, status } = await useFetch('/api/podcasts')
const { data: topics } = await useFetch('/api/topics/trending')
</script>
