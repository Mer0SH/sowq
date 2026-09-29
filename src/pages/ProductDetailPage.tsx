import { useLayoutEffect, useRef, useState } from 'react';
import { playProductTransition } from '../services/motion';
import { Heart, ShoppingCart, Star, Minus, Plus, ChevronRight, Share2, ZoomIn, Check, Shield, Truck, RotateCcw, X } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCatalog } from '../context/CatalogContext';
import ProductCard from '../components/ProductCard';
import TiltCard from '../components/TiltCard';
import { formatPrice } from '../services/storefrontApi';

const detailTabs = ['الوصف', 'المواصفات', 'التقييمات'];

const mockReviews = [
  { id: 1, name: 'سارة العمري', rating: 5, date: 'منذ 3 أيام', comment: 'منتج رائع جداً، الجودة ممتازة والتوصيل كان سريعاً. أنصح بشدة.' },
  { id: 2, name: 'محمد الحربي', rating: 4, date: 'منذ أسبوع', comment: 'جيد جداً، الشكل أنيق والمواد عالية الجودة. الحجم مناسب.' },
  { id: 3, name: 'نورة السالم', rating: 5, date: 'منذ أسبوعين', comment: 'أفضل شراء قمت به من سوق. سأشتري مرة أخرى بكل تأكيد!' },
];

export default function ProductDetailPage() {
  const { products } = useCatalog();
  const { navParams, navigate, addToCart, toggleFavorite, favorites, showToast } = useApp();
  const product = products.find((p) => p.id === navParams.productId) ?? products[0] ?? { id: '', name: '', brand: '', category: '', price: 0, rating: 0, reviewCount: 0, image: '', images: [], description: '', stock: 0 };
  const related = products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name ?? '');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('الوصف');
  const [addedToCart, setAddedToCart] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  /* True while the shared-element clone is still flying in, so the entrance
     animation does not fight the flight. */
  const [flying, setFlying] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const isFav = favorites.includes(product.id);
  const isOut = product.stock === 0;
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  function handleAddToCart() {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      showToast('يرجى اختيار المقاس أولاً', 'error');
      return;
    }
    setSizeError(false);

    if (addedToCart) return;
    addToCart({ product, quantity, selectedColor, selectedSize });
    setAddedToCart(true);
    showToast(`تمت إضافة "${product.name}" إلى السلة`);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  const images = product.images.length > 0 ? product.images : [product.image];
  const mainImg = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    if (playProductTransition(mainImg.current)) setFlying(true);
    const timer = setTimeout(() => setFlying(false), 1200);
    return () => clearTimeout(timer);
  }, [product.id]);

  if (!product.id) return <main className="max-w-7xl mx-auto px-6 py-24 text-center">جارٍ تحميل المنتج…</main>;

  return (
    <main className="page-transition max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-8 sm:pb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted mb-6 flex-wrap" aria-label="مسار التنقل">
        <button onClick={() => navigate('home')} className="hover:text-ink transition-colors">الرئيسية</button>
        <ChevronRight size={14} className="rotate-180" />
        <button onClick={() => navigate('products')} className="hover:text-ink transition-colors">المنتجات</button>
        <ChevronRight size={14} className="rotate-180" />
        <span className="text-ink font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* ── Gallery ────────────────────────────────────── */}
        <div className={flying ? '' : 'pdp-enter pdp-enter-1'}>
          {/* Main image */}
          <TiltCard max={8} depth={14} radius="24px">
          <div className="relative aspect-square bg-surface rounded-3xl overflow-hidden mb-3 group">
            {/* Ghost word behind product like reference designs */}
            <span
              aria-hidden="true"
              className="ghost-word text-6xl sm:text-7xl"
              style={{ WebkitTextStroke: '1px rgba(26,22,20,0.07)' }}
            >
              {product.name.split(' ')[product.name.split(' ').length - 2] ?? product.brand}
            </span>
            <img
              ref={mainImg}
              src={images[selectedImage]}
              alt={product.name}
              width={720}
              height={720}
              className="product-float product-crisp relative z-10 w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-105"
            />
            {discount > 0 && (
              <span className="absolute top-4 right-4 bg-danger text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                -{discount}%
              </span>
            )}
            <button
              onClick={() => setZoomed(true)}
              className="absolute top-4 left-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-border bg-white/90 backdrop-blur-sm transition-all hover:border-brand hover:bg-brand hover:text-white"
              aria-label="تكبير الصورة"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          </TiltCard>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === i ? 'border-brand' : 'border-border hover:border-border-strong'
                  }`}
                  aria-label={`صورة ${i + 1}`}
                  aria-current={selectedImage === i}
                >
                  <img src={img} alt="" className="product-crisp h-full w-full object-cover" loading="lazy" decoding="async" width={64} height={64} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ────────────────────────────────────────── */}
        <div className={flying ? '' : 'pdp-enter pdp-enter-2'}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-sm text-muted mb-1">{product.brand}</p>
              <h1 className="text-xl sm:text-2xl font-bold text-ink leading-snug">
                {product.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { toggleFavorite(product.id); showToast(isFav ? 'أُزيل من المفضلة' : 'أُضيف للمفضلة'); }}
                aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all
                  ${isFav ? 'border-danger text-danger bg-danger-bg' : 'border-border text-muted hover:border-brand hover:text-brand'}`}
              >
                <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
              </button>
              <button
                className="w-10 h-10 rounded-full border border-border text-muted flex items-center justify-center hover:border-ink transition-colors"
                aria-label="مشاركة"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={15}
                  className={star <= Math.round(product.rating) ? 'text-brand fill-brand' : 'text-border'}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-ink">{product.rating}</span>
            <span className="text-sm text-muted">({product.reviewCount} تقييم)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-2xl font-bold text-ink">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <>
                <span className="text-base text-muted line-through">
                  {formatPrice(product.originalPrice)}
                </span>
                <span className="text-sm font-bold text-danger">وفّر {formatPrice(product.originalPrice - product.price)}</span>
              </>
            )}
          </div>

          {/* Stock */}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="flex items-center gap-2 mb-4 bg-warning-bg border border-warning/20 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <p className="text-sm text-warning font-medium">متبقي {product.stock} قطع فقط</p>
            </div>
          )}
          {isOut && (
            <div className="flex items-center gap-2 mb-4 bg-danger-bg border border-danger/20 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <p className="text-sm text-danger font-medium">نفذ المخزون</p>
            </div>
          )}

          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-medium text-ink mb-2.5">
                اللون: <span className="text-muted font-normal">{selectedColor}</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    title={color.name}
                    aria-label={color.name}
                    aria-pressed={selectedColor === color.name}
                    className={`relative w-9 h-9 rounded-full border-2 transition-all hover:scale-110 active:scale-95
                      ${selectedColor === color.name ? 'border-brand ring-2 ring-brand/30 ring-offset-1' : 'border-border'}
                    `}
                    style={{ backgroundColor: color.hex }}
                  >
                    {selectedColor === color.name && (
                      <Check
                        size={14}
                        className="absolute inset-0 m-auto"
                        style={{ color: color.hex === '#FAFAF8' || color.hex === '#F5F0E8' ? '#1A1614' : 'white' }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-5">
              <p className={`text-sm font-medium mb-2.5 ${sizeError ? 'text-danger' : 'text-ink'}`}>
                المقاس {sizeError && <span className="font-normal text-danger">(مطلوب)</span>}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => { setSelectedSize(size); setSizeError(false); }}
                    aria-pressed={selectedSize === size}
                    className={`min-w-[48px] h-10 px-3 border-2 rounded-xl text-sm font-medium transition-all
                      ${selectedSize === size
                        ? 'border-brand bg-brand text-white'
                        : sizeError
                          ? 'border-danger/50 text-ink hover:border-brand'
                          : 'border-border text-ink hover:border-brand'
                      }
                    `}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <p className="text-sm font-medium text-ink mb-2.5">الكمية</p>
            <div className="flex items-center border border-border rounded-xl overflow-hidden w-fit">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-11 h-11 flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors"
                aria-label="تقليل الكمية"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center text-base font-medium text-ink">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="w-11 h-11 flex items-center justify-center text-muted hover:text-ink hover:bg-surface transition-colors"
                aria-label="زيادة الكمية"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleAddToCart}
              disabled={isOut}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98]
                ${addedToCart
                  ? 'bg-success text-white'
                  : isOut
                    ? 'bg-surface text-muted cursor-not-allowed'
                    : 'bg-ink text-white hover:bg-brand'
                }
              `}
            >
              {addedToCart ? (
                <>
                  <Check size={18} />
                  أُضيف للسلة
                </>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  {isOut ? 'غير متوفر' : 'أضف للسلة'}
                </>
              )}
            </button>
          </div>

          {/* Trust strip */}
          <div className="grid grid-cols-3 gap-3 py-4 border-t border-border">
            {[
              { icon: Shield, text: 'ضمان الجودة' },
              { icon: Truck, text: 'توصيل سريع' },
              { icon: RotateCcw, text: 'إرجاع مجاني' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="text-center">
                <Icon size={22} strokeWidth={1.6} className="mx-auto text-brand mb-1.5" />
                <p className="text-[11px] text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center gap-1 border-b border-border mb-6">
          {detailTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
                ${activeTab === tab
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-ink'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'الوصف' && (
          <div className="prose prose-sm max-w-2xl text-ink-soft leading-relaxed">
            <p>{product.description}</p>
          </div>
        )}

        {activeTab === 'المواصفات' && product.specs && (
          <div className="max-w-2xl">
            <table className="w-full border-collapse">
              <tbody>
                {Object.entries(product.specs).map(([key, val]) => (
                  <tr key={key} className="border-b border-border">
                    <td className="py-3 pr-0 pl-8 text-sm font-medium text-ink w-40">{key}</td>
                    <td className="py-3 text-sm text-ink-soft">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'المواصفات' && !product.specs && (
          <p className="text-sm text-muted">لا توجد مواصفات إضافية.</p>
        )}

        {activeTab === 'التقييمات' && (
          <div className="max-w-2xl space-y-4">
            {/* Rating summary */}
            <div className="flex items-center gap-6 bg-surface rounded-xl p-4 mb-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-ink">{product.rating}</p>
                <div className="flex items-center gap-0.5 justify-center mt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} className={s <= Math.round(product.rating) ? 'text-brand fill-brand' : 'text-border'} />
                  ))}
                </div>
                <p className="text-xs text-muted mt-1">{product.reviewCount} تقييم</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const pct = star === 5 ? 65 : star === 4 ? 25 : star === 3 ? 7 : star === 2 ? 2 : 1;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-muted w-4">{star}</span>
                      <Star size={10} className="text-brand fill-brand shrink-0" />
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted w-6">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {mockReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl border border-border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm text-ink">{review.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={11} className={s <= review.rating ? 'text-brand fill-brand' : 'text-border'} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted">{review.date}</span>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Related products ────────────────────────────── */}
      {related.length > 0 && (
        <div className="pdp-enter pdp-enter-3 mt-12">
          <h2 className="text-xl font-bold text-ink mb-5">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
      {/* ── Lightbox ─────────────────────────────────────── */}
      {zoomed && (
        <div
          className="anim-fade-in fixed inset-0 z-[180] flex items-center justify-center bg-ink/92 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`صورة ${product.name}`}
          onClick={() => setZoomed(false)}
        >
          <button
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
          <img
            src={images[selectedImage]}
            alt={product.name}
            className="anim-pop-in max-h-[86dvh] w-auto max-w-full object-contain"
          />
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2" onClick={event => event.stopPropagation()}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`h-14 w-14 overflow-hidden rounded-xl border-2 transition-colors ${selectedImage === i ? 'border-brand' : 'border-white/30'}`}
                  aria-label={`صورة ${i + 1}`}
                >
                  <img src={img} alt="" className="product-crisp h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
