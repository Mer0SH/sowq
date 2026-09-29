export const money = value => Math.round(Number(value) * 100) / 100;
export const fail = (status, message) => Object.assign(new Error(message), { status });

export function currentPromotions(promotions, now = Date.now()) {
  return promotions.filter(row => row.is_active && (!row.starts_at || Date.parse(row.starts_at) <= now) && (!row.ends_at || Date.parse(row.ends_at) >= now));
}

export function priceForProduct(product, promotions, coupon = '') {
  const regular = product.sale_price;
  let discount = 0;
  for (const promo of promotions) {
    if (promo.code && promo.code !== coupon) continue;
    if (promo.scope_type === 'products' && !promo.target_ids.includes(product.id)) continue;
    if (promo.scope_type === 'categories' && !promo.target_ids.includes(product.category_id)) continue;
    const amount = promo.discount_type === 'percent' ? regular * promo.value / 100 : promo.value;
    discount = Math.max(discount, Math.min(regular, amount));
  }
  const price = money(regular - discount);
  return { price, originalPrice: product.compare_at_price > price ? product.compare_at_price : price < regular ? regular : null };
}

export function quote(cart, products, promotions, shippingFee = 0) {
  const active = currentPromotions(promotions);
  const coupon = cart.coupon || '';
  if (coupon && !active.some(p => p.code === coupon)) throw fail(400, 'كود الخصم غير صالح');
  const quantities = new Map();
  for (const item of cart.items) quantities.set(item.product_id, (quantities.get(item.product_id) || 0) + item.quantity);
  const items = [...quantities].map(([productId, quantity]) => {
    const product = products.find(p => p.id === productId && p.is_active && p.category_active);
    if (!product) throw fail(404, 'أحد المنتجات غير متوفر');
    if (product.stock < quantity) throw fail(409, `نفدت كمية ${product.name}`);
    const regular = priceForProduct(product, active);
    const withCoupon = priceForProduct(product, active, coupon);
    return { product_id: product.id, name: product.name, quantity, unit_price: withCoupon.price, regular_price: regular.price, image: product.images?.[0] || '' };
  });
  if (coupon && !items.some(item => item.unit_price < item.regular_price)) throw fail(400, 'الكود لا ينطبق على منتجات السلة');
  const subtotal = money(items.reduce((sum, item) => sum + item.regular_price * item.quantity, 0));
  const discount = money(items.reduce((sum, item) => sum + (item.regular_price - item.unit_price) * item.quantity, 0));
  const shipping = money(shippingFee);
  return { items, subtotal, discount, shipping, total: money(subtotal - discount + shipping), currency: 'YER' };
}

export function publicProduct(product, category, promotions) {
  const pricing = priceForProduct(product, currentPromotions(promotions));
  const images = product.images || [];
  return {
    id: String(product.id), name: product.name, brand: product.brand || '', category: category.slug,
    price: pricing.price, originalPrice: pricing.originalPrice, rating: product.rating || 0,
    reviewCount: product.review_count || 0, image: images[0] || '', images,
    description: product.description || '', stock: product.stock, colors: product.colors || [],
    sizes: product.sizes || [], specs: product.specs || {}, isFeatured: !!product.is_featured,
    isNew: !!product.is_new,
    badge: product.stock <= 0 ? 'out' : pricing.originalPrice ? 'sale' : product.is_new ? 'new' : undefined,
  };
}

export function categoryDescendants(categories, assignedIds) {
  const permitted = new Set(assignedIds);
  let changed;
  do {
    changed = false;
    for (const category of categories) if (permitted.has(category.parent_id) && !permitted.has(category.id)) {
      permitted.add(category.id); changed = true;
    }
  } while (changed);
  return permitted;
}
