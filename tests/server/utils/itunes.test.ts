import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchPodcasts } from '../../../server/utils/itunes'

// Mock globals
const mockFetch = vi.fn()

// Mock h3 for createError
vi.mock('h3', async (importOriginal) => {
    const actual = await importOriginal<typeof import('h3')>()
    return {
        ...actual,
        createError: vi.fn((obj) => obj)
    }
})

import { createError } from 'h3'

vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('createError', createError)

describe('itunes utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock behavior for createError to return the object passed
    vi.mocked(createError).mockImplementation((obj: any) => obj)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully search and parse podcasts', async () => {
    const mockResponse = {
      resultCount: 2,
      results: [
        {
          collectionName: 'Test Podcast',
          feedUrl: 'https://example.com/feed',
          artworkUrl600: 'https://example.com/image.jpg',
          artistName: 'Test Author',
          collectionViewUrl: 'https://example.com'
        },
        {
          collectionName: 'No Feed Podcast',
          // Missing feedUrl
          artworkUrl600: 'https://example.com/image2.jpg',
        }
      ]
    }

    mockFetch.mockResolvedValue(mockResponse)

    const results = await searchPodcasts('test')

    expect(mockFetch).toHaveBeenCalledWith('https://itunes.apple.com/search', {
      params: {
        term: 'test',
        media: 'podcast',
        entity: 'podcast'
      }
    })

    // Should filter out the one without feedUrl
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      title: 'Test Podcast',
      description: null,
      feedUrl: 'https://example.com/feed',
      imageUrl: 'https://example.com/image.jpg',
      author: 'Test Author',
      websiteUrl: 'https://example.com'
    })
  })

  it('should handle stringified JSON response', async () => {
    const mockObj = {
      resultCount: 1,
      results: [
        {
          collectionName: 'String Podcast',
          feedUrl: 'https://example.com/feed',
        }
      ]
    }
    const mockResponse = JSON.stringify(mockObj)

    mockFetch.mockResolvedValue(mockResponse)

    const results = await searchPodcasts('test')

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('String Podcast')
  })

  it('should throw 502 error on Zod validation failure', async () => {
    // Return invalid structure (missing resultCount)
    const mockResponse = {
      foo: 'bar'
    }

    mockFetch.mockResolvedValue(mockResponse)

    // Ensure we actually catch an error
    expect.assertions(1)

    try {
      await searchPodcasts('test')
    } catch (error: any) {
        expect(createError).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 502,
            statusMessage: 'Invalid response from iTunes provider'
        }))
    }
  })

  it('should throw original error if fetch fails', async () => {
    const networkError = new Error('Network error')
    mockFetch.mockRejectedValue(networkError)

    await expect(searchPodcasts('test')).rejects.toThrow('Network error')
  })

  it('should handle missing optional fields correctly', async () => {
      const mockResponse = {
        resultCount: 1,
        results: [
          {
            collectionName: 'Minimal Podcast',
            feedUrl: 'https://example.com/feed',
            // Missing others
          }
        ]
      }

      mockFetch.mockResolvedValue(mockResponse)

      const results = await searchPodcasts('test')

      expect(results[0]).toEqual({
        title: 'Minimal Podcast',
        description: null,
        feedUrl: 'https://example.com/feed',
        imageUrl: null,
        author: null,
        websiteUrl: null
      })
  })
})
