import Parser from 'rss-parser';

export interface EpisodeFeedData {
  title: string;
  description?: string;
  audioUrl: string;
  imageUrl?: string;
  publishedAt?: Date;
  duration?: number; // Seconds
  guid: string;
}

export interface PodcastFeedData {
  title: string;
  description?: string;
  feedUrl: string;
  imageUrl?: string;
  author?: string;
  websiteUrl?: string;
  episodes: EpisodeFeedData[];
}

/**
 * Parses a duration string (e.g., "HH:MM:SS", "MM:SS", or seconds) into total seconds.
 */
function parseDuration(duration: string | number | undefined | null): number | undefined {
  if (duration === undefined || duration === null || duration === '') {
    return undefined;
  }

  // If it's already a number, assume it's seconds
  if (typeof duration === 'number') {
    return Math.round(duration);
  }

  const str = duration.toString().trim();

  // Check if it's just a number string
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // Parse HH:MM:SS or MM:SS
  const parts = str.split(':').map((part) => parseInt(part, 10));

  if (parts.some(isNaN)) {
    return undefined; // Invalid format
  }

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }

  return undefined;
}

/**
 * Fetches and parses an RSS feed for a podcast.
 * @param feedUrl The URL of the RSS feed.
 * @returns A promise that resolves to the parsed podcast data.
 * @throws Error if the feed cannot be fetched or parsed, or if required fields are missing.
 */
export async function parsePodcastFeed(feedUrl: string): Promise<PodcastFeedData> {
  const parser = new Parser({
    customFields: {
      item: [
        ['itunes:duration', 'itunesDuration'],
        ['itunes:image', 'itunesImage'],
      ],
      feed: [
        ['itunes:author', 'itunesAuthor'],
        ['itunes:image', 'itunesImage'],
      ],
    },
  });

  try {
    const feed = await parser.parseURL(feedUrl);

    if (!feed.title) {
      throw new Error('Feed is missing a title.');
    }

    const episodes: EpisodeFeedData[] = (feed.items || []).map((item) => {
      if (!item.title || !item.enclosure?.url || !item.guid) {
        // Skip items that are missing essential data for our schema
        // Or strictly throw? User said "return the object", implying a successful parse of the feed.
        // But if an individual episode is malformed, we probably want to skip it or handle it.
        // For now, let's filter out items that don't satisfy the strict requirements of our return type
        // if we were strictly validating, but let's try to be lenient or throw if critical info is missing.
        // The DB schema requires title, audioUrl, guid.
        return null;
      }

        // Extract episode image
        let episodeImageUrl: string | undefined;
        // @ts-ignore
        if (item.itunesImage && item.itunesImage['$'] && item.itunesImage['$'].href) {
            // @ts-ignore
            episodeImageUrl = item.itunesImage['$'].href;
        } else if (item.image?.url) {
             episodeImageUrl = item.image.url;
        } else if (item.itunes?.image) { // sometimes parser puts it here
             episodeImageUrl = item.itunes.image;
        }

      return {
        title: item.title,
        description: item.contentSnippet || item.content || item.description,
        audioUrl: item.enclosure.url,
          imageUrl: episodeImageUrl,
        publishedAt: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : undefined),
        duration: parseDuration(item.itunesDuration || item.duration),
        guid: item.guid,
      };
    }).filter((ep): ep is EpisodeFeedData => ep !== null);

    // Extract image URL (could be in image.url or itunes:image)
    // parser maps itunes:image to itunesImage object with '@' usually?
    // Wait, rss-parser custom fields:
    // If I use [['itunes:image', 'itunesImage']], it might put the object there.
    // Usually feed.image.url exists for standard RSS.

    let imageUrl = feed.image?.url;
    // @ts-ignore - rss-parser dynamic types
    if (!imageUrl && feed.itunesImage && feed.itunesImage['$'] && feed.itunesImage['$'].href) {
       // @ts-ignore
      imageUrl = feed.itunesImage['$'].href;
    }

    return {
      title: feed.title,
      description: feed.description,
      feedUrl: feedUrl,
      imageUrl: imageUrl,
      // @ts-ignore
      author: feed.itunesAuthor || feed.author, // rss-parser puts 'author' as the creator, sometimes itunesAuthor is better
      websiteUrl: feed.link,
      episodes: episodes,
    };

  } catch (error: any) {
    throw new Error(`Failed to parse podcast feed: ${error.message}`);
  }
}
