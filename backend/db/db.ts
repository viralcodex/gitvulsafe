import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://dephound:mypassword@localhost:5432/dephound'
});

export const db = drizzle(pool);
