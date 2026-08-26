import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError } from '../errors';
import { captureException } from '../observability';

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const requestId = (req as any).id;

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      captureException(err, { requestId, path: req.path, method: req.method, code: err.code });
    }
    res.status(err.statusCode).json({ ...err.toJSON(), requestId });
    return;
  }

  captureException(err, { requestId, path: req.path, method: req.method });
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId,
  });
};
