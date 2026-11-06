import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import supplierRouter from './supplier';
import * as suppliersRepository from '../repositories/suppliersRepo';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { DatabaseError, errorHandler } from '../utils/errors';

let app: express.Express;

describe('Supplier API', () => {
  beforeAll(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    app = express();
    app.use(express.json());
    app.use('/suppliers', supplierRouter);
    app.use(errorHandler);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await closeDatabase();
  });

  it('creates a supplier and returns it in supplier queries', async () => {
    const supplier = {
      name: 'Test Supplier',
      description: 'Supplier for route tests',
      contactPerson: 'Taylor',
      email: 'taylor@example.com',
      phone: '555-0100',
      active: true,
      verified: true,
    };
    const createResponse = await request(app).post('/suppliers').send(supplier);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject(supplier);
    expect(createResponse.body.supplierId).toBeDefined();

    const [allResponse, idResponse, statusResponse] = await Promise.all([
      request(app).get('/suppliers'),
      request(app).get(`/suppliers/${createResponse.body.supplierId}`),
      request(app).get(`/suppliers/${createResponse.body.supplierId}/status`),
    ]);

    expect(allResponse.status).toBe(200);
    expect(allResponse.body).toContainEqual(expect.objectContaining(supplier));
    expect(idResponse.status).toBe(200);
    expect(idResponse.body.supplierId).toBe(createResponse.body.supplierId);
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body).toEqual({ status: 'APPROVED' });
  });

  it('updates and deletes a supplier', async () => {
    const createResponse = await request(app)
      .post('/suppliers')
      .send({ name: 'Supplier to update' });
    const supplierId = createResponse.body.supplierId;

    const updateResponse = await request(app)
      .put(`/suppliers/${supplierId}`)
      .send({ name: 'Updated Supplier' });
    const deleteResponse = await request(app).delete(`/suppliers/${supplierId}`);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe('Updated Supplier');
    expect(deleteResponse.status).toBe(204);
  });

  it('returns 404 for missing supplier records', async () => {
    const [getResponse, statusResponse, updateResponse, deleteResponse] = await Promise.all([
      request(app).get('/suppliers/99999'),
      request(app).get('/suppliers/99999/status'),
      request(app).put('/suppliers/99999').send({ name: 'Missing Supplier' }),
      request(app).delete('/suppliers/99999'),
    ]);

    expect(getResponse.status).toBe(404);
    expect(statusResponse.status).toBe(404);
    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
  });

  it('returns a validation error when the supplier name is missing', async () => {
    const response = await request(app).post('/suppliers').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('forwards database failures to the error handler', async () => {
    const repository = await suppliersRepository.getSuppliersRepository(true);
    vi.spyOn(suppliersRepository, 'getSuppliersRepository').mockResolvedValueOnce(repository);
    vi.spyOn(repository, 'findAll').mockRejectedValueOnce(
      new DatabaseError('Database is temporarily unavailable', 'DATABASE_BUSY', 503),
    );

    const response = await request(app).get('/suppliers');

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('DATABASE_BUSY');
  });

  it('forwards database failures from supplier mutations, lookups, and status checks', async () => {
    const repository = await suppliersRepository.getSuppliersRepository(true);
    const databaseError = new DatabaseError(
      'Database is temporarily unavailable',
      'DATABASE_BUSY',
      503,
    );
    vi.spyOn(suppliersRepository, 'getSuppliersRepository').mockResolvedValue(repository);
    vi.spyOn(repository, 'create').mockRejectedValue(databaseError);
    vi.spyOn(repository, 'findById').mockRejectedValue(databaseError);
    vi.spyOn(repository, 'update').mockRejectedValue(databaseError);
    vi.spyOn(repository, 'delete').mockRejectedValue(databaseError);

    const responses = await Promise.all([
      request(app).post('/suppliers').send({ name: 'Unavailable Supplier' }),
      request(app).get('/suppliers/1'),
      request(app).get('/suppliers/1/status'),
      request(app).put('/suppliers/1').send({ name: 'Updated Supplier' }),
      request(app).delete('/suppliers/1'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([503, 503, 503, 503, 503]);
    expect(responses.map((response) => response.body.error.code)).toEqual(
      Array(5).fill('DATABASE_BUSY'),
    );
  });
});
