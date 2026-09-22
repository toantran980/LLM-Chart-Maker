import type { RequestHandler } from 'express';
import { ApiError } from '../errors';

export function requireApiSecret(): RequestHandler {
  const secret = process.env.APP_API_KEY?.trim();
  if (!secret) {
    return (_req, _res, next) => next();
  }

  return (req, _res, next) => {
    const provided = req.header('x-api-key');
    if (provided !== secret) {
      return next(new ApiError('Unauthorized', 401, 'UNAUTHORIZED'));
    }
    next();
  };
}
