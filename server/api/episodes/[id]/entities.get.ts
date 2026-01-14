import { episodesEntities, entities, entityTypes } from '../../../database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing ID' });

    // Join episodes_entities and entities and entityTypes
    const results = await db.select({
        id: entities.id,
        name: entities.name,
        type: entityTypes.name
    })
    .from(episodesEntities)
    .innerJoin(entities, eq(episodesEntities.entityId, entities.id))
    .leftJoin(entityTypes, eq(entities.typeId, entityTypes.id))
    .where(eq(episodesEntities.episodeId, id));

    return { data: results };
});
