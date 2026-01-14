<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header
      class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
    >
      <UContainer class="flex items-center justify-between h-16">
        <NuxtLink to="/" class="font-bold text-xl flex items-center gap-2">
          🎙️ Podtafolio
        </NuxtLink>
        <nav class="flex gap-2">
          <UButton to="/" variant="ghost" icon="i-heroicons-home"
            >My Podcasts</UButton
          >
          <UButton
            to="/search"
            variant="ghost"
            icon="i-heroicons-magnifying-glass"
            >Search</UButton
          >
        </nav>
      </UContainer>
    </header>

    <main class="py-8">
      <UContainer>
        <slot />
      </UContainer>
    </main>
  </div>
</template>
