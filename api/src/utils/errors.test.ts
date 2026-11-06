import { describe, expect, it, vi } from 'vitest';
import express, { type Response } from 'express';
import request from 'supertest';
import {
  ConflictError,
  DatabaseError,
  errorHandler,
  handleDatabaseError,
  NotFoundError,
  ValidationError,
} from './errors';

describe('Database error handling', () => {
  it('creates domain errors with consistent status codes', () => {
    expect(new DatabaseError('failed')).toMatchObject({
      name: 'DatabaseError',
      code: 'DATABASE_ERROR',
      statusCode: 500,
    });
    expect(new NotFoundError('Product', 4).statusCode).toBe(404);
    expect(new ValidationError('Invalid input').statusCode).toBe(400);
    expect(new ConflictError('Duplicate').statusCode).toBe(409);
  });

  it('wraps unknown failures as database errors', () => {
    expect(() => handleDatabaseError(new Error('broken connection'))).toThrow(
      expect.objectContaining({
        code: 'DATABASE_ERROR',
        message: 'Database operation failed: broken connection',
      }),
    );
    expect(() => handleDatabaseError('unexpected')).toThrow(DatabaseError);
  });

  it('maps SQLite constraints and busy errors to domain errors', () => {
    expect(() =>
      handleDatabaseError(Object.assign(new Error('UNIQUE constraint failed'), {
        code: 'SQLITE_CONSTRAINT_UNIQUE',
      })),
    ).toThrow(ConflictError);
    expect(() =>
      handleDatabaseError(Object.assign(new Error('FOREIGN KEY constraint failed'), {
        code: 'SQLITE_CONSTRAINT_FOREIGNKEY',
      })),
    ).toThrow(ValidationError);
    expect(() =>
      handleDatabaseError(Object.assign(new Error('NOT NULL constraint failed'), {
        code: 'SQLITE_CONSTRAINT_NOTNULL',
      })),
    ).toThrow(ValidationError);
    expect(() =>
      handleDatabaseError(Object.assign(new Error('database is locked'), {
        code: 'SQLITE_BUSY',
      })),
    ).toThrow(
      expect.objectContaining({
        code: 'DATABASE_BUSY',
        statusCode: 503,
      }),
    );
  });

  it('preserves domain errors and maps no-row errors when entity details are provided', () => {
    const conflict = new ConflictError('Duplicate');
    expect(() => handleDatabaseError(conflict)).toThrow(conflict);
    expect(() =>
      handleDatabaseError(new DatabaseError('No rows affected'), 'Product', 7),
    ).toThrow(NotFoundError);
    expect(() => handleDatabaseError(new DatabaseError('No rows affected'))).toThrow(
      DatabaseError,
    );
  });

  it('returns structured errors from middleware and hides unknown error details', async () => {
    const app = express();
    app.get('/database-error', (_req, _res, next) => {
      next(new DatabaseError('Unavailable', 'DATABASE_BUSY', 503));
    });
    app.get('/unknown-error', (_req, _res, next) => {
      next(new Error('sensitive internal details'));
    });
    app.use(errorHandler);

    const [databaseResponse, unknownResponse] = await Promise.all([
      request(app).get('/database-error'),
      request(app).get('/unknown-error'),
    ]);

    expect(databaseResponse.status).toBe(503);
    expect(databaseResponse.body.error).toEqual({
      code: 'DATABASE_BUSY',
      message: 'Unavailable',
    });
    expect(unknownResponse.status).toBe(500);
    expect(unknownResponse.body.error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });
});
