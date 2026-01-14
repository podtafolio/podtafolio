import { getQuery, createError } from "h3";
import { searchPodcasts as searchItunes } from "../utils/itunes";
import { findPodcastsByTermOrFeedUrls } from "../utils/podcastService";
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
      // 1. Search iTunes (handle errors gracefully)
      let itunesResults: any[] = [];
      try {
        itunesResults = await searchItunes(term);
      } catch (e) {
        console.warn(
          "iTunes search failed, proceeding with local search only:",
          e,
        );
      }

      // 2. Extract feed URLs from iTunes results to find matches in DB
      const itunesFeedUrls = itunesResults
        .map((p) => p.feedUrl)
        .filter((url): url is string => !!url);

      // 3. Search Local DB (by term OR by matching feed URLs from iTunes)
      const localResults = await findPodcastsByTermOrFeedUrls(
        term,
        itunesFeedUrls,
      );

      // 4. Merge Logic
      // Create a map of local podcasts by feedUrl for easy lookup
      const localMap = new Map<string, (typeof localResults)[0]>();

      const formattedLocalResults = localResults.map((p) => {
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

      // 5. Return combined list (Local matches first)
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
