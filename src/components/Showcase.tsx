import { useEffect, useRef, useState } from 'react';
import Floating from './Floating';
import { startProductTransition } from '../services/motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Rotate3d } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCatalog } from '../context/CatalogContext';
import SafeImage from './SafeImage';
import { formatPrice } from '../services/storefrontApi';

type Show = {
  productId: string;
  word: string;
  panel: string;
  panelSoft: string;
  tag: string;
};

const shows: Show[] = [
  {
    productId: '13',
    word: 'أدون',
    panel: '#B3261E',
    panelSoft: '#FBE9E7',
    tag: 'إصدار 1997 الخاص',
  },
  {
    productId: '14',
    word: 'سيينا',
    panel: '#3F6142',
    panelSoft: '#E8F0E8',
    tag: 'جديد هذا الموسم',
  },
];

export default function Showcase() {
  const { products } = useCatalog();
  const { navigate } = useApp();
  const [index, setIndex] = useState(0);
  const imgWrap = useRef<HTMLDivElement>(null);
  const active = shows[index];
  const product = products.find((p) => p.name.includes(active.word)) || products[index % products.length];
  const discount = product?.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % shows.length), 5000);
    return () => clearInterval(id);
  }, []);

  if (!product) return null;
  const openProduct = () => {
    startProductTransition(imgWrap.current?.querySelector('img'));
    navigate('product-detail', { productId: product.id });
  };

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 mb-[calc(88px+var(--app-safe-bottom))] sm:mb-12 select-none"
      aria-label="عرض مميز"
    >
      <div
        key={index}
        className="relative overflow-hidden rounded-3xl transition-colors duration-700"
        style={{ backgroundColor: active.panelSoft }}
      >
        {/* Giant word behind */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-black text-[26vw] leading-none tracking-tighter text-transparent select-none pointer-events-none"
          style={{ WebkitTextStroke: `1.5px ${active.panel}22` }}
        >
          {active.word}
        </span>

        <div className="relative grid lg:grid-cols-2 items-center gap-6 px-4 py-6 sm:p-10 lg:p-14 lg:min-h-[420px]">
          {/* Chair */}
          <div className="relative order-2 lg:order-1 flex justify-center">
            <div
              className="absolute bottom-2 w-40 h-6 rounded-full blur-2xl animate-pop"
              style={{ backgroundColor: `${active.panel}33` }}
            />
            <Floating shadowColor={`${active.panel}55`} className="relative z-10">
              <div ref={imgWrap} className="cursor-pointer" onClick={openProduct}>
                <SafeImage
                  key={product.id}
                  src={product.image}
                  alt={product.name}
                  className={`product-float relative z-10 w-[min(64vw,240px)] aspect-square sm:w-72 lg:w-80 object-contain ${product.name.includes('أدون') ? 'studio-chair-cutout' : ''}`}
                  fallbackClassName="relative z-10 w-[min(64vw,240px)] aspect-square sm:w-72 rounded-2xl"
                />
              </div>
            </Floating>
          </div>

          {/* Details */}
          <div className="order-1 lg:order-2 flex min-w-0 flex-col items-start gap-4 text-right">
            <span
              className="inline-block text-xs font-bold rounded-full px-3 py-1 animate-pop"
              style={{ backgroundColor: active.panel, color: '#fff' }}
            >
              {active.tag}
            </span>
            <p className="text-[10px] tracking-[0.3em] font-bold" style={{ color: active.panel }}>
              {product.brand} · {active.productId === '13' ? 'LK24113' : 'SL25901'}
            </p>
            <h2 className="w-full text-[clamp(32px,9vw,40px)] leading-[1.1] sm:text-3xl lg:text-4xl font-black text-ink break-words">
              {product.name}
            </h2>
            <p className="w-full text-sm leading-relaxed text-ink-soft">{product.description}</p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={openProduct}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: active.panel }}
              >
                تسوق الآن <ArrowLeft size={18} />
              </button>
              <button onClick={() => setIndex((i) => (i - 1 + shows.length) % shows.length)} aria-label="السابق" className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-ink hover:border-ink transition-colors"><ChevronRight size={20} /></button>
              <button onClick={() => setIndex((i) => (i + 1) % shows.length)} aria-label="التالي" className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-ink hover:border-ink transition-colors"><ChevronLeft size={20} /></button>
            </div>

            {discount > 0 && (
              <div className="flex flex-wrap items-baseline gap-2 justify-end">
                <span className="text-3xl font-black text-ink">
                  {formatPrice(product.price)}
                </span>
                <span className="text-sm text-muted line-through">
                  {product.originalPrice != null && formatPrice(product.originalPrice)}
                </span>
                <span
                  className="text-xs font-bold rounded-full px-2 py-0.5"
                  style={{ backgroundColor: `${active.panel}1A`, color: active.panel }}
                >
                  -{discount}%
                </span>
              </div>
            )}

            {/* Color dots + 360 hint like Modu reference */}
            <div className="flex items-center justify-end gap-4">
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <Rotate3d size={14} />
                عرض 360°
              </span>
              <div className="flex items-center gap-2">
              {product.colors?.map((c) => (
                <span
                  key={c.name}
                  title={c.name}
                  className="w-5 h-5 rounded-full border border-border-strong transition-transform hover:scale-125"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              </div>
            </div>

            {/* Specs rows like MABUDALA reference */}
            {product.specs && (
              <div className="w-full divide-y divide-border/60 border-y border-border/60 max-w-sm">
                {Object.entries(product.specs).slice(0, 4).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-[11px] text-muted">{key}</span>
                    <span className="text-xs font-medium text-ink-soft">{val}</span>
                  </div>
                ))}
              </div>
            )}



            {/* Progress dots */}
            <div className="flex items-center justify-end gap-2">
              {shows.map((s, i) => (
                <button
                  key={s.productId}
                  onClick={() => setIndex(i)}
                  aria-label={`عرض ${i + 1}`}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === index ? 24 : 8,
                    backgroundColor: i === index ? active.panel : '#ccc9c2',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
