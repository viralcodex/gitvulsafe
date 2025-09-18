import {
  pgTable,
  varchar,
  jsonb,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { DependencyApiResponse } from '../constants/constants';

export const dependencies = pgTable(
  'dependencies',
  {
    uuid: uuid('id').defaultRandom().primaryKey().unique(),
    username: varchar('username', { length: 64 }).$type<string>().notNull(),
    repo: varchar('repo', { length: 128 }).$type<string>().notNull(),
    branch: varchar('branch', { length: 128 }).$type<string>().notNull(),
    branches: jsonb('branches').$type<string[]>().notNull(),
    data: jsonb('data').$type<DependencyApiResponse>(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    uniq_dep: unique().on(table.username, table.repo, table.branch),
  }),
);

export const uploadedManifests = pgTable('uploaded_manifests', {
  id: uuid('id').defaultRandom().primaryKey().unique(),
  filename: varchar('filename', { length: 256 }).notNull(),
  content: varchar('content', { length: 100_000 }).notNull(), // adjust size if needed
  uploaded_at: timestamp('uploaded_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
