import { eq, and } from 'drizzle-orm';

import { DependencyApiResponse } from '../constants/model';
import { db } from '../db/db';

import { dependencies, uploadedManifests } from './schema';

export function getCachedBranches(username: string, repo: string) {
  return db
    .select({ branches: dependencies.branches, branch: dependencies.branch })
    .from(dependencies)
    .where(
      and(eq(dependencies.username, username), eq(dependencies.repo, repo)),
    )
    .limit(1);
}

export function getCachedAnalysis(
  username: string,
  repo: string,
  branch: string,
) {
  return db
    .select()
    .from(dependencies)
    .where(
      and(
        eq(dependencies.username, username),
        eq(dependencies.repo, repo),
        eq(dependencies.branch, branch),
      ),
    )
    .limit(1);
}

export function upsertAnalysis({
  username,
  repo,
  branch,
  data,
  branches,
}: {
  username: string;
  repo: string;
  branch: string;
  data: DependencyApiResponse;
  branches: string[];
}) {
  // Always provide branches, as it's required by the schema
  const setObj = { data, branches };
  return db
    .insert(dependencies)
    .values({ username, repo, branch, data, branches })
    .onConflictDoUpdate({
      target: [dependencies.username, dependencies.repo, dependencies.branch],
      set: setObj,
    });
}

export function deleteCachedAnalysis(
  username: string,
  repo: string,
  branch: string,
) {
  return db
    .delete(dependencies)
    .where(
      and(
        eq(dependencies.username, username),
        eq(dependencies.repo, repo),
        eq(dependencies.branch, branch),
      ),
    );
}

export function insertFile(file: { name: string; content: string }) {
  return db.insert(uploadedManifests).values({
    filename: file.name,
    content: file.content,
  });
}

export function getFileDetails(fileName: string) {
  return db
    .select()
    .from(uploadedManifests)
    .where(eq(uploadedManifests.filename, fileName))
    .then((rows) => rows[0]);
}
