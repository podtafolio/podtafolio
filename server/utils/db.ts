import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../database/schema';
import { join } from 'path';

// Construct the absolute path to the database file
// This ensures it works correctly regardless of where the process is started from
const dbPath = process.env.DB_PATH || join(process.cwd(), 'server', 'database', 'db.sqlite');

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
