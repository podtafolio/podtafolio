import { getQuery, createError } from "h3";
import { searchPodcasts as searchItunes } from "../utils/itunes";
import {
  findPodcastsByTermOrFeedUrls,
  findPodcastsByTerm,
  findPodcastsByFeedUrls,
} from "../utils/podcastService";
import { CACHE_GROUP, CACHE_NAMES } from "../utils/cache";

export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event);
    const term = query.term as string;

    if (!term) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Query parameter "term" is required',
      });
    }

    try {
      // 1. Parallel Execution: Search iTunes AND Local DB (by term) simultaneously
      const [itunesResults, localTermResults] = await Promise.all([
        // Task A: iTunes Search
        (async () => {
          try {
            return await searchItunes(term);
          } catch (e) {
            console.warn(
              "iTunes search failed, proceeding with local search only:",
              e,
            );
            return [];
          }
        })(),
        // Task B: Local DB Search (by term only)
        findPodcastsByTerm(term),
      ]);

      // 2. Identify missing local podcasts that match iTunes results
      // We have local results by TERM.
      // We have iTunes results.
      // iTunes results might point to podcasts we HAVE locally, but didn't match the TERM.
      // (e.g. term="JRE", Local Title="Joe Rogan", iTunes Result="Joe Rogan" w/ feedUrl)

      // Collect feed URLs from iTunes results
      const itunesFeedUrls = itunesResults
        .map((p) => p.feedUrl)
        .filter((url): url is string => !!url);

      // Collect feed URLs we already found locally
      const localFeedUrls = new Set(localTermResults.map((p) => p.feedUrl));

      // Filter for feed URLs we need to check (those from iTunes not yet found locally)
      const feedUrlsToCheck = itunesFeedUrls.filter(
        (url) => !localFeedUrls.has(url),
      );

      // 3. Second Local DB Search (by missing feed URLs)
      let additionalLocalResults: typeof localTermResults = [];
      if (feedUrlsToCheck.length > 0) {
        additionalLocalResults = await findPodcastsByFeedUrls(feedUrlsToCheck);
      }

      // 4. Merge Local Results
      const allLocalResults = [...localTermResults, ...additionalLocalResults];

      // 5. Merge Logic (same as before)
      // Create a map of local podcasts by feedUrl for easy lookup
      const localMap = new Map<string, (typeof allLocalResults)[0]>();

      const formattedLocalResults = allLocalResults.map((p) => {
        if (p.feedUrl) {
          localMap.set(p.feedUrl, p);
        }
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          feedUrl: p.feedUrl,
          imageUrl: p.imageUrl,
          author: p.author,
          websiteUrl: p.websiteUrl,
          status: p.status,
          isImported: true,
        };
      });

      // Filter iTunes results: only keep those NOT in local DB (by feedUrl)
      const uniqueItunesResults = itunesResults
        .filter((p) => !p.feedUrl || !localMap.has(p.feedUrl))
        .map((p) => ({
          ...p,
          id: undefined,
          status: undefined,
          isImported: false,
        }));

      // 6. Return combined list (Local matches first)
      return [...formattedLocalResults, ...uniqueItunesResults];
    } catch (error: any) {
      // If it's already a H3 error (created by createError), rethrow it
      if (error.statusCode) {
        throw error;
      }

      // Otherwise wrap generic errors
      console.error("Search failed:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to search podcasts",
      });
    }
  },
  {
    group: CACHE_GROUP,
    name: CACHE_NAMES.SEARCH,
    maxAge: 30,
  },
);
