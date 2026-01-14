import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { escapeKey, invalidatePodcastCache, CACHE_NAMES, CACHE_GROUP } from '../../../server/utils/cache'

const mocks = vi.hoisted(() => {
  return {
    storage: {
      clear: vi.fn(),
      removeItem: vi.fn(),
    },
    useStorage: vi.fn()
  }
})

vi.stubGlobal('useStorage', mocks.useStorage)

describe('cache utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useStorage.mockReturnValue(mocks.storage)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('escapeKey', () => {
    it('should remove non-word characters', () => {
      expect(escapeKey('/api/test/123')).toBe('apitest123')
      expect(escapeKey('abc-def_123')).toBe('abcdef_123') // underscore is \w
      expect(escapeKey('hello world!')).toBe('helloworld')
    })
  })

  describe('invalidatePodcastCache', () => {
    it('should clear group caches and specific podcast item', async () => {
      const podcastId = '123'
      await invalidatePodcastCache(podcastId)

      expect(mocks.useStorage).toHaveBeenCalledWith('cache')

      const groupPrefix = `${CACHE_GROUP}:`

      // Verify group clears
      expect(mocks.storage.clear).toHaveBeenCalledWith(groupPrefix + CACHE_NAMES.PODCASTS_LIST)
      expect(mocks.storage.clear).toHaveBeenCalledWith(groupPrefix + CACHE_NAMES.EPISODES_LIST)
      expect(mocks.storage.clear).toHaveBeenCalledWith(groupPrefix + CACHE_NAMES.PODCAST_EPISODES)
      expect(mocks.storage.clear).toHaveBeenCalledWith(groupPrefix + CACHE_NAMES.SEARCH)

      // Verify specific item removal
      // path = /api/podcasts/123 -> escaped = apipodcasts123
      const expectedKey = `${groupPrefix}${CACHE_NAMES.PODCAST}:apipodcasts123.json`
      expect(mocks.storage.removeItem).toHaveBeenCalledWith(expectedKey)
    })
  })
})
