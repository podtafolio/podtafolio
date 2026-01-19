CREATE INDEX `topics_embedding_idx` ON `topics` (libsql_vector_idx(embedding, 'metric=cosine'));
