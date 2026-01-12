import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from '../utils/db';
import { join } from 'path';

export default defineNitroPlugin(async () => {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // In production (Docker), we expect migrations to be in a known location
  // or relative to the working directory if copied there.
  // We'll configure the Dockerfile to copy migrations to ./migrations
  const migrationsFolder = process.env.MIGRATIONS_FOLDER || join(process.cwd(), 'migrations');

  console.log('Running database migrations from:', migrationsFolder);

  try {
    await migrate(db, { migrationsFolder });
    console.log('Database migrations applied successfully.');
  } catch (error) {
    console.error('Failed to apply database migrations:', error);
  }
});
