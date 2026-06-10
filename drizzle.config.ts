import { defineConfig } from 'drizzle-kit';
import fs from 'fs';
import path from 'path';

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envLocal = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
    const match = envLocal.match(/DATABASE_URL=(.*)/);
    if (match) {
      dbUrl = match[1].trim().replace(/^"|"$/g, '');
    }
  } catch (e) {}
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl!,
  },
});
