<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex font-sans">
    <!-- Sidebar -->
    <aside
      class="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col fixed inset-y-0 left-0 z-50"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <NuxtLink to="/" class="font-bold text-xl flex items-center gap-2 text-gray-900 dark:text-white">
          🎙️ Podtafolio
        </NuxtLink>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <UButton
          to="/"
          variant="ghost"
          icon="i-heroicons-home"
          class="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          active-class="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
        >
          Home
        </UButton>
        <UButton
          to="/search"
          variant="ghost"
          icon="i-heroicons-magnifying-glass"
          class="w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          active-class="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
        >
          Search
        </UButton>
      </nav>

      <!-- Sidebar Footer (Placeholder for User/Settings) -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800">
         <div class="flex items-center gap-3 px-2 py-2">
            <UAvatar src="https://avatars.githubusercontent.com/u/739984?v=4" alt="User" size="sm" />
            <div class="text-sm">
                <p class="font-medium text-gray-900 dark:text-white">User</p>
                <p class="text-xs text-gray-500">Pro Plan</p>
            </div>
         </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 ml-64 min-w-0">
      <div class="p-8 max-w-7xl mx-auto">
        <slot />
      </div>
    </main>
  </div>
</template>
