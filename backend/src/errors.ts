import type { Response } from 'express';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'LLM_TIMEOUT'
  | 'LLM_ERROR'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: string;
  code: ErrorCode;
  details?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: ErrorCode,
    public details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON(): ApiErrorBody {
    return {
      error: this.message,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export function sendError(res: Response, err: ApiError): Response {
  return res.status(err.statusCode).json(err.toJSON());
}
