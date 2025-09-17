import {type Config} from 'drizzle-kit';

import dotenv from 'dotenv';

dotenv.config();

const drizzleConfig = {
  schema: './db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
}

export default drizzleConfig as Config;