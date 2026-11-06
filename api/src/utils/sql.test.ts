import { describe, expect, it } from 'vitest';
import {
  buildInsertSQL,
  buildUpdateSQL,
  generatePlaceholders,
  mapDatabaseRows,
  objectToCamelCase,
  objectToSnakeCase,
  SelectQueryBuilder,
  toCamelCase,
  toSnakeCase,
  validateRequiredFields,
} from './sql';
import { ValidationError } from './errors';

describe('SQL helpers', () => {
  it('builds a SELECT query with optional clauses', () => {
    const query = new SelectQueryBuilder('products')
      .select(['product_id', 'name'])
      .join('suppliers', 'products.supplier_id = suppliers.supplier_id', 'LEFT')
      .where('products.price > 0')
      .where('suppliers.active = 1')
      .orderBy('name')
      .orderBy('price', 'DESC')
      .limit(10)
      .offset(5)
      .build();

    expect(query).toBe(
      'SELECT product_id, name FROM products LEFT JOIN suppliers ON products.supplier_id = suppliers.supplier_id WHERE products.price > 0 AND suppliers.active = 1 ORDER BY name ASC, price DESC LIMIT 10 OFFSET 5',
    );
    expect(new SelectQueryBuilder('products').build()).toBe('SELECT * FROM products');
  });

  it('converts camelCase and snake_case keys', () => {
    expect(toSnakeCase('supplierId')).toBe('supplier_id');
    expect(toCamelCase('supplier_id')).toBe('supplierId');
    expect(objectToSnakeCase({ supplierId: 2, displayName: 'Supplier' })).toEqual({
      supplier_id: 2,
      display_name: 'Supplier',
    });
    expect(objectToCamelCase<{ supplierId: number }>({ supplier_id: 2 })).toEqual({
      supplierId: 2,
    });
    expect(mapDatabaseRows<{ productId: number }>([{ product_id: 3 }])).toEqual([
      { productId: 3 },
    ]);
  });

  it('builds parameterized INSERT and UPDATE statements', () => {
    expect(generatePlaceholders(0)).toBe('');
    expect(generatePlaceholders(3)).toBe('?, ?, ?');
    expect(buildInsertSQL('products', { supplierId: 2, name: 'Widget' })).toEqual({
      sql: 'INSERT INTO products (supplier_id, name) VALUES (?, ?)',
      values: [2, 'Widget'],
    });
    expect(buildUpdateSQL('products', { displayName: 'Updated' }, 'product_id = ?')).toEqual({
      sql: 'UPDATE products SET display_name = ? WHERE product_id = ?',
      values: ['Updated'],
    });
  });

  it('validates required fields', () => {
    expect(() => validateRequiredFields({ name: 'Supplier' }, ['name'])).not.toThrow();
    expect(() => validateRequiredFields({ name: undefined }, ['name'])).toThrow(ValidationError);
    expect(() => validateRequiredFields({ name: null }, ['name'])).toThrow(ValidationError);
    expect(() => validateRequiredFields({ name: '' }, ['name'])).toThrow(ValidationError);
  });
});
