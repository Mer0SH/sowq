import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Heart, ShoppingCart, User, X, Menu, ChevronLeft } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCategories } from '../context/CategoryContext';
import type { CategoryNode } from '../services/categoryService';
import type { Product } from '../data/products';
import { useCatalog } from '../context/CatalogContext';
import SafeImage from './SafeImage';
import { formatPrice } from '../services/storefrontApi';

export default function Header() {
  const { navigate, cartCount, favorites, setIsCartOpen } = useApp();
  const { tree } = useCategories();
  const { products } = useCatalog();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [hoveredL1, setHoveredL1] = useState<string | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<Set<string>>(new Set());
  useEffect(() => {
    const closeOverlay = (event: Event) => {
      if (isSearchOpen) { setIsSearchOpen(false); event.preventDefault(); }
      else if (isMobileMenuOpen) { setIsMobileMenuOpen(false); event.preventDefault(); }
    };
    window.addEventListener('souq-before-back', closeOverlay);
    return () => window.removeEventListener('souq-before-back', closeOverlay);
  }, [isSearchOpen, isMobileMenuOpen]);
  const searchRef = useRef<HTMLInputElement>(null);
  const megaMenuTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(
      products.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)).slice(0, 5),
    );
  }, [searchQuery, products]);

  /* Mega-menu hover with small delay so it doesn't flicker */
  const enterL1 = useCallback((id: string) => {
    clearTimeout(megaMenuTimer.current);
    setHoveredL1(id);
  }, []);

  const leaveMenu = useCallback(() => {
    megaMenuTimer.current = setTimeout(() => setHoveredL1(null), 120);
  }, []);

  const stayMenu = useCallback(() => {
    clearTimeout(megaMenuTimer.current);
  }, []);

  function toggleMobileExpand(id: string) {
    setExpandedMobile((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function navToCategory(id: string) {
    setHoveredL1(null);
    setIsMobileMenuOpen(false);
    navigate('products', { categoryId: id });
  }

  const activeL1 = tree.find((n) => n.id === hoveredL1);

  return (
    <>
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-border/70 shadow-[0_6px_20px_-18px_rgba(26,22,20,0.55)]">
      {/* ── Main bar ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-14 sm:h-16 gap-2 sm:gap-3">
          {/* Logo */}
          <button
            onClick={() => navigate('home')}
            className="shrink-0 flex items-center gap-1"
            aria-label="الرئيسية"
          >
            <span className="text-[20px] sm:text-xl font-bold text-ink tracking-tight leading-none">سوق</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          </button>

          {/* Desktop nav — L1 categories ──────────────────── */}
          <nav
            className="hidden lg:flex items-center gap-0 flex-1 px-4"
            role="navigation"
            aria-label="التنقل الرئيسي"
            onMouseLeave={leaveMenu}
          >
            {tree.map((node) => (
              <button
                key={node.id}
                onMouseEnter={() => enterL1(node.id)}
                onClick={() => navToCategory(node.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
                  ${hoveredL1 === node.id ? 'text-brand bg-brand-50' : 'text-ink-soft hover:text-ink hover:bg-surface'}`}
              >
                {node.name}
              </button>
            ))}
          </nav>

          {/* Action icons */}
          <div className="flex items-center gap-0.5 sm:gap-1 mr-auto lg:mr-0">
            <button
              onClick={() => setIsSearchOpen((v) => !v)}
              className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl text-ink-soft hover:text-ink hover:bg-surface transition-colors"
              aria-label="بحث"
            >
              <Search size={20} />
            </button>

            <button
              onClick={() => navigate('account')}
              className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-ink-soft hover:text-ink hover:bg-surface transition-colors"
              aria-label={`المفضلة (${favorites.length})`}
            >
              <Heart size={20} />
              {favorites.length > 0 && (
                <span className="absolute top-1.5 left-1.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favorites.length > 9 ? '9+' : favorites.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-ink-soft hover:text-ink hover:bg-surface transition-colors"
              aria-label={`السلة (${cartCount})`}
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1.5 left-1.5 w-4 h-4 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('account')}
              className="w-10 h-10 hidden sm:flex items-center justify-center rounded-xl text-ink-soft hover:text-ink hover:bg-surface transition-colors"
              aria-label="حسابي"
            >
              <User size={20} />
            </button>

            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-ink-soft hover:text-ink hover:bg-surface transition-colors lg:hidden"
              aria-label="القائمة"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── Search bar ──────────────────────────────────── */}
        {isSearchOpen && (
          <div className="pb-3 relative" style={{ animation: 'fadeIn 0.15s ease-out' }}>
            <form
              onSubmit={(e) => { e.preventDefault(); setIsSearchOpen(false); navigate('products'); }}
              className="relative"
            >
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج، ماركة، قسم..."
                className="store-search-input w-full h-11 bg-surface rounded-xl pr-10 pl-10 text-sm border border-border focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
              <button
                type="button"
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
                className="sm:hidden absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                aria-label="إغلاق البحث"
              >
                <X size={17} />
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hidden sm:block absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  <X size={15} />
                </button>
              )}
            </form>
            {searchResults.length > 0 && (
              <div className="absolute top-full right-0 left-0 mt-1.5 bg-white rounded-xl border border-border shadow-xl overflow-hidden z-50">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setIsSearchOpen(false); setSearchQuery(''); navigate('product-detail', { productId: p.id }); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface transition-colors text-right"
                  >
                    <SafeImage src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-surface shrink-0" fallbackClassName="w-10 h-10 rounded-lg shrink-0 text-[8px]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                      <p className="text-xs text-muted">{formatPrice(p.price)}</p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => { setIsSearchOpen(false); navigate('products'); }}
                  className="w-full px-4 py-2.5 text-sm text-brand hover:bg-brand-50 transition-colors text-center border-t border-border"
                >
                  عرض كل النتائج
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Desktop mega-menu ────────────────────────────── */}
      {hoveredL1 && activeL1 && (
        <div
          className="hidden lg:block absolute right-0 left-0 top-full bg-white border-t border-border shadow-xl z-40"
          onMouseEnter={stayMenu}
          onMouseLeave={leaveMenu}
          style={{ animation: 'fadeIn 0.15s ease-out' }}
          role="region"
          aria-label={`قسم ${activeL1.name}`}
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex gap-8">
              {/* L1 image + name */}
              <div className="w-44 shrink-0">
                {activeL1.imageUrl && (
                  <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-surface">
                    <img src={activeL1.imageUrl} alt={activeL1.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <button
                  onClick={() => navToCategory(activeL1.id)}
                  className="flex items-center gap-1 text-sm font-bold text-ink hover:text-brand transition-colors"
                >
                  عرض كل {activeL1.name}
                  <ChevronLeft size={14} />
                </button>
              </div>

              {/* L2 + L3 columns */}
              <div className="flex-1 grid grid-cols-3 xl:grid-cols-4 gap-6">
                {activeL1.children.map((l2) => (
                  <div key={l2.id}>
                    <button
                      onClick={() => navToCategory(l2.id)}
                      className="block text-sm font-bold text-ink hover:text-brand transition-colors mb-2"
                    >
                      {l2.name}
                    </button>
                    <ul className="space-y-1">
                      {l2.children.map((l3) => (
                        <li key={l3.id}>
                          <button
                            onClick={() => navToCategory(l3.id)}
                            className="text-sm text-muted hover:text-brand transition-colors leading-snug text-right w-full"
                          >
                            {l3.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile menu ─────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden border-t border-border bg-white max-h-[70vh] overflow-y-auto"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          <nav aria-label="القائمة الجانبية">
            <button onClick={() => { setIsMobileMenuOpen(false); navigate('admin'); }} className="flex w-full min-h-12 items-center justify-between border-b border-border px-4 py-3 text-right text-sm font-bold text-ink">
              دخول الموظفين والإدارة <ChevronLeft size={18} aria-hidden="true" />
            </button>
            {tree.map((l1) => (
              <div key={l1.id} className="border-b border-border last:border-0">
                <div className="flex items-center">
                  <button
                    onClick={() => navToCategory(l1.id)}
                    className="flex-1 px-4 py-3 text-sm font-bold text-ink text-right hover:text-brand transition-colors"
                  >
                    {l1.name}
                  </button>
                  {l1.children.length > 0 && (
                    <button
                      onClick={() => toggleMobileExpand(l1.id)}
                      className="px-4 py-3 text-muted hover:text-ink transition-colors"
                      aria-label={expandedMobile.has(l1.id) ? 'إغلاق' : 'توسيع'}
                    >
                      <ChevronLeft
                        size={16}
                        className={`transition-transform ${expandedMobile.has(l1.id) ? '-rotate-90' : ''}`}
                      />
                    </button>
                  )}
                </div>

                {expandedMobile.has(l1.id) && (
                  <div className="bg-surface pb-2">
                    {l1.children.map((l2) => (
                      <div key={l2.id}>
                        <div className="flex items-center">
                          <button
                            onClick={() => navToCategory(l2.id)}
                            className="flex-1 pr-8 pl-4 py-2 text-sm font-medium text-ink-soft text-right hover:text-brand transition-colors"
                          >
                            {l2.name}
                          </button>
                          {l2.children.length > 0 && (
                            <button
                              onClick={() => toggleMobileExpand(l2.id)}
                              className="px-4 py-2 text-muted hover:text-ink transition-colors"
                            >
                              <ChevronLeft
                                size={13}
                                className={`transition-transform ${expandedMobile.has(l2.id) ? '-rotate-90' : ''}`}
                              />
                            </button>
                          )}
                        </div>
                        {expandedMobile.has(l2.id) && (
                          <div>
                            {l2.children.map((l3) => (
                              <button
                                key={l3.id}
                                onClick={() => navToCategory(l3.id)}
                                className="w-full pr-14 pl-4 py-1.5 text-xs text-muted hover:text-brand transition-colors text-right block"
                              >
                                {l3.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
    {!isSearchOpen && <div className="sm:hidden bg-white px-4 pt-2.5 pb-3 border-b border-border/70">
      <button
        onClick={() => setIsSearchOpen(true)}
        className="flex w-full min-h-11 items-center gap-3 rounded-xl bg-surface px-4 text-muted text-sm text-right border border-border/70 active:scale-[0.99] transition-transform"
        aria-label="بحث"
        aria-expanded={false}
      >
        <Search size={18} aria-hidden="true" />
        <span>ابحث عن منتج أو قسم</span>
      </button>
    </div>}
    </>
  );
}

