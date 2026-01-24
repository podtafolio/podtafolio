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
                v-if="!episode.data.summary"
                :loading="summarizing"
                :disabled="!episode.data.transcript"
                @click="triggerSummary"
                size="xs"
                color="primary"
                variant="soft"
              >
                Generate Summary
              </UButton>
            </div>
          </template>

          <div
            v-if="episode.data.summary"
            class="prose dark:prose-invert max-w-none break-words"
          >
            <div v-html="renderedSummary"></div>
          </div>

          <div v-else class="text-gray-500 italic text-center py-8">
            <span v-if="!episode.data.transcript"
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
                v-if="!episode.data.entities?.length"
                :loading="extracting"
                :disabled="!episode.data.transcript"
                @click="triggerExtraction"
                size="xs"
                color="primary"
                variant="soft"
              >
                Extract Entities
              </UButton>
            </div>
          </template>

          <div
            v-if="episode.data.entities?.length"
            class="flex flex-wrap gap-2"
          >
            <UButton
              v-for="entity in episode.data.entities"
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
            <span v-if="!episode.data.transcript"
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
                  v-if="episode.data.transcript?.language"
                  class="text-xs font-mono px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                >
                  {{ episode.data.transcript.language.toUpperCase() }}
                </span>
                <UButton
                  v-if="!episode.data.transcript"
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

          <div
            v-if="episode.data.transcript"
            class="prose dark:prose-invert max-w-none break-words whitespace-pre-wrap"
          >
            {{ episode.data.transcript.content }}
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

const renderedSummary = computed(() => {
  if (episode.value?.data?.summary?.content) {
    return md.render(episode.value.data.summary.content);
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
    try {
      const res = await $fetch<{ data: any }>(
        `/api/episodes/${id}/transcript`,
      );
      if (res.data && episode.value?.data) {
        episode.value.data.transcript = res.data;
        if (pollInterval) clearInterval(pollInterval);
      }
    } catch (e) {
      // ignore
    }

    if (attempts > 20) {
      if (pollInterval) clearInterval(pollInterval);
    }
  }, 3000);
}

function startPollingSummary() {
  if (summaryPollInterval) clearInterval(summaryPollInterval);
  let attempts = 0;
  summaryPollInterval = setInterval(async () => {
    attempts++;
    try {
      const res = await $fetch<{ data: any }>(`/api/episodes/${id}/summary`);
      if (res.data && episode.value?.data) {
        episode.value.data.summary = res.data;
        if (summaryPollInterval) clearInterval(summaryPollInterval);
      }
    } catch (e) {
      // ignore
    }

    if (attempts > 20) {
      if (summaryPollInterval) clearInterval(summaryPollInterval);
    }
  }, 3000);
}

function startPollingEntities() {
  if (entitiesPollInterval) clearInterval(entitiesPollInterval);
  let attempts = 0;
  entitiesPollInterval = setInterval(async () => {
    attempts++;
    try {
      const res = await $fetch<{ data: any[] }>(`/api/episodes/${id}/entities`);
      if (res.data?.length && episode.value?.data) {
        episode.value.data.entities = res.data;
        if (entitiesPollInterval) clearInterval(entitiesPollInterval);
      }
    } catch (e) {
      // ignore
    }

    if (attempts > 20) {
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
