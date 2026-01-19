<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Discover</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">

      <!-- 1. Featured Trending Topic (Span 2) -->
      <UCard class="md:col-span-2 relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 z-0"></div>
        <div class="relative z-10 h-full flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <UBadge color="indigo" variant="subtle">Trending Topic</UBadge>
              <span class="text-xs text-gray-500 dark:text-gray-400">Updated today</span>
            </div>
            <h2 v-if="topics?.data?.[0]" class="text-3xl font-bold mb-2">
              {{ topics.data[0].name }}
            </h2>
            <h2 v-else class="text-3xl font-bold mb-2 text-gray-400">
              No trends yet
            </h2>
            <p class="text-gray-600 dark:text-gray-300 max-w-lg">
              Explore the latest discussions and emerging themes from across the podcast ecosystem.
            </p>
          </div>

          <div class="mt-8">
            <UButton
              v-if="topics?.data?.[0]"
              :to="`/topics/${topics.data[0].id}`"
              color="black"
              class="dark:bg-white dark:text-black"
              label="Explore Topic"
              trailing-icon="i-heroicons-arrow-right"
            />
          </div>
        </div>
      </UCard>

      <!-- 2. Global Trends Map (Span 1) -->
      <UCard class="md:col-span-1 relative overflow-hidden p-0">
        <template #header>
           <h3 class="font-semibold flex items-center gap-2">
             <UIcon name="i-heroicons-globe-alt" /> Global Reach
           </h3>
        </template>
        <div class="absolute inset-0 top-12 bottom-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <!-- Placeholder for Map -->
            <div class="text-center opacity-50">
                <UIcon name="i-heroicons-map" class="w-16 h-16 mb-2" />
                <p class="text-sm">Geospatial Data</p>
            </div>
            <!-- Simulating a map visual -->
            <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center opacity-20 grayscale mix-blend-multiply dark:mix-blend-overlay"></div>
        </div>
      </UCard>

      <!-- 3. Trending Entities List (Span 1, Tall) -->
      <UCard class="md:col-span-1 md:row-span-2 flex flex-col">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg">People of Interest</h3>
            <UButton to="/search" variant="ghost" color="gray" size="xs" icon="i-heroicons-arrow-right" />
          </div>
        </template>

        <div class="space-y-4">
          <div v-if="entitiesStatus === 'pending'" class="py-4 text-center">
             <UIcon name="i-heroicons-arrow-path" class="animate-spin w-5 h-5 text-gray-400" />
          </div>
          <div v-else-if="entities?.data?.length" v-for="(entity, index) in entities.data" :key="entity.id" class="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 -mx-2 rounded-lg transition-colors">
            <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
               {{ entity.name.charAt(0) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ entity.name }}</p>
              <p class="text-xs text-gray-500">{{ entity.count }} mentions</p>
            </div>
            <div class="text-gray-300 dark:text-gray-600">
               <span class="text-sm font-mono">#{{ index + 1 }}</span>
            </div>
          </div>
           <div v-else class="text-gray-500 text-sm text-center py-4">
            No trending entities found.
          </div>
        </div>
      </UCard>

      <!-- 4. Papers / Research (Span 2) -->
      <UCard class="md:col-span-2">
         <template #header>
            <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-document-text" class="text-gray-500" />
                <h3 class="font-bold">Latest Papers</h3>
            </div>
         </template>

         <div class="space-y-4">
             <!-- Fake Data for Papers -->
             <div class="p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
                <div class="flex gap-4">
                    <div class="w-12 h-16 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0"></div>
                    <div>
                        <h4 class="font-semibold text-sm">Attention Is All You Need</h4>
                        <p class="text-xs text-gray-500 mt-1">Vaswani et al. • 2017</p>
                        <p class="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-1">The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...</p>
                    </div>
                </div>
             </div>
              <div class="p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
                <div class="flex gap-4">
                    <div class="w-12 h-16 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0"></div>
                    <div>
                        <h4 class="font-semibold text-sm">GPT-4 Technical Report</h4>
                        <p class="text-xs text-gray-500 mt-1">OpenAI • 2023</p>
                         <p class="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-1">We report the development of GPT-4, a large-scale, multimodal model which can accept image and text inputs...</p>
                    </div>
                </div>
             </div>
         </div>
      </UCard>

    </div>
  </div>
</template>

<script setup lang="ts">
const { data: topics } = await useFetch("/api/topics/trending");
const { data: entities, status: entitiesStatus } = await useFetch("/api/entities/trending");

useHead({
  title: 'Home - Podtafolio'
})
</script>
