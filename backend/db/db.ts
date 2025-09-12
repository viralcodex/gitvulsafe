import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://depsec:mypassword@localhost:5432/depsec',
  user: "depsec",
  password: "mypassword",
});

export const db = drizzle(pool);
