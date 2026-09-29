import { useEffect, useState } from 'react';
import { ImageOff, Pencil, Tag } from 'lucide-react';
import type { Category, Product } from '../../services/adminApi';
import { mediaUrl } from '../../services/storefrontApi';
import { money, num } from './ui';

function ProductPhoto({ product, large = false }: { product: Product; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  const src = product.images?.[0];
  useEffect(() => setBroken(false), [src]);
  return <div className={`admin-product-photo ${large ? 'large' : ''}`}>
    {src && !broken ? <img src={mediaUrl(src)} alt={product.name} onError={() => setBroken(true)} /> : <span className="admin-photo-empty"><ImageOff size={25} />لا توجد صورة</span>}
  </div>;
}

export default function ProductWorkspace({ products, allProducts, categories, filter, onFilter, onEdit, canEdit }: {
  products: Product[]; allProducts: Product[]; categories: Category[]; filter: string; onFilter: (value: string) => void;
  onEdit: (product: Product) => void; canEdit: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = products.find(p => p.id === selectedId) || products[0];
  return <div className="admin-inventory">
    <aside className="admin-inventory-filters" aria-label="فلاتر المنتجات">
      <div className="admin-inventory-filter-title"><Tag size={16} /><strong>تصفية المنتجات</strong></div>
      <div className="admin-inventory-filter-group"><strong>الحالة</strong>
        {[['all', 'كل المنتجات'], ['active', 'المعروضة'], ['low', 'مخزون منخفض'], ['out', 'نفد المخزون'], ['hidden', 'المخفية']].map(([value, label]) =>
          <button key={value} className={filter === value ? 'active' : ''} onClick={() => onFilter(value)}>{label}</button>)}
      </div>
      <div className="admin-inventory-filter-group"><strong>الأقسام</strong>
        {categories.filter(c => allProducts.some(p => p.category_id === c.id)).map(c => <button key={c.id} className={filter === String(c.id) ? 'active' : ''} onClick={() => onFilter(String(c.id))}>{c.name}</button>)}
      </div>
    </aside>
    <div className="admin-inventory-results">
      <div className="admin-inventory-results-title"><div><strong>المنتجات</strong><span>{num(products.length)} في هذه الصفحة</span></div><small>اختر منتجًا لعرض تفاصيله</small></div>
      {products.length === 0 && <div className="admin-inventory-empty">لا توجد منتجات مطابقة. غيّر البحث أو التصفية.</div>}
      <div className="admin-product-grid">{products.map(p => <button type="button" className={`admin-product-tile ${selected?.id === p.id ? 'selected' : ''}`} key={p.id} onClick={() => setSelectedId(p.id)} aria-label={`عرض تفاصيل ${p.name}`}>
        <ProductPhoto product={p} /><div className="content"><div className="admin-product-tile-top"><strong>{p.name}</strong>{p.compare_at_price && p.compare_at_price > p.sale_price && <span>خصم</span>}</div><small>{p.category_name}</small><div className="price">{money(p.sale_price)}</div><footer><span className={p.stock <= 5 ? 'admin-stock-low' : ''}>{!p.is_active ? 'مخفي' : p.stock > 0 ? `${num(p.stock)} متوفر` : 'نفد المخزون'}</span><span>التفاصيل ←</span></footer></div>
      </button>)}</div>
    </div>
    {selected && <aside className="admin-product-detail" aria-label="تفاصيل المنتج المحدد">
      <div className="admin-product-detail-title"><strong>تفاصيل المنتج</strong><span>#{num(selected.id)}</span></div>
      <ProductPhoto product={selected} large />
      <h3>{selected.name}</h3><p>{selected.category_name}{selected.brand ? ` · ${selected.brand}` : ''}</p>
      <div className="admin-product-detail-price"><strong>{money(selected.sale_price)}</strong>{selected.compare_at_price && selected.compare_at_price > selected.sale_price ? <del>{money(selected.compare_at_price)}</del> : null}</div>
      <dl><div><dt>المخزون</dt><dd className={selected.stock <= 5 ? 'admin-stock-low' : ''}>{num(selected.stock)}</dd></div><div><dt>الحالة</dt><dd>{selected.is_active ? 'معروض' : 'مخفي'}</dd></div><div><dt>الرمز</dt><dd><bdi>{selected.sku || '—'}</bdi></dd></div><div><dt>الصور</dt><dd>{num(selected.images?.length || 0)}</dd></div></dl>
      {selected.description && <p className="admin-product-detail-description">{selected.description}</p>}
      {canEdit && <button className="admin-btn full" onClick={() => onEdit(selected)}><Pencil size={16} />تعديل المنتج والصور</button>}
    </aside>}
  </div>;
}
