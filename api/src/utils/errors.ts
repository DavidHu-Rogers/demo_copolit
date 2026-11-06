import type { Request, Response, NextFunction } from 'express';
/**
 * Error handling utilities for database operations
 */

export class DatabaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = 'DATABASE_ERROR', statusCode: number = 500) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends DatabaseError {
  constructor(entity: string, id: string | number) {
    super(`${entity} with ID ${id} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(`Validation error: ${message}`, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends DatabaseError {
  constructor(message: string) {
    super(`Conflict: ${message}`, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

/**
 * Handle database errors and convert SQLite-specific errors to appropriate types
 */
export function handleDatabaseError(error: unknown, entity?: string, id?: string | number): never {
  const sqliteCode =
    typeof error === 'object' && error !== null && 'code' in error &&
      typeof error.code === 'string'
      ? error.code
      : undefined;

  if(!(error instanceof DatabaseError)) {
    const message = error instanceof Error ? error.message : error;

    if (!sqliteCode?.startsWith('SQLITE_')) {
      throw new DatabaseError(`Database operation failed: ${message}`, 'DATABASE_ERROR', 500);
    }
  }
  const code = error instanceof DatabaseError ? error.code : sqliteCode;
  const message = error instanceof Error ? error.message : String(error);

  // SQLite constraint violation (UNIQUE, FOREIGN KEY, etc.)
  if (code === 'SQLITE_CONSTRAINT' || code?.startsWith('SQLITE_CONSTRAINT_')) {
    if (message.includes('UNIQUE')) {
      throw new ConflictError('Resource already exists');
    }
    if (message.includes('FOREIGN KEY')) {
      throw new ValidationError('Invalid reference to related entity');
    }
    throw new ValidationError(message);
  }

  // SQLite busy/locked database
  if (code === 'SQLITE_BUSY' || code?.startsWith('SQLITE_BUSY_')) {
    throw new DatabaseError('Database is temporarily unavailable', 'DATABASE_BUSY', 503);
  }

  // Handle case where no rows were affected (for updates/deletes)
  if (message.includes('No rows affected') && entity && id) {
    throw new NotFoundError(entity, id);
  }

  throw error;
}

/**
 * Express error handler middleware for database errors
 */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof DatabaseError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Default error handling
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
