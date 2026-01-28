<template>
  <div>
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin w-8 h-8 text-gray-400"
      />
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
          <span>{{
            new Date(episode.data.publishedAt).toLocaleDateString()
          }}</span>
          <span>•</span>
          <span>{{ formatDuration(episode.data.duration) }}</span>
        </div>

        <audio
          controls
          :src="episode.data.audioUrl || episode.data.enclosureUrl"
          class="w-full mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          Your browser does not support the audio element.
        </audio>
      </div>

      <div class="grid gap-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold">Show Notes</h3>
          </template>
          <div
            class="prose dark:prose-invert max-w-none break-words"
            v-html="episode.data.content || episode.data.description"
          ></div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">AI Summary</h3>
              <UButton
                v-if="!summary"
                :loading="summarizing"
                :disabled="!transcript"
                @click="triggerSummary"
                size="xs"
                color="primary"
                variant="soft"
              >
                Generate Summary
              </UButton>
            </div>
          </template>

          <div v-if="summaryPending" class="py-8 flex justify-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="animate-spin w-6 h-6 text-gray-400"
            />
          </div>

          <div
            v-else-if="summary"
            class="prose dark:prose-invert max-w-none break-words"
          >
            <div v-html="renderedSummary"></div>
          </div>

          <div v-else class="text-gray-500 italic text-center py-8">
            <span v-if="!transcript"
              >Generate a transcript first to enable summarization.</span
            >
            <span v-else
              >No summary available. Click 'Generate Summary' to create
              one.</span
            >
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Entities</h3>
              <UButton
                v-if="!entities?.length"
                :loading="extracting"
                :disabled="!transcript"
                @click="triggerExtraction"
                size="xs"
                color="primary"
                variant="soft"
              >
                Extract Entities
              </UButton>
            </div>
          </template>

          <div v-if="entitiesPending" class="py-8 flex justify-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="animate-spin w-6 h-6 text-gray-400"
            />
          </div>

          <div
            v-else-if="entities?.length"
            class="flex flex-wrap gap-2"
          >
            <UButton
              v-for="entity in entities"
              :key="entity.id"
              :to="`/entities/${entity.id}`"
              size="xs"
              color="gray"
              variant="solid"
            >
              {{ entity.name }}
            </UButton>
          </div>

          <div v-else class="text-gray-500 italic text-center py-8">
            <span v-if="!transcript"
              >Generate a transcript first to enable entity extraction.</span
            >
            <span v-else
              >No entities extracted. Click 'Extract Entities' to start.</span
            >
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Transcript</h3>
              <div class="flex gap-2">
                <span
                  v-if="transcript?.language"
                  class="text-xs font-mono px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                >
                  {{ transcript.language.toUpperCase() }}
                </span>
                <UButton
                  v-if="!transcript"
                  :loading="transcribing"
                  @click="triggerTranscription"
                  size="xs"
                  color="primary"
                  variant="soft"
                >
                  Transcribe
                </UButton>
              </div>
            </div>
          </template>

          <div v-if="transcriptPending" class="py-8 flex justify-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="animate-spin w-6 h-6 text-gray-400"
            />
          </div>

          <div
            v-else-if="transcript"
            class="prose dark:prose-invert max-w-none break-words whitespace-pre-wrap"
          >
            {{ transcript.content }}
          </div>

          <div v-else class="text-gray-500 italic text-center py-8">
            No transcript available. Click 'Transcribe' to generate one.
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import MarkdownIt from "markdown-it";
import markdownitFootnote from "markdown-it-footnote";

const md = new MarkdownIt({
  breaks: true,
  linkify: true,
  typographer: true,
}).use(markdownitFootnote);
</script>

<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;
const toast = useToast();

const { data: episode, pending, error } = await useFetch(`/api/episodes/${id}`);

// Fetch transcript separately (only for polling)
const {
  data: transcriptData,
  pending: transcriptPending,
  refresh: refreshTranscript,
} = await useFetch(`/api/episodes/${id}/transcript`, {
  key: `transcript-${id}`,
  server: false,
  lazy: true,
  immediate: false,
});

// Fetch summary separately (only for polling)
const {
  data: summaryData,
  pending: summaryPending,
  refresh: refreshSummary,
} = await useFetch(`/api/episodes/${id}/summary`, {
  key: `summary-${id}`,
  server: false,
  lazy: true,
  immediate: false,
});

// Fetch entities separately (only for polling)
const {
  data: entitiesData,
  pending: entitiesPending,
  refresh: refreshEntities,
} = await useFetch(`/api/episodes/${id}/entities`, {
  key: `entities-${id}`,
  server: false,
  lazy: true,
  immediate: false,
});

// Computed properties to merge initial data with polled data
const transcript = computed(() => transcriptData.value?.data || episode.value?.data?.transcript);
const summary = computed(() => summaryData.value?.data || episode.value?.data?.summary);
const entities = computed(() => entitiesData.value?.data || episode.value?.data?.entities);

const renderedSummary = computed(() => {
  if (summary.value?.content) {
    return md.render(summary.value.content);
  }
  return "";
});

const transcribing = ref(false);
const summarizing = ref(false);
const extracting = ref(false);

async function triggerTranscription() {
  transcribing.value = true;
  try {
    await $fetch(`/api/episodes/${id}/transcribe`, {
      method: "POST",
    });
    toast.add({
      title: "Transcription queued",
      description: "The transcription process has started in the background.",
      color: "green",
    });
    startPolling();
  } catch (e: any) {
    toast.add({
      title: "Error",
      description: e.message || "Failed to start transcription",
      color: "red",
    });
  } finally {
    transcribing.value = false;
  }
}

async function triggerSummary() {
  summarizing.value = true;
  try {
    await $fetch(`/api/episodes/${id}/summarize`, {
      method: "POST",
    });
    toast.add({
      title: "Summary queued",
      description: "The summary generation has started in the background.",
      color: "green",
    });
    startPollingSummary();
  } catch (e: any) {
    toast.add({
      title: "Error",
      description: e.message || "Failed to start summary generation",
      color: "red",
    });
  } finally {
    summarizing.value = false;
  }
}

async function triggerExtraction() {
  extracting.value = true;
  try {
    await $fetch(`/api/episodes/${id}/extract-entities`, {
      method: "POST",
    });
    toast.add({
      title: "Extraction queued",
      description: "Entity extraction started in background.",
      color: "green",
    });
    startPollingEntities();
  } catch (e: any) {
    toast.add({
      title: "Error",
      description: e.message || "Failed to start extraction",
      color: "red",
    });
  } finally {
    extracting.value = false;
  }
}

let pollInterval: NodeJS.Timeout | null = null;
let summaryPollInterval: NodeJS.Timeout | null = null;
let entitiesPollInterval: NodeJS.Timeout | null = null;

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  let attempts = 0;
  pollInterval = setInterval(async () => {
    attempts++;
    await refreshTranscript();
    if (transcriptData.value?.data || attempts > 20) {
      if (pollInterval) clearInterval(pollInterval);
    }
  }, 3000);
}

function startPollingSummary() {
  if (summaryPollInterval) clearInterval(summaryPollInterval);
  let attempts = 0;
  summaryPollInterval = setInterval(async () => {
    attempts++;
    await refreshSummary();
    if (summaryData.value?.data || attempts > 20) {
      if (summaryPollInterval) clearInterval(summaryPollInterval);
    }
  }, 3000);
}

function startPollingEntities() {
  if (entitiesPollInterval) clearInterval(entitiesPollInterval);
  let attempts = 0;
  entitiesPollInterval = setInterval(async () => {
    attempts++;
    await refreshEntities();
    if (entitiesData.value?.data?.length > 0 || attempts > 20) {
      if (entitiesPollInterval) clearInterval(entitiesPollInterval);
    }
  }, 3000);
}

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  if (summaryPollInterval) clearInterval(summaryPollInterval);
  if (entitiesPollInterval) clearInterval(entitiesPollInterval);
});

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
