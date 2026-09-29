import test from 'node:test';
import assert from 'node:assert/strict';
import { quote, categoryDescendants, priceForProduct } from './core.js';

test('quote calculates discounts and rejects overselling', () => {
  const product = { id: 1, name: 'منتج', sale_price: 100, stock: 2, is_active: 1, category_active: true, category_id: 3, images: [] };
  const promos = [{ id: 1, is_active: 1, discount_type: 'percent', value: 10, scope_type: 'all', target_ids: [], code: null }];
  assert.equal(priceForProduct(product, promos).price, 90);
  assert.equal(quote({ items: [{ product_id: 1, quantity: 2 }] }, [product], promos, 5).total, 185);
  assert.equal(quote({ items: [{ product_id: 1, quantity: 1 }, { product_id: 1, quantity: 1 }] }, [product], promos, 5).items[0].quantity, 2);
  assert.throws(() => quote({ items: [{ product_id: 1, quantity: 3 }] }, [product], promos), { status: 409 });
});

test('category permissions include descendants', () => {
  const categories = [{ id: 1, parent_id: null }, { id: 2, parent_id: 1 }, { id: 3, parent_id: 2 }, { id: 4, parent_id: null }];
  assert.deepEqual([...categoryDescendants(categories, [1])], [1, 2, 3]);
});
