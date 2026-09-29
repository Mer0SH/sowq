import { useState, useMemo, Fragment } from 'react';
import { SlidersHorizontal, X, ChevronDown, Search, ChevronLeft } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCategories } from '../context/CategoryContext';
import type { CategoryNode } from '../services/categoryService';
import { useCatalog } from '../context/CatalogContext';
import ProductCard from '../components/ProductCard';

const sortOptions = [
  { id: 'default', label: 'الافتراضي' },
  { id: 'price-asc', label: 'السعر: الأرخص' },
  { id: 'price-desc', label: 'السعر: الأغلى' },
  { id: 'rating', label: 'الأعلى تقييماً' },
  { id: 'newest', label: 'الأحدث' },
];

const priceRanges = [
  { id: 'all', label: 'الكل' },
  { id: '0-300', label: 'حتى YER 300' },
  { id: '300-600', label: 'YER 300 – YER 600' },
  { id: '600-1000', label: 'YER 600 – YER 1,000' },
  { id: '1000+', label: 'أكثر من YER 1,000' },
];

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-3 skeleton rounded w-1/3" />
        <div className="h-4 skeleton rounded" />
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-9 skeleton rounded-lg mt-3" />
      </div>
    </div>
  );
}

/* ── Category tree node ────────────────────────────────────── */
function CategoryTreeNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: CategoryNode;
  selectedId: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const isActive = selectedId === node.id || selectedId.startsWith(node.id + '-');
  const [open, setOpen] = useState(isActive);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={`flex items-center gap-1 rounded-lg transition-colors group
          ${depth === 0 ? '' : depth === 1 ? 'pr-3' : 'pr-6'}`}
      >
        <button
          onClick={() => hasChildren ? setOpen((v) => !v) : onSelect(node.id)}
          className={`flex-1 text-right py-1.5 text-sm transition-colors truncate
            ${selectedId === node.id
              ? 'text-brand font-bold'
              : depth === 0
                ? 'font-medium text-ink hover:text-brand'
                : 'text-ink-soft hover:text-brand'
            }`}
        >
          {node.name}
        </button>
        {hasChildren && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 w-6 h-6 flex items-center justify-center text-muted hover:text-ink transition-colors"
            aria-label={open ? 'إغلاق' : 'توسيع'}
          >
            <ChevronLeft size={13} className={`transition-transform ${open ? '-rotate-90' : ''}`} />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="border-r border-border mr-2.5 mt-0.5 mb-1">
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function ProductsPage() {
  const { products } = useCatalog();
  const { navParams, navigate, searchQuery: globalSearch } = useApp();
  const { tree, flat, getAncestors } = useCategories();

  const [selectedCategoryId, setSelectedCategoryId] = useState(navParams.categoryId ?? '');
  const [selectedSort, setSelectedSort] = useState('default');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(globalSearch);
  const [inStock, setInStock] = useState(false);

  /* All category ids in the selected subtree (for filtering) */
  const subtreeIds = useMemo(() => {
    if (!selectedCategoryId) return new Set<string>();
    const ids = new Set<string>();
    const collect = (id: string) => {
      ids.add(id);
      flat.filter((c) => c.parentId === id).forEach((c) => collect(c.id));
    };
    collect(selectedCategoryId);
    return ids;
  }, [selectedCategoryId, flat]);

  const filtered = useMemo(() => {
    let list = [...products];

    if (selectedCategoryId) {
      list = list.filter((p) => subtreeIds.has(p.category) || p.category === selectedCategoryId);
    }
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    if (inStock) list = list.filter((p) => p.stock > 0);
    if (selectedPrice !== 'all') {
      list = list.filter((p) => {
        if (selectedPrice === '1000+') return p.price >= 1000;
        const [min, max] = selectedPrice.split('-').map(Number);
        return p.price >= min && p.price <= max;
      });
    }
    switch (selectedSort) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating': list.sort((a, b) => b.rating - a.rating); break;
      case 'newest': list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
    }
    return list;
  }, [selectedCategoryId, subtreeIds, localSearch, selectedPrice, selectedSort, inStock]);

  /* Breadcrumb */
  const breadcrumb = selectedCategoryId ? getAncestors(selectedCategoryId) : [];
  const pageTitle = breadcrumb.at(-1)?.name ?? 'جميع المنتجات';

  function clearFilters() {
    setSelectedCategoryId('');
    setSelectedPrice('all');
    setInStock(false);
    setLocalSearch('');
  }

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Category tree */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm text-ink">الأقسام</h3>
          {selectedCategoryId && (
            <button
              onClick={() => setSelectedCategoryId('')}
              className="text-xs text-muted hover:text-brand transition-colors"
            >
              الكل
            </button>
          )}
        </div>
        <ul className="space-y-0.5">
          {tree.map((node) => (
            <CategoryTreeNode
              key={node.id}
              node={node}
              selectedId={selectedCategoryId}
              onSelect={(id) => { setSelectedCategoryId(id); setIsFilterOpen(false); }}
            />
          ))}
        </ul>
      </div>

      {/* Price range */}
      <div>
        <h3 className="font-bold text-sm text-ink mb-2">نطاق السعر</h3>
        <div className="space-y-1">
          {priceRanges.map((range) => (
            <button
              key={range.id}
              onClick={() => setSelectedPrice(range.id)}
              className={`w-full text-right px-3 py-1.5 rounded-lg text-sm transition-colors
                ${selectedPrice === range.id ? 'bg-brand text-white font-medium' : 'text-ink-soft hover:bg-surface'}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* In stock toggle */}
      <div>
        <h3 className="font-bold text-sm text-ink mb-2">التوفر</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setInStock((v) => !v)}
            className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${inStock ? 'bg-brand' : 'bg-border'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${inStock ? 'left-5' : 'left-0.5'}`} />
          </div>
          <span className="text-sm text-ink-soft">المتوفر فقط</span>
        </label>
      </div>

      <button
        onClick={clearFilters}
        className="w-full py-2 border border-border rounded-lg text-sm text-muted hover:text-ink hover:border-ink transition-colors"
      >
        مسح الفلاتر
      </button>
    </div>
  );

  return (
    <main className="page-transition max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-8 sm:pb-6">
      {/* Ghost-style page title */}
      <div className="relative mb-4 overflow-hidden">
        <h1 className="display-lg text-ink">{pageTitle}</h1>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted mb-5 flex-wrap" aria-label="مسار التنقل">
        <button onClick={() => navigate('home')} className="hover:text-ink transition-colors">الرئيسية</button>
        {breadcrumb.map((cat) => (
          <Fragment key={cat.id}>
            <ChevronLeft size={13} className="rotate-180" />
            <button
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`hover:text-ink transition-colors ${cat.id === selectedCategoryId ? 'text-ink font-medium' : ''}`}
            >
              {cat.name}
            </button>
          </Fragment>
        ))}
        {!selectedCategoryId && <><ChevronLeft size={13} className="rotate-180" /><span className="text-ink font-medium">جميع المنتجات</span></>}
      </nav>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 bg-white rounded-xl border border-border p-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <FilterPanel />
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 fade-up">
          {/* Category pills (mobile-first, from reference) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId('')}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                !selectedCategoryId
                  ? 'bg-ink text-white'
                  : 'bg-white border border-border text-ink-soft hover:border-ink'
              }`}
            >
              الكل
            </button>
            {tree.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelectedCategoryId(node.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedCategoryId === node.id
                    ? 'bg-ink text-white'
                    : 'bg-white border border-border text-ink-soft hover:border-ink'
                }`}
              >
                {node.name}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <input
                type="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="ابحث في المنتجات..."
                className="w-full h-10 bg-white border border-border rounded-xl pr-9 pl-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
            </div>

            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="h-10 bg-white border border-border rounded-xl pr-3 pl-8 text-sm text-ink focus:border-brand outline-none appearance-none cursor-pointer"
              >
                {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
            </div>

            <button
              onClick={() => setIsFilterOpen(true)}
              className="lg:hidden h-10 px-4 flex items-center gap-2 bg-white border border-border rounded-xl text-sm text-ink hover:border-brand transition-colors"
            >
              <SlidersHorizontal size={15} />
              فلترة
            </button>
          </div>

          <p className="text-sm text-muted mb-4">
            {pageTitle} — <span className="font-medium text-ink">{filtered.length} منتج</span>
          </p>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4">
                <Search size={32} className="text-muted" />
              </div>
              <h3 className="font-bold text-ink mb-2">لا توجد نتائج</h3>
              <p className="text-sm text-muted mb-5">جرّب تغيير معايير البحث أو الفلتر</p>
              <button onClick={clearFilters} className="px-6 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:bg-brand transition-colors">
                مسح الفلاتر
              </button>
            </div>
          ) : (
            <div className="stagger grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {isFilterOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setIsFilterOpen(false)} />
          <div
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
            className="fixed bottom-0 right-0 left-0 z-50 bg-white rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-ink">الفلاتر</h2>
              <button onClick={() => setIsFilterOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-muted">
                <X size={16} />
              </button>
            </div>
            <FilterPanel />
            <button
              onClick={() => setIsFilterOpen(false)}
              className="mt-5 w-full py-3 bg-ink text-white rounded-xl font-medium hover:bg-brand transition-colors"
            >
              عرض النتائج ({filtered.length})
            </button>
          </div>
        </>
      )}
    </main>
  );
}
