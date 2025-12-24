import { Response } from 'express';

import { CachedAnalysis, DependencyApiResponse } from '../constants/model';
import {
  upsertAnalysis as upsertCache,
  deleteCachedAnalysis as deleteCache,
  getFileDetails as getFileCache,
  getCachedAnalysis,
  insertFile,
} from '../db/actions';

export const cachedAnalysis = async (
  username: string,
  repo: string,
  branch: string,
  res: Response,
) => {
  let cachedData: CachedAnalysis[] = [];

  try {
    cachedData = await getCachedAnalysis(username, repo, branch);

    if (cachedData.length > 0 && cachedData[0].data) {
      return res.json(cachedData[0].data);
    }
  } catch (dbError) {
    console.error('Database error checking cache:', dbError);
  }
};

export const upsertAnalysis = async ({
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
}) => {
  await upsertCache({
    username,
    repo,
    branch,
    data,
    branches,
  });
};

export const deleteCachedAnalysis = async (
  username: string,
  repo: string,
  branch: string,
) => {
  await deleteCache(username, repo, branch);
};

export const getCachedFileDetails = (fileId: string) => {
  return getFileCache(fileId);
};

export const insertFileCache = async (fileData: {
  name: string;
  content: string;
}) => {
  await insertFile(fileData);
};
