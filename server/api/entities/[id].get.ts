import { entities, entityTypes, episodesEntities, episodes, podcasts } from '../../database/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' });

    // Fetch entity with type name
    const [entity] = await db.select({
        id: entities.id,
        name: entities.name,
        type: entityTypes.name,
        createdAt: entities.createdAt,
        updatedAt: entities.updatedAt
    })
    .from(entities)
    .leftJoin(entityTypes, eq(entities.typeId, entityTypes.id))
    .where(eq(entities.id, id))
    .limit(1);

    if (!entity) throw createError({ statusCode: 404, statusMessage: 'Entity not found' });

    // Get episodes
    const episodeList = await db.select({
        id: episodes.id,
        title: episodes.title,
        publishedAt: episodes.publishedAt,
        podcastTitle: podcasts.title,
        podcastId: podcasts.id,
        imageUrl: episodes.imageUrl,
        duration: episodes.duration,
    })
    .from(episodesEntities)
    .innerJoin(episodes, eq(episodesEntities.episodeId, episodes.id))
    .innerJoin(podcasts, eq(episodes.podcastId, podcasts.id))
    .where(eq(episodesEntities.entityId, id))
    .orderBy(desc(episodes.publishedAt));

    return {
        data: {
            ...entity,
            episodes: episodeList
        }
    };
});
