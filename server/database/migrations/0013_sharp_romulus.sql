ALTER TABLE `entities` ADD `embedding` F32_BLOB(768);
CREATE INDEX `entities_embedding_idx` ON `entities` (libsql_vector_idx(embedding, 'metric=cosine'));
