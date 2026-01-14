export const CACHE_GROUP = 'api'

export const CACHE_NAMES = {
  PODCASTS_LIST: 'podcastsList',
  PODCAST: 'podcast',
  EPISODES_LIST: 'episodesList',
  PODCAST_EPISODES: 'podcastEpisodes',
  EPISODE: 'episode',
  SEARCH: 'search'
}

export function escapeKey(key: string) {
  return String(key).replace(/\W/g, "")
}

export async function invalidatePodcastCache(podcastId: string) {
  const storage = useStorage('cache')
  const groupPrefix = `${CACHE_GROUP}:`

  // Invalidate Lists (Podcasts, Episodes, Search)
  // We clear the whole group because we can't easily know all pagination keys
  await Promise.all([
    storage.clear(groupPrefix + CACHE_NAMES.PODCASTS_LIST),
    storage.clear(groupPrefix + CACHE_NAMES.EPISODES_LIST),
    storage.clear(groupPrefix + CACHE_NAMES.PODCAST_EPISODES),
    storage.clear(groupPrefix + CACHE_NAMES.SEARCH)
  ])

  // Invalidate Specific Podcast Detail
  // Key format: api:podcast:<normalizedPath>.json
  // Path is /api/podcasts/<id>
  const path = `/api/podcasts/${podcastId}`
  const normalizedKey = escapeKey(path)
  const podcastKey = `${groupPrefix}${CACHE_NAMES.PODCAST}:${normalizedKey}.json`

  await storage.removeItem(podcastKey)
}
