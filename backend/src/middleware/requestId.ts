import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export const requestId: RequestHandler = (req, res, next) => {
  const id = (req.header(REQUEST_ID_HEADER) as string) || randomUUID();
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};
