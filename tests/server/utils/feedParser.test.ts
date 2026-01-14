import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parsePodcastFeed } from "../../../server/utils/feedParser";

// Use vi.hoisted to ensure the mock handle is initialized before the mock factory runs
const mocks = vi.hoisted(() => {
  return {
    parseURL: vi.fn(),
  };
});

// Mock rss-parser
vi.mock("rss-parser", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      parseURL: mocks.parseURL,
    })),
  };
});

describe("feedParser utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully parse a valid podcast feed", async () => {
    const mockFeed = {
      title: "Test Podcast",
      description: "A test podcast",
      link: "https://example.com",
      image: { url: "https://example.com/image.jpg" },
      itunesAuthor: "Test Author",
      items: [
        {
          title: "Episode 1",
          contentSnippet: "Ep 1 Desc",
          enclosure: { url: "https://example.com/ep1.mp3" },
          guid: "ep1",
          isoDate: "2023-01-01T00:00:00.000Z",
          itunesDuration: "10:00",
        },
      ],
    };

    mocks.parseURL.mockResolvedValue(mockFeed);

    const result = await parsePodcastFeed("https://example.com/rss");

    expect(result).toEqual({
      title: "Test Podcast",
      description: "A test podcast",
      feedUrl: "https://example.com/rss",
      imageUrl: "https://example.com/image.jpg",
      author: "Test Author",
      websiteUrl: "https://example.com",
      episodes: [
        {
          title: "Episode 1",
          description: "Ep 1 Desc",
          audioUrl: "https://example.com/ep1.mp3",
          imageUrl: undefined,
          publishedAt: new Date("2023-01-01T00:00:00.000Z"),
          duration: 600, // 10:00 = 600s
          guid: "ep1",
        },
      ],
    });
  });

  it("should throw error if feed is missing title", async () => {
    mocks.parseURL.mockResolvedValue({});

    await expect(parsePodcastFeed("https://example.com/rss")).rejects.toThrow(
      "Failed to parse podcast feed: Feed is missing a title.",
    );
  });

  it("should filter out invalid episodes", async () => {
    const mockFeed = {
      title: "Test Podcast",
      items: [
        {
          title: "Valid Episode",
          enclosure: { url: "audio.mp3" },
          guid: "1",
        },
        {
          // Missing title
          enclosure: { url: "audio.mp3" },
          guid: "2",
        },
        {
          title: "Missing Audio",
          // Missing enclosure
          guid: "3",
        },
        {
          title: "Missing GUID",
          enclosure: { url: "audio.mp3" },
          // Missing GUID
        },
      ],
    };

    mocks.parseURL.mockResolvedValue(mockFeed);

    const result = await parsePodcastFeed("https://example.com/rss");
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].title).toBe("Valid Episode");
  });

  it("should fallback for image and author fields", async () => {
    // Test alternate locations for image and author
    const mockFeed = {
      title: "Test Podcast",
      author: "Fallback Author", // standard rss author
      itunesImage: { $: { href: "https://example.com/itunes.jpg" } }, // itunes image
      items: [],
    };

    mocks.parseURL.mockResolvedValue(mockFeed);

    const result = await parsePodcastFeed("https://example.com/rss");

    expect(result.author).toBe("Fallback Author");
    expect(result.imageUrl).toBe("https://example.com/itunes.jpg");
  });

  it("should parse duration correctly", async () => {
    // We can test duration parsing indirectly via episodes
    const mockFeed = {
      title: "Duration Test",
      items: [
        {
          title: "Secs",
          enclosure: { url: "a" },
          guid: "1",
          itunesDuration: "3600",
        }, // 3600s
        {
          title: "MM:SS",
          enclosure: { url: "b" },
          guid: "2",
          itunesDuration: "10:00",
        }, // 600s
        {
          title: "HH:MM:SS",
          enclosure: { url: "c" },
          guid: "3",
          itunesDuration: "01:00:00",
        }, // 3600s
        { title: "Number", enclosure: { url: "d" }, guid: "4", duration: 120 }, // 120s (raw number)
        {
          title: "Invalid",
          enclosure: { url: "e" },
          guid: "5",
          itunesDuration: "invalid",
        }, // undefined
      ],
    };

    mocks.parseURL.mockResolvedValue(mockFeed);

    const result = await parsePodcastFeed("https://example.com/rss");

    const durations = result.episodes.map((e) => e.duration);
    expect(durations).toEqual([3600, 600, 3600, 120, undefined]);
  });
});
