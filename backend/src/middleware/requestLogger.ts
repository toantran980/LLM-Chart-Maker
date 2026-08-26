import type { RequestHandler } from 'express';
import { log } from '../logger';

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    log('info', 'request completed', {
      requestId: (req as any).id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    });
  });

  next();
};
