import type { RequestHandler } from 'express';
import type { DiagramType } from '../../../shared/types';
import { ApiError } from '../errors';
import {
  MAX_ERROR_LENGTH,
  MAX_INSTRUCTION_LENGTH,
  MAX_MERMAID_LENGTH,
  MAX_TEXT_LENGTH,
  VALID_DIAGRAM_TYPES,
  VALID_DIRECTIONS,
} from '../limits';

function requireString(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  details: Record<string, string>,
): string | null {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    details[field] = 'Required non-empty string';
    return null;
  }
  if (value.length > maxLength) {
    details[field] = `Must be at most ${maxLength} characters`;
    return null;
  }
  return value;
}

function requireOptionalString(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
  details: Record<string, string>,
): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    details[field] = 'Must be a string';
    return undefined;
  }
  if (value.length > maxLength) {
    details[field] = `Must be at most ${maxLength} characters`;
    return undefined;
  }
  return value;
}

function requireDiagramType(body: Record<string, unknown>, details: Record<string, string>): DiagramType | null {
  const value = body.diagramType;
  if (typeof value !== 'string' || !VALID_DIAGRAM_TYPES.includes(value as DiagramType)) {
    details.diagramType = `Must be one of: ${VALID_DIAGRAM_TYPES.join(', ')}`;
    return null;
  }
  return value as DiagramType;
}

function validateDirection(body: Record<string, unknown>, details: Record<string, string>): boolean {
  const direction = body.direction;
  if (direction === undefined || direction === null) return true;
  if (typeof direction !== 'string') {
    details.direction = 'Must be a string';
    return false;
  }
  if (!VALID_DIRECTIONS.includes(direction as (typeof VALID_DIRECTIONS)[number])) {
    details.direction = `Must be one of: ${VALID_DIRECTIONS.join(', ')}`;
    return false;
  }
  return true;
}

function throwIfInvalid(details: Record<string, string>): void {
  if (Object.keys(details).length === 0) return;
  throw new ApiError('Request validation failed', 400, 'VALIDATION_ERROR', details);
}

export const validateDiagramRequest: RequestHandler = (req, _res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const details: Record<string, string> = {};

    requireString(body, 'text', MAX_TEXT_LENGTH, details);
    requireDiagramType(body, details);
    requireOptionalString(body, 'instruction', MAX_INSTRUCTION_LENGTH, details);
    validateDirection(body, details);

    throwIfInvalid(details);
    next();
  } catch (err) {
    next(err);
  }
};

export const validateRefineRequest: RequestHandler = (req, _res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const details: Record<string, string> = {};

    requireString(body, 'currentDiagram', MAX_MERMAID_LENGTH, details);
    requireString(body, 'instruction', MAX_INSTRUCTION_LENGTH, details);
    requireDiagramType(body, details);

    throwIfInvalid(details);
    next();
  } catch (err) {
    next(err);
  }
};

export const validateFixRequest: RequestHandler = (req, _res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const details: Record<string, string> = {};

    requireString(body, 'mermaid', MAX_MERMAID_LENGTH, details);
    requireString(body, 'error', MAX_ERROR_LENGTH, details);

    throwIfInvalid(details);
    next();
  } catch (err) {
    next(err);
  }
};

export const validateDescribeRequest: RequestHandler = (req, _res, next) => {
  try {
    const body = req.body as Record<string, unknown>;
    const details: Record<string, string> = {};

    requireString(body, 'mermaid', MAX_MERMAID_LENGTH, details);

    throwIfInvalid(details);
    next();
  } catch (err) {
    next(err);
  }
};
