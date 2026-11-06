import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import productRouter from './product';
import * as productsRepository from '../repositories/productsRepo';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { DatabaseError, errorHandler } from '../utils/errors';

const supplierId = 1;
const product = {
  supplierId,
  name: 'Test Product',
  description: 'Product for route tests',
  price: 12.5,
  sku: 'TEST-001',
  unit: 'each',
  imgName: 'test.png',
};

let app: express.Express;

describe('Product API', () => {
  beforeAll(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);
    const db = await getDatabase();
    await db.run(
      'INSERT INTO suppliers (supplier_id, name) VALUES (?, ?)',
      [supplierId, 'Test Supplier'],
    );

    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    app.use(errorHandler);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await closeDatabase();
  });

  it('creates a product and returns it in product queries', async () => {
    const createResponse = await request(app).post('/products').send(product);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject(product);
    expect(createResponse.body.productId).toBeDefined();

    const [allResponse, idResponse, nameResponse] = await Promise.all([
      request(app).get('/products'),
      request(app).get(`/products/${createResponse.body.productId}`),
      request(app).get(`/products/name/${encodeURIComponent(product.name)}`),
    ]);

    expect(allResponse.status).toBe(200);
    expect(allResponse.body).toContainEqual(expect.objectContaining(product));
    expect(idResponse.status).toBe(200);
    expect(idResponse.body.productId).toBe(createResponse.body.productId);
    expect(nameResponse.status).toBe(200);
    expect(nameResponse.body).toContainEqual(expect.objectContaining(product));
  });

  it('updates and deletes a product', async () => {
    const createResponse = await request(app).post('/products').send({
      ...product,
      name: 'Product to update',
      sku: 'TEST-002',
    });
    const productId = createResponse.body.productId;

    const updateResponse = await request(app)
      .put(`/products/${productId}`)
      .send({ name: 'Updated Product' });
    const deleteResponse = await request(app).delete(`/products/${productId}`);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe('Updated Product');
    expect(deleteResponse.status).toBe(204);
  });

  it('returns 404 when a product is missing', async () => {
    const response = await request(app).get('/products/99999');
    expect(response.status).toBe(404);
    expect(response.text).toBe('Product not found');
  });

  it('returns 404 when updating or deleting a missing product', async () => {
    const [updateResponse, deleteResponse] = await Promise.all([
      request(app).put('/products/99999').send({ name: 'Missing Product' }),
      request(app).delete('/products/99999'),
    ]);

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
  });

  it('returns a validation error for an unknown supplier', async () => {
    const response = await request(app).post('/products').send({
      ...product,
      supplierId: 99999,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns a validation error when required product fields are missing', async () => {
    const response = await request(app).post('/products').send({ name: 'Incomplete Product' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an array product request body', async () => {
    const response = await request(app)
      .post('/products')
      .set('Content-Type', 'application/json')
      .send('[]');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('forwards database failures to the error handler', async () => {
    const repository = await productsRepository.getProductsRepository(true);
    vi.spyOn(repository, 'findAll').mockRejectedValueOnce(
      new DatabaseError('Database is temporarily unavailable', 'DATABASE_BUSY', 503),
    );

    const response = await request(app).get('/products');

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('DATABASE_BUSY');
  });
});
