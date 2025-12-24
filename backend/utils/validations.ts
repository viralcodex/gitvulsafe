import { Response } from 'express';

import { DependencyApiResponse, manifestFiles } from '../constants/model';
import { getCachedAnalysis } from '../db/actions';

import { sanitizeString } from './utils';

export const validateFile = (
  file: Express.Multer.File | undefined,
  res: Response,
) => {
  if (!file) {
    return res.status(400).json({
      error: 'No file uploaded',
      timestamp: new Date().toISOString(),
    });
  }

  // Enhanced file validation
  const maxSize = 5 * 1024 * 1024; // 5MB limit
  if (file.size > maxSize) {
    return res.status(400).json({
      error: 'File size exceeds the 5MB limit',
      maxSize: '5MB',
      receivedSize: `${Math.round((file.size / 1024 / 1024) * 100) / 100}MB`,
      timestamp: new Date().toISOString(),
    });
  }
  // File type validation
  const fileExtension = file.originalname.toLowerCase().split('.').pop();
  if (
    !fileExtension ||
    !Object.values(manifestFiles).some((type) => type.includes(fileExtension))
  ) {
    return res.status(400).json({
      error: 'Invalid file type',
      timestamp: new Date().toISOString(),
    });
  }
};

export const validateAndReturnAnalysisCache = async (
  username: string,
  repo: string,
  branch: string,
  res: Response,
): Promise<DependencyApiResponse> => {
  username = sanitizeString(username);
  repo = sanitizeString(repo);
  branch = sanitizeString(branch);
  const data = await getCachedAnalysis(username, repo, branch);

  if (data.length === 0 || !data[0].data) {
    res.write(
      `data: ${JSON.stringify({
        error:
          'Error: No analysis data found for the specified repo and branch. Please run dependency analysis first.',
      })}\n\n`,
    );
    res.end();
    return {} as DependencyApiResponse;
  }
  return data[0].data;
};
